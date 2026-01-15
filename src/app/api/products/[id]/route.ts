import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleApiError, NotFoundError, ConflictError, ValidationError, requireAdmin } from '@/lib/error-handler'

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Admin yetkisi kontrolü
        const authHeader = request.headers.get('authorization')
        requireAdmin(authHeader)

        const resolvedParams = await params
        const productId = resolvedParams.id

        // ID formatını kontrol et
        if (!productId || typeof productId !== 'string') {
            throw new ValidationError('Geçersiz ürün ID')
        }

        // Ürünü bul
        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                variations: true,
                orderItems: true
            }
        })

        if (!product) {
            throw new NotFoundError('Ürün bulunamadı')
        }

        // Ürünün siparişlerde kullanılıp kullanılmadığını kontrol et
        if (product.orderItems.length > 0) {
            // Fiziksel silme yerine güvenli "katalogdan kaldırma" işlemi yap
            const updated = await prisma.product.update({
                where: { id: productId },
                data: {
                    isActive: false,
                    isFeatured: false,
                    stock: 0,
                    images: [],
                    name: product.name.includes('(silindi)')
                        ? product.name
                        : `${product.name} (silindi)`,
                },
            })

            return NextResponse.json(
                {
                    message:
                        'Ürün geçmiş siparişlerde kullanıldığı için tamamen silinemedi, ancak katalogdan kaldırıldı.',
                    product: updated,
                    softDeleted: true,
                },
                { status: 200 },
            )
        }

        // Ürünü sil (varyasyonlar cascade ile silinecek)
        await prisma.product.delete({
            where: { id: productId },
        })

        return NextResponse.json(
            { message: 'Ürün başarıyla silindi', softDeleted: false },
            { status: 200 },
        )

    } catch (error) {
        return handleApiError(error)
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params
        const productId = resolvedParams.id

        // ID formatını kontrol et
        if (!productId || typeof productId !== 'string') {
            throw new ValidationError('Geçersiz ürün ID')
        }

        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                category: true,
                variations: {
                    include: {
                        attributes: {
                            include: {
                                attributeValue: {
                                    include: {
                                        attribute: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        })

        if (!product) {
            throw new NotFoundError('Ürün bulunamadı')
        }

        return NextResponse.json(product)

    } catch (error) {
        return handleApiError(error)
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Admin yetkisi kontrolü
        const authHeader = request.headers.get('authorization')
        requireAdmin(authHeader)

        const resolvedParams = await params
        const productId = resolvedParams.id

        // ID formatını kontrol et
        if (!productId || typeof productId !== 'string') {
            throw new ValidationError('Geçersiz ürün ID')
        }

        const body = await request.json()

        // Ürünün var olup olmadığını kontrol et
        const existingProduct = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                variations: {
                    include: {
                        attributes: true
                    }
                }
            }
        })

        if (!existingProduct) {
            throw new NotFoundError('Ürün bulunamadı')
        }

        // Otomatik SKU oluştur (eğer SKU boş veya undefined ise)
        let sku = body.sku
        if (!sku || sku.trim() === '') {
            // Kategori bilgisini al
            const category = await prisma.category.findUnique({
                where: { id: body.categoryId },
                select: { name: true }
            })

            const categoryPrefix = category?.name?.toUpperCase().replace(/[^A-Z]/g, '') || 'GENEL'
            const productName = body.name.toUpperCase().replace(/[^A-Z0-9]/g, '')
            const timestamp = Date.now().toString().slice(-6) // Son 6 hanesi
            sku = `${categoryPrefix}-${productName}-${timestamp}`
        }

        // Ürünü güncelle
        const updatedProduct = await prisma.product.update({
            where: { id: productId },
            data: {
                name: body.name,
                description: body.description,
                price: body.price,
                comparePrice: body.comparePrice,
                stock: body.stock,
                sku: sku,
                categoryId: body.categoryId,
                isActive: body.isActive,
                isFeatured: body.isFeatured,
                images: body.images
            },
            include: {
                category: true
            }
        })

        // Varyasyonlu ürünse varyasyonları güncelle
        if (body.productType === 'VARIABLE' && body.variations && Array.isArray(body.variations)) {
            const incomingVariationIds = new Set<string>()
            const existingVariationIds = existingProduct.variations.map(v => v.id)

            console.log('=== VARIATION UPDATE ===')
            console.log('Existing variation IDs:', existingVariationIds)
            console.log('Incoming variations:', body.variations.map(v => ({ id: v.id, price: v.price, stock: v.stock })))

            // Gelen varyasyonları işle
            for (const variationData of body.variations) {
                // Varyasyon ID'sini kontrol et
                // ID yoksa, undefined ise, null ise, geçici ID ise veya mevcut varyasyonlarda yoksa yeni varyasyon
                const hasValidId = variationData.id !== undefined && 
                                  variationData.id !== null &&
                                  typeof variationData.id === 'string' && 
                                  variationData.id.trim() !== '' &&
                                  !variationData.id.startsWith('var-') && 
                                  !variationData.id.startsWith('quick-') &&
                                  existingVariationIds.includes(variationData.id)
                
                const isNewVariation = !hasValidId

                console.log(`Variation ID: ${variationData.id}, isNew: ${isNewVariation}, hasValidId: ${hasValidId}, existingIds:`, existingVariationIds)

                if (isNewVariation) {
                    // Yeni varyasyon oluştur
                    const newVariation = await prisma.productVariation.create({
                        data: {
                            productId: productId,
                            sku: variationData.sku || undefined,
                            price: parseFloat(variationData.price),
                            stock: parseInt(variationData.stock || '0')
                        }
                    })

                    incomingVariationIds.add(newVariation.id)

                    // Varyasyon özelliklerini ekle
                    if (variationData.attributes && Array.isArray(variationData.attributes)) {
                        for (const attr of variationData.attributes) {
                            // Yeni format: attributeId ve attributeValueId kullanılıyor
                            if (attr.attributeId && attr.attributeValueId) {
                                // Doğrudan ID'lerle bağla
                                await prisma.productVariationAttribute.create({
                                    data: {
                                        variationId: newVariation.id,
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
                                        variationId: newVariation.id,
                                        attributeValueId: attributeValue.id
                                    }
                                })
                            }
                        }
                    }
                } else {
                    // Mevcut varyasyonu güncelle
                    incomingVariationIds.add(variationData.id)

                    await prisma.productVariation.update({
                        where: { id: variationData.id },
                        data: {
                            sku: variationData.sku || undefined,
                            price: parseFloat(variationData.price),
                            stock: parseInt(variationData.stock || '0')
                        }
                    })

                    // Varyasyon özelliklerini güncelle (önce mevcut özellikleri sil, sonra yenilerini ekle)
                    await prisma.productVariationAttribute.deleteMany({
                        where: { variationId: variationData.id }
                    })

                    // Yeni özellikleri ekle
                    if (variationData.attributes && Array.isArray(variationData.attributes)) {
                        for (const attr of variationData.attributes) {
                            // Yeni format: attributeId ve attributeValueId kullanılıyor
                            if (attr.attributeId && attr.attributeValueId) {
                                // Doğrudan ID'lerle bağla
                                await prisma.productVariationAttribute.create({
                                    data: {
                                        variationId: variationData.id,
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
                                        variationId: variationData.id,
                                        attributeValueId: attributeValue.id
                                    }
                                })
                            }
                        }
                    }
                }
            }

            // Silinen varyasyonları kaldır (gelen listede olmayan mevcut varyasyonlar)
            const variationsToDelete = existingVariationIds.filter(id => !incomingVariationIds.has(id))
            if (variationsToDelete.length > 0) {
                await prisma.productVariation.deleteMany({
                    where: {
                        id: { in: variationsToDelete }
                    }
                })
            }
        } else if (body.productType === 'SIMPLE') {
            // Basit ürünse tüm varyasyonları sil
            await prisma.productVariation.deleteMany({
                where: { productId: productId }
            })
        }

        // Güncellenmiş ürünü varyasyonlarla birlikte döndür
        const productWithVariations = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                category: true,
                variations: {
                    include: {
                        attributes: {
                            include: {
                                attributeValue: {
                                    include: {
                                        attribute: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        })

        return NextResponse.json(productWithVariations)

    } catch (error) {
        return handleApiError(error)
    }
} 