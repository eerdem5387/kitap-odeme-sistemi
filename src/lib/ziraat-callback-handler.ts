import { ziraatPaymentService } from '@/lib/ziraat-payment'
import { prisma } from '@/lib/prisma'
import { emailService } from '@/lib/email'
import { extractFailureReason, logPaymentFailure } from '@/lib/payment-failure-log'

function pick(data: Record<string, any>, keys: string[]): string {
    for (const key of keys) {
        const value = data[key]
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            return String(value).trim()
        }
    }
    return ''
}

async function ensurePaymentRecord(params: {
    orderId: string
    amount: number
    status: 'COMPLETED' | 'FAILED'
    transactionId?: string | null
    gatewayResponse: string
}) {
    const { orderId, amount, status, transactionId, gatewayResponse } = params

    if (transactionId) {
        const existingByTxn = await prisma.payment.findUnique({
            where: { transactionId }
        })
        if (existingByTxn) {
            if (existingByTxn.status !== status) {
                await prisma.payment.update({
                    where: { id: existingByTxn.id },
                    data: { status, gatewayResponse, amount }
                })
            }
            return existingByTxn.id
        }
    }

    const existingCompleted = status === 'COMPLETED'
        ? await prisma.payment.findFirst({
            where: { orderId, status: 'COMPLETED' }
        })
        : null

    if (existingCompleted) {
        if (transactionId && !existingCompleted.transactionId) {
            await prisma.payment.update({
                where: { id: existingCompleted.id },
                data: { transactionId, gatewayResponse }
            })
        }
        return existingCompleted.id
    }

    try {
        const created = await prisma.payment.create({
            data: {
                orderId,
                amount,
                method: 'CREDIT_CARD',
                status,
                transactionId: transactionId || null,
                gatewayResponse
            }
        })
        return created.id
    } catch (error: any) {
        if (transactionId && (error?.code === 'P2002' || String(error?.message || '').includes('Unique'))) {
            const again = await prisma.payment.findUnique({ where: { transactionId } })
            return again?.id || null
        }
        throw error
    }
}

export async function processZiraatCallback(
    data: Record<string, any>,
    baseUrl: string
): Promise<{ success: boolean; redirectUrl: string; orderId?: string }> {
    const result = await ziraatPaymentService.verifyCallback(data)
    const orderId = pick(data, ['oid', 'OID', 'OrderId', 'orderId'])
    const authCode = pick(data, ['AuthCode', 'authCode', 'AUTHCODE'])
    const transId = pick(data, ['TransId', 'transId', 'TRANSID', 'HostRefNum', 'hostRefNum'])
    const amount = Number(pick(data, ['amount', 'Amount', 'AMOUNT']) || 0)

    if (!orderId) {
        return {
            success: false,
            redirectUrl: `${baseUrl}/payment/fail?error=SiparisNoBulunamadi`
        }
    }

    const existingOrder = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
            id: true,
            paymentStatus: true,
            status: true,
            finalAmount: true,
            user: { select: { email: true } }
        }
    })

    if (!existingOrder) {
        return {
            success: false,
            orderId,
            redirectUrl: `${baseUrl}/payment/fail?error=SiparisBulunamadi`
        }
    }

    if (existingOrder.paymentStatus === 'COMPLETED') {
        await ensurePaymentRecord({
            orderId,
            amount: amount || Number(existingOrder.finalAmount),
            status: 'COMPLETED',
            transactionId: transId || null,
            gatewayResponse: JSON.stringify({
                ...data,
                verify: result,
                note: 'Idempotent callback; order already COMPLETED'
            })
        }).catch(() => null)

        return {
            success: true,
            orderId,
            redirectUrl: `${baseUrl}/payment/success?orderId=${orderId}`
        }
    }

    if (result.success) {
        const orderAmount = Number(existingOrder.finalAmount)
        const amountMismatch =
            amount > 0 &&
            Number.isFinite(orderAmount) &&
            Math.abs(amount - orderAmount) > 0.05

        const notes = [
            'Ziraat POS Onaylandı.',
            authCode ? `AuthCode: ${authCode}` : null,
            transId ? `TransId: ${transId}` : null,
            result.hashValid === false ? 'UYARI: Hash doğrulanamadı fakat banka onayı alındı.' : null,
            amountMismatch ? `UYARI: Tutar farkı (banka=${amount}, siparis=${orderAmount})` : null
        ].filter(Boolean).join(' ')

        await prisma.order.update({
            where: { id: orderId },
            data: {
                paymentStatus: 'COMPLETED',
                status: 'CONFIRMED',
                notes
            }
        })

        await ensurePaymentRecord({
            orderId,
            amount: amount || orderAmount,
            status: 'COMPLETED',
            transactionId: transId || `TX-${orderId}-${Date.now()}`,
            gatewayResponse: JSON.stringify({
                ...data,
                verify: result
            })
        })

        emailService.sendOrderStatusUpdate(
            { id: orderId, user: existingOrder.user } as any,
            existingOrder.user.email,
            'CONFIRMED'
        ).catch((e) => {
            console.error('Email send error:', e)
        })

        return {
            success: true,
            orderId,
            redirectUrl: `${baseUrl}/payment/success?orderId=${orderId}`
        }
    }

    const extracted = extractFailureReason({
        ...data,
        error: result.error
    })
    const failureReason = extracted.reason || result.error || 'Ödeme işlemi başarısız oldu'

    await prisma.order.update({
        where: { id: orderId },
        data: {
            paymentStatus: 'FAILED',
            notes: `Ziraat POS Hatası: ${failureReason}`
        }
    })

    try {
        await ensurePaymentRecord({
            orderId,
            amount: amount || Number(existingOrder.finalAmount),
            status: 'FAILED',
            transactionId: transId || null,
            gatewayResponse: JSON.stringify({
                ...data,
                error: result.error,
                failureReason,
                verify: result
            })
        })
    } catch {}

    await logPaymentFailure({
        orderId,
        reason: failureReason,
        errorCode: extracted.errorCode,
        source: 'ziraat_callback',
        rawPayload: {
            ...data,
            verifyError: result.error,
            verify: result
        }
    })

    return {
        success: false,
        orderId,
        redirectUrl: `${baseUrl}/payment/fail?orderId=${orderId}&error=${encodeURIComponent(failureReason)}`
    }
}

export function parseCallbackBody(input: FormData | URLSearchParams): Record<string, string> {
    const data: Record<string, string> = {}
    input.forEach((value, key) => {
        data[key] = value.toString()
    })
    return data
}
