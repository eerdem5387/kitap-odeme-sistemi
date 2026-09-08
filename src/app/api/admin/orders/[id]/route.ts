import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { emailService } from '@/lib/email'
import { resolveOrderFailureReason } from '@/lib/payment-failure-log'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        console.log('=== ADMIN ORDER DETAIL API CALLED ===')

        const resolvedParams = await params
        const authHeader = request.headers.get('authorization')
        console.log('Auth header:', authHeader)

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('Auth error: Invalid authorization header')
            return NextResponse.json(
                { error: 'Yetkilendirme gerekli' },
                { status: 401 }
            )
        }

        const token = authHeader.substring(7)
        console.log('Token:', token)

        // JWT token'ı doğrula
        const decodedToken = verifyToken(token)
        console.log('Decoded token:', decodedToken)

        if (!decodedToken) {
            console.log('Token verification failed')
            return NextResponse.json(
                { error: 'Geçersiz token' },
                { status: 401 }
            )
        }

        // Admin kontrolü
        if (decodedToken.role !== 'ADMIN') {
            console.log('Access denied: Not admin')
            return NextResponse.json(
                { error: 'Admin yetkisi gerekli' },
                { status: 403 }
            )
        }

        // Siparişi getir (guestCustomer* kolonları seçilmez; migration yoksa 500 önlenir)
        const order = await prisma.order.findUnique({
            where: { id: resolvedParams.id },
            select: {
                id: true,
                orderNumber: true,
                userId: true,
                status: true,
                totalAmount: true,
                shippingFee: true,
                taxAmount: true,
                discountAmount: true,
                finalAmount: true,
                paymentMethod: true,
                paymentStatus: true,
                shippingAddressId: true,
                billingAddressId: true,
                notes: true,
                studentName: true,
                createdAt: true,
                updatedAt: true,
                user: {
                    select: { id: true, name: true, email: true }
                },
                items: {
                    include: {
                        product: {
                            include: {
                                category: { select: { id: true, name: true } }
                            }
                        },
                        variation: {
                            include: {
                                attributes: {
                                    include: {
                                        attributeValue: {
                                            include: { attribute: true }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                shippingAddress: true,
                billingAddress: true,
                payments: {
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        amount: true,
                        method: true,
                        status: true,
                        transactionId: true,
                        gatewayResponse: true,
                        createdAt: true
                    }
                }
            }
        })

        if (!order) {
            console.log('Order not found')
            return NextResponse.json(
                { error: 'Sipariş bulunamadı' },
                { status: 404 }
            )
        }

        const failureLogs = await prisma.$queryRawUnsafe<Array<{
            id: string
            orderId: string
            reason: string
            errorCode: string | null
            source: string
            rawPayload: string | null
            createdAt: Date
        }>>(
            `SELECT id, "orderId", reason, "errorCode", source, "rawPayload", "createdAt"
             FROM payment_failure_logs
             WHERE "orderId" = $1
             ORDER BY "createdAt" DESC`,
            order.id
        )

        const failureReason = resolveOrderFailureReason({
            paymentStatus: order.paymentStatus,
            notes: order.notes,
            payments: order.payments,
            failureLogs
        })

        console.log('Order found:', order.id)
        return NextResponse.json({
            ...order,
            totalAmount: Number(order.totalAmount),
            shippingFee: Number(order.shippingFee),
            taxAmount: Number(order.taxAmount),
            discountAmount: Number(order.discountAmount),
            finalAmount: Number(order.finalAmount),
            failureReason,
            failureLogs: failureLogs.map((log) => ({
                id: log.id,
                reason: log.reason,
                errorCode: log.errorCode,
                source: log.source,
                createdAt: new Date(log.createdAt).toISOString()
            })),
            payments: order.payments.map((p) => ({
                ...p,
                amount: Number(p.amount)
            })),
            items: order.items.map((item) => ({
                ...item,
                unitPrice: Number(item.unitPrice),
                totalPrice: Number(item.totalPrice)
            }))
        })
    } catch (error) {
        console.error('Error fetching admin order detail:', error)
        return NextResponse.json(
            { error: 'Sipariş getirilemedi' },
            { status: 500 }
        )
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        console.log('=== ADMIN ORDER UPDATE API CALLED ===')

        const resolvedParams = await params
        const authHeader = request.headers.get('authorization')
        console.log('Auth header:', authHeader)

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('Auth error: Invalid authorization header')
            return NextResponse.json(
                { error: 'Yetkilendirme gerekli' },
                { status: 401 }
            )
        }

        const token = authHeader.substring(7)
        console.log('Token:', token)

        // JWT token'ı doğrula
        const decodedToken = verifyToken(token)
        console.log('Decoded token:', decodedToken)

        if (!decodedToken) {
            console.log('Token verification failed')
            return NextResponse.json(
                { error: 'Geçersiz token' },
                { status: 401 }
            )
        }

        // Admin kontrolü
        if (decodedToken.role !== 'ADMIN') {
            console.log('Access denied: Not admin')
            return NextResponse.json(
                { error: 'Admin yetkisi gerekli' },
                { status: 403 }
            )
        }

        const body = await request.json()
        console.log('Update request body:', body)

        const { status, notes, paymentStatus, markPaid, transId, authCode } = body

        // Mevcut siparişi al (e-posta göndermek için)
        const currentOrder = await prisma.order.findUnique({
            where: { id: resolvedParams.id },
            select: {
                id: true,
                status: true,
                paymentStatus: true,
                notes: true,
                finalAmount: true,
                user: {
                    select: { name: true, email: true }
                }
            }
        })

        if (!currentOrder) {
            return NextResponse.json(
                { error: 'Sipariş bulunamadı' },
                { status: 404 }
            )
        }

        const shouldMarkPaid = markPaid === true || paymentStatus === 'COMPLETED'
        const updateData: Record<string, any> = {}
        if (typeof status === 'string' && status) updateData.status = status
        if (typeof notes === 'string') updateData.notes = notes

        if (shouldMarkPaid && currentOrder.paymentStatus !== 'COMPLETED') {
            updateData.paymentStatus = 'COMPLETED'
            if (!updateData.status || updateData.status === 'PENDING') {
                updateData.status = 'CONFIRMED'
            }
            const reconNote = [
                'Manuel mutabakat (admin).',
                authCode ? `AuthCode: ${authCode}` : null,
                transId ? `TransId: ${transId}` : null,
                'Ziraat panelinde doğrulandı.'
            ].filter(Boolean).join(' ')
            updateData.notes = notes
                ? `${notes} | ${reconNote}`
                : (currentOrder.notes ? `${currentOrder.notes} | ${reconNote}` : reconNote)
        }

        // Siparişi güncelle
        const updatedOrder = await prisma.order.update({
            where: { id: resolvedParams.id },
            data: updateData,
            select: {
                id: true,
                orderNumber: true,
                status: true,
                paymentStatus: true,
                totalAmount: true,
                shippingFee: true,
                taxAmount: true,
                discountAmount: true,
                finalAmount: true,
                notes: true,
                studentName: true,
                createdAt: true,
                updatedAt: true,
                user: {
                    select: { id: true, name: true, email: true }
                },
                items: {
                    include: {
                        product: {
                            include: {
                                category: { select: { id: true, name: true } }
                            }
                        },
                        variation: {
                            include: {
                                attributes: {
                                    include: {
                                        attributeValue: {
                                            include: { attribute: true }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                shippingAddress: true,
                billingAddress: true,
                payments: {
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        amount: true,
                        method: true,
                        status: true,
                        transactionId: true,
                        gatewayResponse: true,
                        createdAt: true
                    }
                }
            }
        })

        if (shouldMarkPaid && currentOrder.paymentStatus !== 'COMPLETED') {
            const txn = String(transId || `MANUAL-${updatedOrder.id.slice(-8)}-${Date.now()}`)
            const hasCompletedPayment = updatedOrder.payments.some((p) => p.status === 'COMPLETED')
            if (!hasCompletedPayment) {
                try {
                    await prisma.payment.create({
                        data: {
                            orderId: updatedOrder.id,
                            amount: Number(updatedOrder.finalAmount),
                            method: 'CREDIT_CARD',
                            status: 'COMPLETED',
                            transactionId: txn,
                            gatewayResponse: JSON.stringify({
                                source: 'admin_mark_paid',
                                authCode: authCode || null,
                                transId: transId || null
                            })
                        }
                    })
                } catch (e) {
                    console.warn('Payment create on markPaid failed:', e)
                }
            }
        }

        console.log('Order updated:', updatedOrder.id)

        const finalStatus = updatedOrder.status
        if (currentOrder.status !== finalStatus) {
            try {
                await emailService.sendOrderStatusUpdate(
                    updatedOrder as any,
                    currentOrder.user.email,
                    finalStatus
                )
            } catch (emailError) {
                console.error('E-posta gönderilirken hata:', emailError)
            }
        }

        // Payment eklendiyse güncel listeyi dön
        const refreshed = await prisma.order.findUnique({
            where: { id: updatedOrder.id },
            select: {
                id: true,
                orderNumber: true,
                status: true,
                paymentStatus: true,
                totalAmount: true,
                shippingFee: true,
                taxAmount: true,
                discountAmount: true,
                finalAmount: true,
                notes: true,
                studentName: true,
                createdAt: true,
                updatedAt: true,
                user: { select: { id: true, name: true, email: true } },
                items: {
                    include: {
                        product: {
                            include: { category: { select: { id: true, name: true } } }
                        },
                        variation: {
                            include: {
                                attributes: {
                                    include: {
                                        attributeValue: { include: { attribute: true } }
                                    }
                                }
                            }
                        }
                    }
                },
                shippingAddress: true,
                billingAddress: true,
                payments: {
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        amount: true,
                        method: true,
                        status: true,
                        transactionId: true,
                        gatewayResponse: true,
                        createdAt: true
                    }
                }
            }
        })

        return NextResponse.json({
            ...refreshed,
            totalAmount: Number(refreshed!.totalAmount),
            shippingFee: Number(refreshed!.shippingFee),
            taxAmount: Number(refreshed!.taxAmount),
            discountAmount: Number(refreshed!.discountAmount),
            finalAmount: Number(refreshed!.finalAmount),
            payments: refreshed!.payments.map((p) => ({ ...p, amount: Number(p.amount) })),
            items: refreshed!.items.map((item) => ({
                ...item,
                unitPrice: Number((item as any).unitPrice),
                totalPrice: Number((item as any).totalPrice)
            }))
        })
    } catch (error) {
        console.error('Error updating admin order:', error)
        return NextResponse.json(
            { error: 'Sipariş güncellenemedi' },
            { status: 500 }
        )
    }
} 