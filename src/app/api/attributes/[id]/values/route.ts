import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, handleApiError } from '@/lib/error-handler'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Admin yetkisi kontrolü
        const authHeader = request.headers.get('authorization')
        requireAdmin(authHeader)

        const resolvedParams = await params
        const attributeId = resolvedParams.id
        const body = await request.json()
        const { value, price } = body

        if (!value || value.trim() === '') {
            return NextResponse.json(
                { error: 'Değer adı gereklidir' },
                { status: 400 }
            )
        }

        // Attribute'un var olup olmadığını kontrol et
        const attribute = await prisma.productAttribute.findUnique({
            where: { id: attributeId }
        })

        if (!attribute) {
            return NextResponse.json(
                { error: 'Özellik bulunamadı' },
                { status: 404 }
            )
        }

        // Aynı değer zaten var mı kontrol et
        const existingValue = await prisma.productAttributeValue.findFirst({
            where: {
                attributeId: attributeId,
                value: value.trim()
            }
        })

        if (existingValue) {
            return NextResponse.json(existingValue)
        }

        // Yeni değer oluştur
        const attributeValue = await prisma.productAttributeValue.create({
            data: {
                attributeId: attributeId,
                value: value.trim(),
                price: price ? parseFloat(price.toString()) : null
            }
        })

        return NextResponse.json(attributeValue, { status: 201 })
    } catch (error) {
        return handleApiError(error)
    }
}

