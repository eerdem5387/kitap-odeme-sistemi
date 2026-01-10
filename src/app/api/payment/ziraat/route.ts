import { NextRequest, NextResponse } from 'next/server'
import { ziraatPaymentService } from '@/lib/ziraat-payment'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const paymentRequestSchema = z.object({
    orderId: z.string().min(1, 'Sipariş ID gereklidir'),
    amount: z.number().positive('Geçerli bir tutar giriniz'),
    customerEmail: z.string().email('Geçerli bir e-posta adresi giriniz'),
    customerName: z.string().min(1, 'Müşteri adı gereklidir'),
    customerPhone: z.string().min(1, 'Telefon numarası gereklidir')
})

export async function POST(request: NextRequest) {
    try {
        console.log('=== ZIRAAT PAYMENT API CALLED ===')

        // Optional Authorization
        const authHeader = request.headers.get('authorization')
        let userIdFromToken: string | null = null
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7)
            const decodedToken = verifyToken(token)
            if (decodedToken) {
                userIdFromToken = decodedToken.userId
            }
        }

        const body = await request.json()
        console.log('Payment request body:', body)

        // Form verilerini doğrula
        const validatedData = paymentRequestSchema.parse(body)

        // Siparişi kontrol et
        const order = await prisma.order.findUnique({
            where: { id: validatedData.orderId },
            include: { user: { select: { name: true, email: true, id: true } } }
        })
        if (!order) {
            return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 })
        }

        // Sahiplik kontrolü: token varsa userId eşleşmeli; yoksa email eşleşmeli
        if (userIdFromToken) {
            if (order.userId !== userIdFromToken) {
                return NextResponse.json({ error: 'Bu siparişe erişim yetkiniz yok' }, { status: 403 })
            }
        } else {
            if (order.user.email.toLowerCase() !== validatedData.customerEmail.toLowerCase()) {
                return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 })
            }
        }

        if (order.paymentStatus === 'COMPLETED') {
            return NextResponse.json({ error: 'Bu sipariş zaten ödenmiş' }, { status: 400 })
        }

        // Request'ten base URL al
        const host = request.headers.get('host') || ''
        const protocol = request.headers.get('x-forwarded-proto') || 
                       (host.includes('localhost') ? 'http' : 'https')
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`
        
        const paymentRequest = {
            amount: validatedData.amount,
            orderId: validatedData.orderId,
            orderNumber: order.orderNumber,
            customerEmail: validatedData.customerEmail,
            customerName: validatedData.customerName,
            customerPhone: validatedData.customerPhone,
            successUrl: `${baseUrl}/api/payment/ziraat/callback`,
            failUrl: `${baseUrl}/api/payment/ziraat/callback`
        }

        const paymentResponse = await ziraatPaymentService.createPaymentRequest(paymentRequest)

        if (paymentResponse.success && paymentResponse.redirectUrl) {
            await prisma.order.update({
                where: { id: validatedData.orderId },
                data: { paymentStatus: 'PENDING', notes: 'Ziraat Bankası ödeme sayfasına yönlendirildi' }
            })

            return NextResponse.json({
                success: true,
                redirectUrl: paymentResponse.redirectUrl,
                formParams: paymentResponse.formParams
            })
        } else {
            return NextResponse.json({ success: false, error: paymentResponse.error || 'Ödeme işlemi başlatılamadı' }, { status: 400 })
        }

    } catch (error) {
        console.error('Ziraat payment error:', error)
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Geçersiz veri formatı', details: error.issues }, { status: 400 })
        }
        return NextResponse.json({ error: 'Ödeme işlemi sırasında bir hata oluştu' }, { status: 500 })
    }
}
