import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'
import { ziraatPaymentService } from '@/lib/ziraat-payment'

const paymentSchema = z.object({
    orderId: z.string(),
    amount: z.number(),
    method: z.enum(['CREDIT_CARD', 'BANK_TRANSFER', 'CASH_ON_DELIVERY']),
    // Kart bilgileri Ziraat sayfasına post edileceği için burada zorunlu değil,
    // v3 Hosting modelinde kart bilgisi banka sayfasında girilir.
    installments: z.string().optional(),
    // Misafir kullanıcı için opsiyonel e-posta doğrulaması
    guestEmail: z.string().email().optional()
})

export async function POST(request: NextRequest) {
    try {
        console.log('=== PAYMENT PROCESS API CALLED ===')

        const authHeader = request.headers.get('authorization')
        const token = authHeader?.replace('Bearer ', '')
        let payload: any = null

        // Token varsa doğrula, yoksa misafir akışına izin ver
        if (token) {
            payload = verifyToken(token)
            if (!payload) {
                return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 })
            }
        }

        const body = await request.json()
        const paymentData = paymentSchema.parse(body)

        // Siparişi kontrol et
        const order = await prisma.order.findUnique({
            where: { id: paymentData.orderId },
            include: {
                user: true
            }
        })

        if (!order) {
            return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 })
        }

        // Yetki / Sahiplik kontrolü
        if (payload) {
            // Giriş yapmış kullanıcı için: sadece kendi siparişini ödeyebilir (admin hariç)
            if (payload.role !== 'ADMIN' && order.userId !== payload.userId) {
                return NextResponse.json({ error: 'Bu siparişe erişim izniniz yok' }, { status: 403 })
            }
        } else {
            // Misafir kullanıcı için: e-posta adresi ile basit doğrulama
            if (!paymentData.guestEmail) {
                return NextResponse.json({ error: 'Misafir ödemesi için e-posta gerekli' }, { status: 401 })
            }
            if (order.user && order.user.email.toLowerCase() !== paymentData.guestEmail.toLowerCase()) {
                return NextResponse.json({ error: 'Bu siparişe erişim izniniz yok' }, { status: 403 })
            }
        }

        if (order.paymentStatus === 'COMPLETED') {
            return NextResponse.json({ error: 'Bu sipariş zaten ödenmiş' }, { status: 400 })
        }

        // Tutar kontrolü
        if (Number(order.finalAmount) !== paymentData.amount) {
            return NextResponse.json({ error: 'Ödeme tutarı uyuşmuyor' }, { status: 400 })
        }

        // Sadece Kredi Kartı için Ziraat POS başlatılır
        if (paymentData.method === 'CREDIT_CARD') {
            // Request'ten base URL al
            const host = request.headers.get('host') || ''
            const protocol = request.headers.get('x-forwarded-proto') || 
                           (host.includes('localhost') ? 'http' : 'https')
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`
            
            const ziraatResponse = await ziraatPaymentService.createPaymentRequest({
                amount: paymentData.amount,
                orderId: order.id,
                orderNumber: order.orderNumber,
                successUrl: `${baseUrl}/api/payment/ziraat/callback`,
                failUrl: `${baseUrl}/api/payment/ziraat/callback`,
                customerEmail: order.user.email,
                customerName: order.user.name,
                customerPhone: order.user.phone || '',
                installments: paymentData.installments
            })

            if (!ziraatResponse.success || !ziraatResponse.redirectUrl) {
                console.error('Ziraat POS Error:', ziraatResponse.error)
                return NextResponse.json({ 
                    error: ziraatResponse.error || 'Ödeme başlatılamadı' 
                }, { status: 400 })
            }

            // Frontend'e banka formunu post etmesi için gerekli verileri dön
            return NextResponse.json({
                success: true,
                requiresRedirect: true,
                redirectUrl: ziraatResponse.redirectUrl,
                formParams: ziraatResponse.formParams
            })
        }

        // Diğer ödeme yöntemleri (Kapıda Ödeme / Havale) için manuel işlem
        // ... (Mevcut mantık korunabilir veya burası ayrıca düzenlenebilir)
        
        return NextResponse.json({ error: 'Sadece kredi kartı ile ödeme destekleniyor' }, { status: 400 })

    } catch (error) {
        console.error('Payment process error:', error)
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Geçersiz veri', details: error.issues }, { status: 400 })
        }
        return NextResponse.json({ error: 'İşlem hatası' }, { status: 500 })
    }
}
