import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params
        const body = await request.json()
        const { isFeatured } = body

        const product = await prisma.product.update({
            where: { id: resolvedParams.id },
            data: { isFeatured }
        })

        return NextResponse.json({
            message: isFeatured ? 'Ürün öne çıkarıldı' : 'Ürün öne çıkarılmaktan çıkarıldı',
            product
        })
    } catch (error) {
        console.error('Error updating product featured status:', error)
        return NextResponse.json({ error: 'Ürün güncellenirken bir hata oluştu' }, { status: 500 })
    }
} 