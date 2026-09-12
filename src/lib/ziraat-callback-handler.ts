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

export type ZiraatCallbackResult = {
    success: boolean
    /** NestPay, gövde tam olarak "Approved" olana kadar 5 dakikada bir yeniden dener. Yalnızca kalıcı yazımdan sonra true. */
    acknowledge: boolean
    declined: boolean
    redirectUrl: string
    orderId?: string
}

export function nestpayAckResponse() {
    return new Response('Approved', {
        status: 200,
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store'
        }
    })
}

export function nestpayRetryResponse() {
    return new Response('Retry', {
        status: 200,
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store'
        }
    })
}

export async function readCallbackData(request: Request): Promise<Record<string, string>> {
    const contentType = (request.headers.get('content-type') || '').toLowerCase()

    try {
        const form = await request.clone().formData()
        const parsed = parseCallbackBody(form)
        if (Object.keys(parsed).length > 0) return parsed
    } catch {
        // multipart değilse veya gövde form değilse aşağıda metin olarak okunur
    }

    let raw = ''
    try {
        raw = await request.text()
    } catch {
        raw = ''
    }

    const trimmed = raw.trim()
    let data: Record<string, string> = {}
    if (!trimmed) {
        data = {}
    } else if (trimmed.startsWith('{') || contentType.includes('json')) {
        try {
            const json = JSON.parse(trimmed)
            if (json && typeof json === 'object' && !Array.isArray(json)) {
                for (const [key, value] of Object.entries(json)) {
                    if (value !== undefined && value !== null) data[key] = String(value)
                }
            }
        } catch {
            data = parseCallbackBody(new URLSearchParams(trimmed))
        }
    } else {
        data = parseCallbackBody(new URLSearchParams(trimmed))
    }

    try {
        const url = new URL(request.url)
        url.searchParams.forEach((value, key) => {
            if (!data[key]) data[key] = value
        })
    } catch {
        // url okunamazsa yalnızca gövde kullanılır
    }

    return data
}

export async function processZiraatCallback(
    data: Record<string, any>,
    baseUrl: string
): Promise<ZiraatCallbackResult> {
    const result = await ziraatPaymentService.verifyCallback(data)
    const orderRef = pick(data, ['oid', 'OID', 'ReturnOid', 'returnOid', 'OrderId', 'orderId'])
    const authCode = pick(data, ['AuthCode', 'authCode', 'AUTHCODE'])
    const transId = pick(data, ['TransId', 'transId', 'TRANSID', 'HostRefNum', 'hostRefNum'])
    const amountRaw = pick(data, ['amount', 'Amount', 'AMOUNT']).replace(',', '.')
    const amount = Number(amountRaw || 0)

    if (!orderRef) {
        return {
            success: false,
            acknowledge: false,
            declined: false,
            redirectUrl: `${baseUrl}/payment/fail?error=SiparisNoBulunamadi`
        }
    }

    const existingOrder = await prisma.order.findFirst({
        where: {
            OR: [{ id: orderRef }, { orderNumber: orderRef }]
        },
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
            acknowledge: false,
            declined: false,
            orderId: orderRef,
            redirectUrl: `${baseUrl}/payment/fail?error=SiparisBulunamadi`
        }
    }

    const orderId = existingOrder.id

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
            acknowledge: true,
            declined: false,
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
            acknowledge: true,
            declined: false,
            orderId,
            redirectUrl: `${baseUrl}/payment/success?orderId=${orderId}`
        }
    }

    // Eksik bildirim başarı değildir, başarısızlık da değildir. Siparişi FAILED yapma;
    // NestPay aynı sonucu yaklaşık 5 dakikada bir yeniden gönderir.
    if (!result.bankDeclined) {
        console.warn('Ziraat callback kesinleşmedi, sipariş bekletiliyor', {
            orderId,
            response: pick(data, ['Response', 'response']),
            procReturnCode: pick(data, ['ProcReturnCode', 'procReturnCode']),
            mdStatus: pick(data, ['mdStatus', 'MdStatus'])
        })
        return {
            success: false,
            acknowledge: false,
            declined: false,
            orderId,
            redirectUrl: `${baseUrl}/payment/success?orderId=${orderId}&pending=1`
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
        acknowledge: true,
        declined: true,
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
