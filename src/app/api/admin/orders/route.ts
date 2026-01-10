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

        // Tüm siparişleri getir (admin için)
        const orders = await prisma.order.findMany({
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
                _count: {
                    select: { items: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        console.log('Found orders:', orders.length)
        return NextResponse.json(orders)
    } catch (error) {
        console.error('Error fetching admin orders:', error)
        return NextResponse.json(
            { error: 'Siparişler getirilemedi' },
            { status: 500 }
        )
    }
} 