import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization')
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 })
        }
        const decoded = verifyToken(authHeader.slice(7))
        if (!decoded || decoded.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Admin yetkisi gerekli' }, { status: 403 })
        }

        // order için sadece gerekli alanlar; yeni kolonlar (guestCustomer*) seçilmez, migration yoksa 500 önlenir
        const payments = await prisma.payment.findMany({
            include: {
                order: {
                    select: {
                        orderNumber: true,
                        user: {
                            select: { name: true, email: true }
                        },
                        items: {
                            include: {
                                product: { select: { name: true } },
                                variation: {
                                    include: {
                                        attributes: {
                                            include: {
                                                attributeValue: {
                                                    include: {
                                                        attribute: { select: { name: true } }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        // API response formatını düzenle
        const formattedPayments = payments.map(payment => ({
            id: payment.id,
            orderId: payment.orderId,
            amount: Number(payment.amount),
            method: payment.method,
            status: payment.status,
            createdAt: payment.createdAt.toISOString(),
            order: {
                orderNumber: payment.order.orderNumber,
                user: payment.order.user,
                items: payment.order.items.map(item => ({
                    id: item.id,
                    product: {
                        name: item.product.name
                    },
                    variation: item.variation ? {
                        attributes: item.variation.attributes.map(attr => ({
                            attributeValue: {
                                value: attr.attributeValue.value,
                                attribute: {
                                    name: attr.attributeValue.attribute.name
                                }
                            }
                        }))
                    } : null
                }))
            }
        }))

        return NextResponse.json(formattedPayments)
    } catch (error) {
        console.error('Error fetching payments:', error)
        const message = error instanceof Error && error.message?.includes('column')
            ? 'Ödemeler getirilemedi. Veritabanı güncellemesi gerekebilir (migration çalıştırın).'
            : 'Ödemeler getirilemedi'
        return NextResponse.json(
            { error: message },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { orderId, amount, method, status, transactionId } = body

        if (!orderId || !amount || !method || !status) {
            return NextResponse.json(
                { error: 'Sipariş ID, tutar, yöntem ve durum gereklidir' },
                { status: 400 }
            )
        }

        const payment = await prisma.payment.create({
            data: {
                orderId,
                amount,
                method,
                status,
                transactionId
            },
            include: {
                order: {
                    include: {
                        user: {
                            select: { name: true, email: true }
                        }
                    }
                }
            }
        })

        return NextResponse.json(payment, { status: 201 })
    } catch (error) {
        console.error('Error creating payment:', error)
        return NextResponse.json(
            { error: 'Ödeme oluşturulamadı' },
            { status: 500 }
        )
    }
} 