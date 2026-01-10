import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const query = searchParams.get('q')
        const category = searchParams.get('category')
        const minPrice = searchParams.get('minPrice')
        const maxPrice = searchParams.get('maxPrice')
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '12')
        const skip = (page - 1) * limit

        if (!query && !category && !minPrice && !maxPrice) {
            return NextResponse.json({ error: 'Arama terimi gerekli' }, { status: 400 })
        }

        // Filtreleme koşulları
        const where: {
            isActive: boolean
            OR?: Array<{
                name?: { contains: string; mode: 'insensitive' }
                description?: { contains: string; mode: 'insensitive' }
                sku?: { contains: string; mode: 'insensitive' }
            }>
            category?: { slug: string }
            price?: { gte?: number; lte?: number }
        } = {
            isActive: true
        }

        // Arama terimi
        if (query) {
            where.OR = [
                { name: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { sku: { contains: query, mode: 'insensitive' } }
            ]
        }

        // Kategori filtresi
        if (category) {
            where.category = { slug: category }
        }

        // Fiyat filtresi
        if (minPrice || maxPrice) {
            where.price = {}
            if (minPrice) where.price.gte = parseFloat(minPrice)
            if (maxPrice) where.price.lte = parseFloat(maxPrice)
        }

        // Ürünleri getir
        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                include: {
                    category: true,
                    _count: {
                        select: { reviews: true }
                    }
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.product.count({ where })
        ])

        // Decimal değerlerini number'a çevir
        const formattedProducts = products.map(product => ({
            ...product,
            price: Number(product.price),
            comparePrice: product.comparePrice ? Number(product.comparePrice) : undefined
        }))

        const totalPages = Math.ceil(total / limit)

        return NextResponse.json({
            products: formattedProducts,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        })
    } catch (error) {
        console.error('Error searching products:', error)
        return NextResponse.json({ error: 'Arama yapılırken bir hata oluştu' }, { status: 500 })
    }
} 