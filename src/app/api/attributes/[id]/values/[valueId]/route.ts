import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, handleApiError } from '@/lib/error-handler'

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; valueId: string }> }
) {
    try {
        // Admin yetkisi kontrolü
        const authHeader = request.headers.get('authorization')
        requireAdmin(authHeader)

        const resolvedParams = await params
        const { valueId } = resolvedParams
        const body = await request.json()
        const { price } = body

        // Değeri güncelle
        const attributeValue = await prisma.productAttributeValue.update({
            where: { id: valueId },
            data: {
                price: price !== undefined && price !== null ? parseFloat(price.toString()) : null
            }
        })

        return NextResponse.json(attributeValue)
    } catch (error) {
        return handleApiError(error)
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; valueId: string }> }
) {
    try {
        // Admin yetkisi kontrolü
        const authHeader = request.headers.get('authorization')
        requireAdmin(authHeader)

        const resolvedParams = await params
        const { valueId } = resolvedParams

        // Değerin kullanılıp kullanılmadığını kontrol et
        const usageCount = await prisma.productVariationAttribute.count({
            where: {
                attributeValueId: valueId
            }
        })

        if (usageCount > 0) {
            return NextResponse.json(
                { 
                    error: 'Bu değer kullanımda olduğu için silinemez. Önce bu değeri kullanan varyasyonları kaldırın.',
                    usageCount 
                },
                { status: 400 }
            )
        }

        // Değeri sil
        await prisma.productAttributeValue.delete({
            where: { id: valueId }
        })

        return NextResponse.json({ success: true, message: 'Değer başarıyla silindi' })
    } catch (error) {
        return handleApiError(error)
    }
}

