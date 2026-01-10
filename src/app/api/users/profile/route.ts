import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'
import { z } from 'zod'

const profileUpdateSchema = z.object({
    name: z.string().min(1, 'Ad soyad gereklidir'),
    phone: z.string().optional()
})

export async function GET(request: NextRequest) {
    try {
        const token = request.headers.get('authorization')?.replace('Bearer ', '')
        if (!token) {
            return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 })
        }

        const payload = verifyToken(token)
        if (!payload) {
            return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            include: {
                addresses: {
                    orderBy: { isDefault: 'desc' }
                },
                orders: {
                    select: { id: true }
                }
            }
        })

        if (!user) {
            return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
        }

        return NextResponse.json({
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone || null,
            addresses: user.addresses,
            orderCount: user.orders.length
        })
    } catch (error) {
        console.error('Error fetching profile:', error)
        return NextResponse.json({ error: 'Profil getirilemedi' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        console.log('=== PROFILE UPDATE API CALLED ===')

        const token = request.headers.get('authorization')?.replace('Bearer ', '')
        if (!token) {
            return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 })
        }

        const payload = verifyToken(token)
        if (!payload) {
            return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 })
        }

        const body = await request.json()
        console.log('Update request body:', body)

        const updateData = profileUpdateSchema.parse(body)
        console.log('Parsed update data:', updateData)

        const updatedUser = await prisma.user.update({
            where: { id: payload.userId },
            data: updateData,
            include: {
                addresses: {
                    orderBy: { isDefault: 'desc' }
                },
                orders: {
                    select: { id: true }
                }
            }
        })

        console.log('Updated user:', updatedUser)

        return NextResponse.json({
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            phone: updatedUser.phone || null,
            addresses: updatedUser.addresses,
            orderCount: updatedUser.orders.length
        })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({
                error: 'Geçersiz veri formatı',
                details: error.issues
            }, { status: 400 })
        }
        console.error('Error updating profile:', error)
        return NextResponse.json({ error: 'Profil güncellenemedi' }, { status: 500 })
    }
} 