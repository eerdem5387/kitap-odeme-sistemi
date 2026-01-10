import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        console.log('=== USERS LIST API CALLED ===')

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

        const { searchParams } = new URL(request.url)
        const role = searchParams.get('role')

        const whereClause = role ? { role: role as any } : {}

        const users = await prisma.user.findMany({
            where: whereClause,
            include: {
                _count: {
                    select: {
                        orders: true,
                        addresses: true
                    }
                },
                orders: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    select: { createdAt: true, finalAmount: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        console.log('Found users:', users.length)
        return NextResponse.json(users)
    } catch (error) {
        console.error('Error fetching users:', error)
        return NextResponse.json(
            { error: 'Kullanıcılar getirilemedi' },
            { status: 500 }
        )
    }
} 