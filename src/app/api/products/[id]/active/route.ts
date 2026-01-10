import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const activeStatusSchema = z.object({
    isActive: z.boolean()
})

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    try {
        console.log('=== PRODUCT ACTIVE STATUS UPDATE API CALLED ===')

        // Authentication kontrolü
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

        const body = await request.json()
        const { isActive } = activeStatusSchema.parse(body)

        console.log('Updating product active status:', { productId: id, isActive })

        // Ürünü güncelle
        const updatedProduct = await (prisma.product as any).update({
            where: { id },
            data: { isActive },
            include: {
                category: true
            }
        })

        console.log('Product updated successfully:', updatedProduct.id)

        return NextResponse.json({
            message: isActive ? 'Ürün aktif duruma alındı' : 'Ürün pasif duruma alındı',
            product: updatedProduct
        })

    } catch (error) {
        console.error('Error updating product active status:', error)
        console.error('Error details:', {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : 'No stack'
        })

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Geçersiz veri formatı', details: error.issues },
                { status: 400 }
            )
        }

        // Prisma hatalarını yakala
        if (error && typeof error === 'object' && 'code' in error) {
            console.error('Prisma error code:', (error as any).code)
            if ((error as any).code === 'P2025') {
                return NextResponse.json(
                    { error: 'Ürün bulunamadı' },
                    { status: 404 }
                )
            }
        }

        return NextResponse.json(
            {
                error: 'Ürün durumu güncellenirken bir hata oluştu',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
} 