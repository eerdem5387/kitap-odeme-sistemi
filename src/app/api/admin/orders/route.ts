import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        console.log('=== ADMIN ORDERS LIST API CALLED ===')

        // Authorization header'dan token'ı al
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

        // Sadece mevcut DB kolonlarını seç (guestCustomerEmail/guestCustomerName migration sonrası eklenebilir)
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
                shippingAddress: true,
                billingAddress: true,
                _count: { select: { items: true } }
            },
            orderBy: { createdAt: 'desc' }
        })

        // Prisma Decimal ve Date alanlarını JSON uyumlu forma çevir
        const serialized = orders.map(o => ({
            ...o,
            totalAmount: Number(o.totalAmount),
            shippingFee: Number(o.shippingFee),
            taxAmount: Number(o.taxAmount),
            discountAmount: Number(o.discountAmount),
            finalAmount: Number(o.finalAmount),
            createdAt: o.createdAt.toISOString(),
            updatedAt: o.updatedAt.toISOString(),
            items: o.items.map(item => ({
                ...item,
                unitPrice: Number(item.unitPrice),
                totalPrice: Number(item.totalPrice)
            }))
        }))

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