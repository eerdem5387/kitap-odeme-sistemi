import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { resolveOrderFailureReason } from '@/lib/payment-failure-log'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        console.log('=== ADMIN ORDERS LIST API CALLED ===')

        const authHeader = request.headers.get('authorization')

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Yetkilendirme gerekli' },
                { status: 401 }
            )
        }

        const token = authHeader.substring(7)
        const decodedToken = verifyToken(token)

        if (!decodedToken) {
            return NextResponse.json(
                { error: 'Geçersiz token' },
                { status: 401 }
            )
        }

        if (decodedToken.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Admin yetkisi gerekli' },
                { status: 403 }
            )
        }

        const orders = await prisma.order.findMany({
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
                payments: {
                    select: {
                        id: true,
                        status: true,
                        gatewayResponse: true,
                        createdAt: true
                    },
                    orderBy: { createdAt: 'desc' }
                },
                shippingAddress: true,
                billingAddress: true,
                _count: { select: { items: true } }
            },
            orderBy: { createdAt: 'desc' }
        })

        const orderIds = orders.map((o) => o.id)
        const failureLogs = orderIds.length > 0
            ? await prisma.$queryRawUnsafe<Array<{
                id: string
                orderId: string
                reason: string
                errorCode: string | null
                source: string
                createdAt: Date
            }>>(
                `SELECT id, "orderId", reason, "errorCode", source, "createdAt"
                 FROM payment_failure_logs
                 WHERE "orderId" = ANY($1::text[])
                 ORDER BY "createdAt" DESC`,
                orderIds
            )
            : []

        const logsByOrder = new Map<string, typeof failureLogs>()
        for (const log of failureLogs) {
            const list = logsByOrder.get(log.orderId) || []
            list.push(log)
            logsByOrder.set(log.orderId, list)
        }

        const serialized = orders.map(o => {
            const logs = logsByOrder.get(o.id) || []
            const failureReason = resolveOrderFailureReason({
                paymentStatus: o.paymentStatus,
                notes: o.notes,
                payments: o.payments,
                failureLogs: logs
            })

            return {
                ...o,
                totalAmount: Number(o.totalAmount),
                shippingFee: Number(o.shippingFee),
                taxAmount: Number(o.taxAmount),
                discountAmount: Number(o.discountAmount),
                finalAmount: Number(o.finalAmount),
                createdAt: o.createdAt.toISOString(),
                updatedAt: o.updatedAt.toISOString(),
                failureReason,
                failureLogs: logs.map((log) => ({
                    id: log.id,
                    reason: log.reason,
                    errorCode: log.errorCode,
                    source: log.source,
                    createdAt: new Date(log.createdAt).toISOString()
                })),
                items: o.items.map(item => ({
                    ...item,
                    unitPrice: Number(item.unitPrice),
                    totalPrice: Number(item.totalPrice)
                }))
            }
        })

        return NextResponse.json(serialized)
    } catch (error) {
        console.error('Error fetching admin orders:', error)
        const message = error instanceof Error && error.message?.includes('column')
            ? 'Siparişler getirilemedi. Veritabanı güncellemesi gerekebilir (migration çalıştırın).'
            : 'Siparişler getirilemedi'
        return NextResponse.json(
            { error: message },
            { status: 500 }
        )
    }
}
