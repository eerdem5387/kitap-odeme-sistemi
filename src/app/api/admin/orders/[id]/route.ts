import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { emailService } from '@/lib/email'

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

        console.log('Order found:', order.id)
        return NextResponse.json(order)
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

        const { status, notes } = body

        // Mevcut siparişi al (e-posta göndermek için)
        const currentOrder = await prisma.order.findUnique({
            where: { id: resolvedParams.id },
            include: {
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

        // Siparişi güncelle
        const updatedOrder = await prisma.order.update({
            where: { id: resolvedParams.id },
            data: {
                status: status,
                notes: notes
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                items: {
                    include: {
                        product: {
                            include: {
                                category: {
                                    select: { id: true, name: true }
                                }
                            }
                        },
                        variation: {
                            include: {
                                attributes: {
                                    include: {
                                        attributeValue: {
                                            include: {
                                                attribute: true
                                            }
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

        console.log('Order updated:', updatedOrder.id)

        // E-posta bildirimi gönder (durum değiştiyse)
        if (currentOrder.status !== status) {
            try {
                await emailService.sendOrderStatusUpdate(updatedOrder, currentOrder.user.email, status)
            } catch (emailError) {
                console.error('E-posta gönderilirken hata:', emailError)
                // E-posta hatası sipariş güncellemeyi etkilemesin
            }
        }

        return NextResponse.json(updatedOrder)
    } catch (error) {
        console.error('Error updating admin order:', error)
        return NextResponse.json(
            { error: 'Sipariş güncellenemedi' },
            { status: 500 }
        )
    }
} 