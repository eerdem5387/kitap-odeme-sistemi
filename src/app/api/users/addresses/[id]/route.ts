import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const addressUpdateSchema = z.object({
    title: z.string().min(1, 'Adres başlığı gereklidir'),
    firstName: z.string().min(1, 'Ad gereklidir'),
    lastName: z.string().min(1, 'Soyad gereklidir'),
    phone: z.string().min(1, 'Telefon gereklidir'),
    city: z.string().min(1, 'Şehir gereklidir'),
    district: z.string().min(1, 'İlçe gereklidir'),
    fullAddress: z.string().min(1, 'Tam adres gereklidir'),
    isDefault: z.boolean().optional()
})

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        console.log('=== ADDRESS UPDATE API CALLED ===')

        const resolvedParams = await params
        const token = request.headers.get('authorization')?.replace('Bearer ', '')
        if (!token) {
            return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 })
        }

        const payload = verifyToken(token)
        if (!payload) {
            return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 })
        }

        // Adresin kullanıcıya ait olduğunu kontrol et
        const existingAddress = await prisma.address.findFirst({
            where: {
                id: resolvedParams.id,
                userId: payload.userId
            }
        })

        if (!existingAddress) {
            return NextResponse.json({ error: 'Adres bulunamadı' }, { status: 404 })
        }

        const body = await request.json()
        console.log('Address update request body:', body)

        const addressData = addressUpdateSchema.parse(body)

        // Eğer adres varsayılan olarak işaretleniyorsa, diğer adresleri varsayılan olmaktan çıkar
        if (addressData.isDefault) {
            await prisma.address.updateMany({
                where: {
                    userId: payload.userId,
                    id: { not: resolvedParams.id }
                },
                data: { isDefault: false }
            })
        }

        const updatedAddress = await prisma.address.update({
            where: { id: resolvedParams.id },
            data: {
                title: addressData.title,
                firstName: addressData.firstName,
                lastName: addressData.lastName,
                phone: addressData.phone,
                city: addressData.city,
                district: addressData.district,
                fullAddress: addressData.fullAddress,
                isDefault: addressData.isDefault || false
            }
        })

        console.log('Address updated:', updatedAddress.id)
        return NextResponse.json(updatedAddress)
    } catch (error) {
        console.error('Error updating address:', error)

        if (error instanceof z.ZodError) {
            return NextResponse.json({
                error: 'Geçersiz adres verisi',
                details: error.issues
            }, { status: 400 })
        }

        return NextResponse.json({
            error: 'Adres güncellenemedi',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        console.log('=== ADDRESS DELETE API CALLED ===')

        const resolvedParams = await params
        const token = request.headers.get('authorization')?.replace('Bearer ', '')
        if (!token) {
            return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 })
        }

        const payload = verifyToken(token)
        if (!payload) {
            return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 })
        }

        // Adresin kullanıcıya ait olduğunu kontrol et
        const existingAddress = await prisma.address.findFirst({
            where: {
                id: resolvedParams.id,
                userId: payload.userId
            }
        })

        if (!existingAddress) {
            return NextResponse.json({ error: 'Adres bulunamadı' }, { status: 404 })
        }

        // Adresin siparişlerde kullanılıp kullanılmadığını kontrol et
        const addressInUse = await prisma.order.findFirst({
            where: {
                OR: [
                    { shippingAddressId: resolvedParams.id },
                    { billingAddressId: resolvedParams.id }
                ]
            }
        })

        if (addressInUse) {
            return NextResponse.json({
                error: 'Bu adres siparişlerde kullanıldığı için silinemez'
            }, { status: 400 })
        }

        // Adresi sil
        await prisma.address.delete({
            where: { id: resolvedParams.id }
        })

        console.log('Address deleted:', resolvedParams.id)
        return NextResponse.json({ message: 'Adres başarıyla silindi' })
    } catch (error) {
        console.error('Error deleting address:', error)
        return NextResponse.json({
            error: 'Adres silinemedi',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
} 