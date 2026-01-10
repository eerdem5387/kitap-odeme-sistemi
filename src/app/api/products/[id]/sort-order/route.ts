import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const sortOrderSchema = z.object({
    sortOrder: z.number().int().min(0, 'Sıralama 0 veya daha büyük olmalıdır')
})

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    try {
        console.log('=== PRODUCT SORT ORDER UPDATE API CALLED ===')

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
        const { sortOrder } = sortOrderSchema.parse(body)

        console.log('Updating product sort order:', { productId: id, sortOrder })

        // Ürünü güncelle
        const updatedProduct = await (prisma.product as any).update({
            where: { id },
            data: {
                sortOrder: sortOrder
            },
            include: {
                category: true
            }
        })

        console.log('Product updated successfully:', updatedProduct.id)

        return NextResponse.json({
            message: 'Ürün sıralaması başarıyla güncellendi',
            product: updatedProduct
        })

    } catch (error) {
        console.error('Error updating product sort order:', error)
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
                error: 'Ürün sıralaması güncellenirken bir hata oluştu',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
} 