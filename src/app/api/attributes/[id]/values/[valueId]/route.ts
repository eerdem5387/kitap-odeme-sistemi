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

