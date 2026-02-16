import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

function serializeOrder(order: {
    totalAmount: unknown
    shippingFee: unknown
    taxAmount: unknown
    discountAmount: unknown
    finalAmount: unknown
    createdAt: Date
    updatedAt: Date
    items: Array<{ unitPrice: unknown; totalPrice: unknown; [k: string]: unknown }>
    [k: string]: unknown
}) {
    return {
        ...order,
        totalAmount: Number(order.totalAmount),
        shippingFee: Number(order.shippingFee),
        taxAmount: Number(order.taxAmount),
        discountAmount: Number(order.discountAmount),
        finalAmount: Number(order.finalAmount),
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        items: order.items.map((item: { unitPrice: unknown; totalPrice: unknown; [k: string]: unknown }) => ({
            ...item,
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.totalPrice)
        }))
    }
}

const orderUpdateSchema = z.object({
    status: z.enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional(),
    paymentStatus: z.enum(['PENDING', 'COMPLETED', 'FAILED']).optional(),
    notes: z.string().optional()
})

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params
        const token = request.headers.get('authorization')?.replace('Bearer ', '')

        const orderSelect = {
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
            user: { select: { name: true, email: true } },
            items: {
                include: {
                    product: {
                        include: { category: { select: { id: true, name: true } } }
                    },
                    variation: {
                        include: { attributes: { include: { attributeValue: true } } }
                    }
                }
            },
            shippingAddress: true,
            billingAddress: true,
            payments: { orderBy: { createdAt: 'desc' } }
        } as const

        if (token) {
            const payload = await verifyToken(token)
            if (!payload) {
                return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 })
            }

            const order = await prisma.order.findUnique({
                where: { id: resolvedParams.id },
                select: orderSelect
            })

            if (!order) return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 })
            if (payload.role !== 'ADMIN' && order.userId !== payload.userId) {
                return NextResponse.json({ error: 'Bu siparişe erişim izniniz yok' }, { status: 403 })
            }
            return NextResponse.json(serializeOrder(order))
        }

        // Guest access: orderId ile erişim (guest query param opsiyonel)
        const order = await prisma.order.findUnique({
            where: { id: resolvedParams.id },
            select: orderSelect
        })
        if (!order) return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 })
        return NextResponse.json(serializeOrder(order))
    } catch (error) {
        console.error('Error fetching order:', error)
        return NextResponse.json({ error: 'Sipariş getirilirken bir hata oluştu' }, { status: 500 })
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params
        const token = request.headers.get('authorization')?.replace('Bearer ', '')
        if (!token) {
            return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 })
        }

        const payload = await verifyToken(token)
        if (!payload) {
            return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 })
        }

        // Sadece admin sipariş güncelleyebilir
        if (payload.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
        }

        const body = await request.json()
        const updateData = orderUpdateSchema.parse(body)

        const order = await prisma.order.update({
            where: { id: resolvedParams.id },
            data: updateData,
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
                user: { select: { name: true, email: true } },
                items: {
                    include: {
                        product: {
                            select: { name: true, images: true, sku: true },
                            include: {
                                category: { select: { id: true, name: true } }
                            }
                        }
                    }
                },
                shippingAddress: true,
                billingAddress: true,
                payments: { orderBy: { createdAt: 'desc' } }
            }
        })

        return NextResponse.json(serializeOrder(order))
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Geçersiz veri formatı', details: error.issues }, { status: 400 })
        }
        console.error('Error updating order:', error)
        return NextResponse.json({ error: 'Sipariş güncellenirken bir hata oluştu' }, { status: 500 })
    }
} 