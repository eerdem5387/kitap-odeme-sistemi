import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const payments = await prisma.payment.findMany({
            include: {
                order: {
                    include: {
                        user: {
                            select: { name: true, email: true }
                        },
                        items: {
                            include: {
                                product: {
                                    select: { name: true }
                                },
                                variation: {
                                    include: {
                                        attributes: {
                                            include: {
                                                attributeValue: {
                                                    include: {
                                                        attribute: {
                                                            select: { name: true }
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
        return NextResponse.json(
            { error: 'Ödemeler getirilemedi' },
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