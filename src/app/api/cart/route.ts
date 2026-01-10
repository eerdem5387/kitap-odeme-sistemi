import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { handleApiError, NotFoundError, ValidationError, validateRequest } from '@/lib/error-handler'

const cartItemSchema = z.object({
    productId: z.string().min(1, 'Ürün ID gerekli'),
    quantity: z.number().min(1, 'Miktar en az 1 olmalı')
})

export async function GET() {
    try {
        // Sepet verilerini localStorage'dan almak için client-side'da yapılacak
        // Bu endpoint sadece ürün bilgilerini getirmek için kullanılacak
        return NextResponse.json({ message: 'Sepet verileri client-side\'da yönetiliyor' })
    } catch (error) {
        console.error('Error fetching cart:', error)
        return NextResponse.json({ error: 'Sepet getirilirken bir hata oluştu' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { productId, quantity } = validateRequest(cartItemSchema, body)

        // Ürünü kontrol et
        const product = await prisma.product.findUnique({
            where: { id: productId, isActive: true }
        })

        if (!product) {
            throw new NotFoundError('Ürün bulunamadı veya aktif değil')
        }

        if (product.stock < quantity) {
            throw new ValidationError('Yeterli stok bulunmuyor')
        }

        // Ürün bilgilerini döndür (client-side'da sepete eklenecek)
        return NextResponse.json({
            id: product.id,
            name: product.name,
            price: Number(product.price),
            image: product.images?.[0],
            stock: product.stock,
            quantity
        })
    } catch (error) {
        return handleApiError(error)
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { productId, quantity } = validateRequest(cartItemSchema, body)

        // Ürünü kontrol et
        const product = await prisma.product.findUnique({
            where: { id: productId, isActive: true }
        })

        if (!product) {
            throw new NotFoundError('Ürün bulunamadı veya aktif değil')
        }

        if (product.stock < quantity) {
            throw new ValidationError('Yeterli stok bulunmuyor')
        }

        return NextResponse.json({
            id: product.id,
            name: product.name,
            price: Number(product.price),
            image: product.images?.[0],
            stock: product.stock,
            quantity
        })
    } catch (error) {
        return handleApiError(error)
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const productId = searchParams.get('productId')

        if (!productId) {
            throw new ValidationError('Ürün ID gerekli')
        }

        // Ürünün var olduğunu kontrol et
        const product = await prisma.product.findUnique({
            where: { id: productId }
        })

        if (!product) {
            throw new NotFoundError('Ürün bulunamadı')
        }

        return NextResponse.json({ message: 'Ürün sepetten kaldırıldı' })
    } catch (error) {
        return handleApiError(error)
    }
} 