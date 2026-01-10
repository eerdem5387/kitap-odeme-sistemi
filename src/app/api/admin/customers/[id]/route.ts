import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params
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

        // Admin kontrolü
        if (decodedToken.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Admin yetkisi gerekli' },
                { status: 403 }
            )
        }

        // Müşteriyi getir
        const customer = await prisma.user.findUnique({
            where: { id: resolvedParams.id },
            include: {
                addresses: {
                    orderBy: { isDefault: 'desc' }
                },
                orders: {
                    include: {
                        items: {
                            include: {
                                product: {
                                    select: {
                                        id: true,
                                        name: true,
                                        images: true
                                    }
                                },
                                variation: {
                                    include: {
                                        attributes: {
                                            include: {
                                                attributeValue: {
                                                    include: {
                                                        attribute: {
                                                            select: {
                                                                name: true
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
                        shippingAddress: {
                            select: {
                                firstName: true,
                                lastName: true,
                                city: true,
                                district: true
                            }
                        },
                        billingAddress: {
                            select: {
                                firstName: true,
                                lastName: true,
                                city: true,
                                district: true
                            }
                        },
                        payments: {
                            select: {
                                id: true,
                                amount: true,
                                method: true,
                                status: true,
                                createdAt: true
                            },
                            orderBy: { createdAt: 'desc' }
                        },
                        _count: {
                            select: { items: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                _count: {
                    select: {
                        orders: true,
                        addresses: true
                    }
                }
            }
        })

        if (!customer) {
            return NextResponse.json(
                { error: 'Müşteri bulunamadı' },
                { status: 404 }
            )
        }

        // Toplam harcama hesapla
        const totalSpent = customer.orders.reduce((sum, order) => {
            return sum + Number(order.finalAmount)
        }, 0)

        return NextResponse.json({
            ...customer,
            totalSpent
        })
    } catch (error) {
        console.error('Error fetching customer detail:', error)
        return NextResponse.json(
            { error: 'Müşteri bilgileri getirilemedi' },
            { status: 500 }
        )
    }
}

