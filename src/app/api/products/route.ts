import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const createProductSchema = z.object({
    name: z.string().min(1, 'Ürün adı gereklidir'),
    description: z.string().min(1, 'Ürün açıklaması gereklidir'),
    price: z.number().min(0, 'Fiyat negatif olamaz'),
    comparePrice: z.number().optional(),
    images: z.array(z.string()).optional().default([]),
    categoryId: z.string().min(1, 'Kategori seçimi gereklidir'),
    productType: z.enum(['SIMPLE', 'VARIABLE']).default('SIMPLE'),
    stock: z.number().int().min(-1, 'Stok -1 (sınırsız) veya 0+ olmalıdır'),
    sku: z.string().optional(),
    weight: z.number().optional(),
    dimensions: z.string().optional(),
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
    variations: z.array(z.object({
        sku: z.string().optional(),
        price: z.string().min(1, 'Fiyat gereklidir'),
        stock: z.string().min(1, 'Stok gereklidir'),
        attributes: z.array(z.object({
            // Yeni format (öncelikli)
            attributeId: z.string().optional(),
            attributeValueId: z.string().optional(),
            // Eski format (backward compatibility)
            name: z.string().optional(),
            value: z.string().optional()
        }).refine((data) => {
            // Ya yeni format ya da eski format olmalı
            return (data.attributeId && data.attributeValueId) || (data.name && data.value)
        }, {
            message: 'Özellik için attributeId/attributeValueId veya name/value gereklidir'
        }))
    })).optional()
}).refine((data) => {
    // Varyasyonlu ürünlerde en az bir varyasyon olmalı
    if (data.productType === 'VARIABLE') {
        return data.variations && data.variations.length > 0
    }
    return true
}, {
    message: 'Varyasyonlu ürünler için en az bir varyasyon gereklidir',
    path: ['variations']
}).refine((data) => {
    // Basit ürünlerde fiyat pozitif olmalı
    if (data.productType === 'SIMPLE') {
        return data.price > 0
    }
    return true
}, {
    message: 'Basit ürünler için fiyat gereklidir',
    path: ['price']
})

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const admin = searchParams.get('admin') === 'true' // Admin panel için flag
        const limit = admin ? undefined : parseInt(searchParams.get('limit') || '12') // Admin için limit yok
        const category = searchParams.get('category')
        const search = searchParams.get('search')
        const minPrice = searchParams.get('minPrice')
        const maxPrice = searchParams.get('maxPrice')
        const featured = searchParams.get('featured')

        // Admin panel için authentication kontrolü
        if (admin) {
            console.log('=== ADMIN PRODUCTS API CALLED ===')

            const authHeader = request.headers.get('authorization')
            console.log('Auth header:', authHeader)

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                console.log('Auth error: Invalid authorization header')
                return NextResponse.json(
                    { error: 'Yetkilendirme gerekli' },
                    { status: 401 }
                )
            }

            const token = authHeader.substring(7)
            console.log('Token:', token)

            // JWT token'ı doğrula
            const decodedToken = verifyToken(token)
            console.log('Decoded token:', decodedToken)

            if (!decodedToken) {
                console.log('Token verification failed')
                return NextResponse.json(
                    { error: 'Geçersiz token' },
                    { status: 401 }
                )
            }

            // Admin kontrolü
            if (decodedToken.role !== 'ADMIN') {
                console.log('Access denied: Not admin')
                return NextResponse.json(
                    { error: 'Admin yetkisi gerekli' },
                    { status: 403 }
                )
            }
        }

        const skip = limit ? (page - 1) * limit : 0

        const where: {
            isActive?: boolean
            category?: { slug: string }
            categoryId?: string
            isFeatured?: boolean
            OR?: Array<{
                name?: { contains: string; mode: 'insensitive' }
                description?: { contains: string; mode: 'insensitive' }
                sku?: { contains: string; mode: 'insensitive' }
            }>
            price?: { gte?: number; lte?: number }
            AND?: any[]
        } = {}

        // Public taraf için sadece aktif ürünler
        if (!admin) {
            where.isActive = true
        }

        // Hem public hem admin tarafında "silinmiş" ürünleri gizle
        // (DELETE endpoint'inde soft-delete yaptığımız ürünler)
        where.AND = [
            {
                NOT: {
                    isActive: false,
                    stock: 0,
                    images: {
                        isEmpty: true,
                    },
                },
            },
        ]

        if (category) {
            where.categoryId = category
        }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } }
            ]
        }

        if (minPrice || maxPrice) {
            where.price = {}
            if (minPrice) where.price.gte = parseFloat(minPrice)
            if (maxPrice) where.price.lte = parseFloat(maxPrice)
        }

        if (featured === 'true') {
            where.isFeatured = true
        }

        const [products, total] = await Promise.all([
            (prisma.product as any).findMany({
                where,
                include: {
                    category: true,
                    variations: {
                        include: {
                            attributes: {
                                include: {
                                    attributeValue: true
                                }
                            }
                        }
                    },
                    _count: {
                        select: { reviews: true }
                    }
                },
                skip,
                ...(limit ? { take: limit } : {}),
                orderBy: [
                    { sortOrder: 'asc' },
                    { createdAt: 'desc' }
                ]
            }),
            prisma.product.count({ where })
        ])

        // Admin panel için sadece products array'ini döndür
        if (admin) {
            return NextResponse.json(products)
        }

        // Normal frontend için pagination'lı format
        return NextResponse.json({
            products,
            pagination: {
                page,
                limit: limit || 12,
                total,
                pages: Math.ceil(total / (limit || 12))
            }
        })

    } catch (error) {
        console.error('Get products error:', error)
        return NextResponse.json(
            { error: 'Ürünler yüklenirken bir hata oluştu' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        console.log('=== PRODUCT CREATE API CALLED ===')
        console.log('Request body:', body)

        const productData = createProductSchema.parse(body)
        console.log('Parsed product data:', productData)

        // Benzersiz slug oluştur
        const baseSlug = productData.name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim()

        // Aynı slug varsa benzersiz yap
        let slug = baseSlug
        let counter = 1

        while (true) {
            const existingProduct = await prisma.product.findUnique({
                where: { slug }
            })

            if (!existingProduct) {
                break // Benzersiz slug bulundu
            }

            // Aynı slug varsa sonuna sayı ekle
            slug = `${baseSlug}-${counter}`
            counter++
        }

        // Kategori bilgisini al
        const category = await prisma.category.findUnique({
            where: { id: productData.categoryId },
            select: { name: true }
        })

        // Otomatik SKU oluştur (eğer SKU boşsa)
        let sku = productData.sku
        if (!sku) {
            const categoryPrefix = category?.name?.toUpperCase().replace(/[^A-Z]/g, '') || 'GENEL'
            const productName = productData.name.toUpperCase().replace(/[^A-Z0-9]/g, '')
            const timestamp = Date.now().toString().slice(-6) // Son 6 hanesi
            sku = `${categoryPrefix}-${productName}-${timestamp}`
        }

        const productDataForCreate = {
            ...productData,
            slug,
            sku
        }

        // Varyasyonları çıkar çünkü ayrı işlenecek
        const { variations: productVariations, ...productDataWithoutVariations } = productDataForCreate

        const product = await prisma.product.create({
            data: productDataWithoutVariations,
            include: {
                category: true
            }
        })

        // Eğer varyasyonlu ürünse varyasyonları ekle
        if (productData.productType === 'VARIABLE' && productVariations && productVariations.length > 0) {
            for (const variationData of productVariations) {
                // Önce varyasyonu oluştur
                const variation = await prisma.productVariation.create({
                    data: {
                        productId: product.id,
                        sku: variationData.sku || undefined,
                        price: parseFloat(variationData.price),
                        stock: parseInt(variationData.stock)
                    }
                })

                // Varyasyon özelliklerini ekle
                for (const attr of variationData.attributes) {
                    // Yeni format: attributeId ve attributeValueId kullanılıyor
                    if (attr.attributeId && attr.attributeValueId) {
                        // Doğrudan ID'lerle bağla
                        await prisma.productVariationAttribute.create({
                            data: {
                                variationId: variation.id,
                                attributeValueId: attr.attributeValueId
                            }
                        })
                    } else if (attr.name && attr.value) {
                        // Eski format desteği (backward compatibility)
                        let attributeValue = await prisma.productAttributeValue.findFirst({
                            where: {
                                attribute: { name: attr.name },
                                value: attr.value
                            }
                        })

                        if (!attributeValue) {
                            let attribute = await prisma.productAttribute.findUnique({
                                where: { name: attr.name }
                            })

                            if (!attribute) {
                                attribute = await prisma.productAttribute.create({
                                    data: { name: attr.name, type: 'SELECT' }
                                })
                            }

                            attributeValue = await prisma.productAttributeValue.create({
                                data: {
                                    attributeId: attribute.id,
                                    value: attr.value
                                }
                            })
                        }

                        await prisma.productVariationAttribute.create({
                            data: {
                                variationId: variation.id,
                                attributeValueId: attributeValue.id
                            }
                        })
                    }
                }
            }
        }

        // Ürünü varyasyonlarla birlikte döndür
        const productWithVariations = await prisma.product.findUnique({
            where: { id: product.id },
            include: {
                category: true,
                variations: {
                    include: {
                        attributes: {
                            include: {
                                attributeValue: true
                            }
                        }
                    }
                }
            }
        })

        return NextResponse.json(productWithVariations, { status: 201 })

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Geçersiz veri formatı', details: error.issues },
                { status: 400 }
            )
        }

        console.error('Create product error:', error)
        return NextResponse.json(
            { error: 'Ürün oluşturulurken bir hata oluştu' },
            { status: 500 }
        )
    }
} 