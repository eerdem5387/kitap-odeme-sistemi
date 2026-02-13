import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { emailService } from '@/lib/email'
import { handleApiError, UnauthorizedError, NotFoundError, ValidationError, requireAuth, validateRequest } from '@/lib/error-handler'
import { z } from 'zod'

const orderItemSchema = z.object({
    productId: z.string().min(1, 'Ürün ID gerekli'),
    variationId: z.string().optional(),
    quantity: z.number().min(1, 'Miktar en az 1 olmalı')
})

const addressSchema = z.object({
    title: z.string().min(1, 'Adres başlığı gerekli'),
    firstName: z.string().min(1, 'Ad gerekli'),
    lastName: z.string().min(1, 'Soyad gerekli'),
    phone: z.string().min(1, 'Telefon gerekli'),
    city: z.string().min(1, 'Şehir gerekli'),
    district: z.string().min(1, 'İlçe gerekli'),
    fullAddress: z.string().min(1, 'Adres gerekli')
})

const createOrderSchema = z.object({
    items: z.array(orderItemSchema).min(1, 'En az bir ürün gerekli'),
    shippingAddress: addressSchema,
    billingAddress: addressSchema.optional(),
    notes: z.string().optional()
})

export async function GET(request: NextRequest) {
    try {
        // Authorization kontrolü
        const authHeader = request.headers.get('authorization')
        const user = requireAuth(authHeader)

        // Kullanıcıya ait siparişleri getir
        const orders = await prisma.order.findMany({
            where: { userId: user.userId },
            include: {
                user: {
                    select: { name: true, email: true }
                },
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                images: true
                            },
                            include: {
                                category: {
                                    select: {
                                        id: true,
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                },
                shippingAddress: true,
                billingAddress: true
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(orders)
    } catch (error) {
        return handleApiError(error)
    }
}

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization')
        let userId: string | null = null

        // Try to authenticate; if fails, continue as guest
        try {
            if (authHeader) {
                const user = requireAuth(authHeader)
                userId = user.userId
            }
        } catch {
            userId = null
        }

        const body = await request.json()

        // Extend schema at runtime for guest email
        const guestOrderSchema = createOrderSchema.extend({
            customerEmail: z.string().email('Geçerli bir e-posta giriniz').optional(),
            customerName: z.string().optional(),
            customerPhone: z.string().optional()
        })

        const { items, shippingAddress, billingAddress, notes, customerEmail, customerName, customerPhone } = validateRequest(guestOrderSchema, body)

        // If no auth user, require customerEmail for guest checkout
        if (!userId) {
            if (!customerEmail) {
                throw new ValidationError('Misafir sipariş için e-posta gereklidir')
            }
            // Upsert guest user by email
            const nameParts = (customerName || `${shippingAddress.firstName} ${shippingAddress.lastName}`).trim()
            const [first, ...rest] = nameParts.split(' ')
            const displayName = nameParts || 'Müşteri'

            // Aynı e-posta farklı kişiler için kullanılsa bile User kaydını güncelleme;
            // sipariş bazlı müşteri bilgisi guestCustomerEmail/guestCustomerName ile saklanır.
            const upserted = await prisma.user.upsert({
                where: { email: customerEmail.toLowerCase() },
                update: {},
                create: {
                    email: customerEmail.toLowerCase(),
                    password: 'guest',
                    name: displayName,
                    phone: customerPhone || shippingAddress.phone,
                    role: 'CUSTOMER'
                }
            })
            userId = upserted.id
        }

        // billingAddress undefined ise shippingAddress'i kullan
        const finalBillingAddress = billingAddress || shippingAddress

        // Kullanıcıyı veritabanından al
        const dbUser = await prisma.user.findUnique({ where: { id: userId! } })
        if (!dbUser) {
            throw new NotFoundError('Kullanıcı bulunamadı')
        }

        // Toplam tutarı hesapla
        let subtotal = 0
        for (const item of items) {
            if (item.variationId) {
                const variation = await prisma.productVariation.findUnique({
                    where: { id: item.variationId },
                    select: { price: true, stock: true, product: { select: { isActive: true } } }
                })
                if (!variation) throw new NotFoundError(`Varyasyon bulunamadı: ${item.variationId}`)
                if (!variation.product.isActive) throw new ValidationError('Ürün aktif değil')
                if (variation.stock !== -1 && variation.stock < item.quantity) {
                    throw new ValidationError('Yetersiz stok (varyasyon)')
                }
                subtotal += Number(variation.price) * item.quantity
            } else {
                const product = await prisma.product.findUnique({
                    where: { id: item.productId },
                    select: { price: true, stock: true, isActive: true }
                })
                if (!product) throw new NotFoundError(`Ürün bulunamadı: ${item.productId}`)
                if (!product.isActive) throw new ValidationError('Ürün aktif değil')
                if (product.stock !== -1 && product.stock < item.quantity) {
                    throw new ValidationError('Yetersiz stok')
                }
                subtotal += Number(product.price) * item.quantity
            }
        }

        // Kargo ayarlarını Settings tablosundan oku
        let shippingFee = 0
        try {
            const [shippingCostSetting, freeThresholdSetting] = await Promise.all([
                prisma.settings.findUnique({ where: { key: 'shipping.defaultShippingCost' } }),
                prisma.settings.findUnique({ where: { key: 'shipping.freeShippingThreshold' } })
            ])

            const defaultShippingCost = shippingCostSetting ? parseFloat(shippingCostSetting.value) : 29.99
            const freeShippingThreshold = freeThresholdSetting ? parseFloat(freeThresholdSetting.value) : 500

            // Eğer eşik 0 veya NaN ise her zaman defaultShippingCost kullan
            if (!isFinite(freeShippingThreshold) || freeShippingThreshold <= 0) {
                shippingFee = defaultShippingCost
            } else {
                shippingFee = subtotal >= freeShippingThreshold ? 0 : defaultShippingCost
            }
        } catch (e) {
            // Herhangi bir ayar okunamazsa eski davranışa geri dön
            console.error('Shipping settings read error, falling back to defaults:', e)
            shippingFee = subtotal > 500 ? 0 : 29.99
        }

        const taxAmount = 0
        const discountAmount = 0
        const finalAmount = subtotal + shippingFee - discountAmount

        // Adresleri kontrol et veya oluştur
        const findOrCreateAddress = async (addressData: any) => {
            const existingAddress = await prisma.address.findFirst({
                where: {
                    userId: dbUser.id,
                    title: addressData.title,
                    firstName: addressData.firstName,
                    lastName: addressData.lastName,
                    phone: addressData.phone,
                    city: addressData.city,
                    district: addressData.district,
                    fullAddress: addressData.fullAddress
                }
            })

            if (existingAddress) {
                return existingAddress
            }
            return await prisma.address.create({
                data: {
                    userId: dbUser.id,
                    title: addressData.title,
                    firstName: addressData.firstName,
                    lastName: addressData.lastName,
                    phone: addressData.phone,
                    country: 'Türkiye',
                    city: addressData.city,
                    district: addressData.district,
                    fullAddress: addressData.fullAddress
                }
            })
        }

        const shippingAddressRecord = await findOrCreateAddress(shippingAddress)
        const billingAddressRecord = await findOrCreateAddress(finalBillingAddress)

        const isGuestOrder = !userId && !!customerEmail
        const guestData = isGuestOrder ? {
            guestCustomerEmail: customerEmail,
            guestCustomerName: (customerName || `${shippingAddress.firstName} ${shippingAddress.lastName}`).trim()
        } : {}
        const baseData = {
            userId: dbUser.id,
            orderNumber: `ORD-${Date.now()}`,
            status: 'PENDING',
            paymentStatus: 'PENDING',
            totalAmount: subtotal,
            shippingFee: shippingFee,
            taxAmount: taxAmount,
            discountAmount: discountAmount,
            finalAmount: finalAmount,
            shippingAddressId: shippingAddressRecord.id,
            billingAddressId: billingAddressRecord.id,
            paymentMethod: 'CREDIT_CARD',
            notes: notes || ''
        }
        let order: Awaited<ReturnType<typeof prisma.order.create>>
        try {
            order = await prisma.order.create({
                data: { ...baseData, ...guestData },
                include: {
                    user: true,
                    items: { include: { product: true } }
                }
            })
        } catch (createError: unknown) {
            const msg = createError instanceof Error ? createError.message : ''
            if (Object.keys(guestData).length > 0 && (msg.includes('column') || msg.includes('guestCustomer'))) {
                order = await prisma.order.create({
                    data: baseData,
                    include: {
                        user: true,
                        items: { include: { product: true } }
                    }
                })
            } else {
                throw createError
            }
        }

        // Sipariş kalemlerini oluştur
        for (const item of items) {
            let unitPrice = 0
            if (item.variationId) {
                const variation = await prisma.productVariation.findUnique({ where: { id: item.variationId }, select: { price: true } })
                if (variation) unitPrice = Number(variation.price)
            } else {
                const product = await prisma.product.findUnique({ where: { id: item.productId }, select: { price: true } })
                if (product) unitPrice = Number(product.price)
            }
            if (unitPrice > 0) {
                await prisma.orderItem.create({
                    data: {
                        orderId: order.id,
                        productId: item.productId,
                        variationId: item.variationId || null,
                        quantity: item.quantity,
                        unitPrice: unitPrice,
                        totalPrice: unitPrice * item.quantity
                    }
                })
            }
        }

        // E-posta bildirimleri gönder (asenkron)
        try {
            await emailService.sendOrderConfirmation(order, dbUser.email)
            await emailService.sendOrderNotificationToAdmin(order)
        } catch { }

        return NextResponse.json(order, { status: 201 })
    } catch (error) {
        return handleApiError(error)
    }
} 