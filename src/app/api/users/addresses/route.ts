import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        console.log('=== USER ADDRESSES API CALLED ===')

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

        // Kullanıcının adreslerini getir
        const addresses = await prisma.address.findMany({
            where: { userId: decodedToken.userId },
            orderBy: { isDefault: 'desc' }
        })

        console.log('Found addresses:', addresses.length)
        return NextResponse.json(addresses)
    } catch (error) {
        console.error('Error fetching user addresses:', error)
        return NextResponse.json(
            { error: 'Adresler getirilemedi' },
            { status: 500 }
        )
    }
} 