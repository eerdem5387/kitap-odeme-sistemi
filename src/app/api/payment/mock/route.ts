import { NextRequest, NextResponse } from 'next/server'
import { mockPaymentService } from '@/lib/mock-payment'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const paymentRequestSchema = z.object({
  orderId: z.string().min(1, 'Sipariş ID gereklidir'),
  amount: z.number().min(0, 'Geçerli bir tutar giriniz'),
  customerEmail: z.string().email('Geçerli bir e-posta adresi giriniz'),
  customerName: z.string().min(1, 'Müşteri adı gereklidir'),
  customerPhone: z.string().min(1, 'Telefon numarası gereklidir')
})

export async function POST(request: NextRequest) {
  try {
    console.log('=== MOCK PAYMENT API CALLED ===')

    // Optional Authorization (guest supported)
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
    console.log('Mock payment request body:', body)

    // Form verilerini doğrula
    const validatedData = paymentRequestSchema.parse(body)

    // Siparişi kontrol et
    const order = await prisma.order.findUnique({
      where: { id: validatedData.orderId },
      include: { user: { select: { id: true, email: true } } }
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

    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || ''
    // Mock ödeme isteği oluştur
    const paymentRequest = {
      amount: validatedData.amount,
      orderId: validatedData.orderId,
      orderNumber: order.orderNumber,
      customerEmail: validatedData.customerEmail,
      customerName: validatedData.customerName,
      customerPhone: validatedData.customerPhone,
      successUrl: `${baseUrl}/payment/success?orderId=${validatedData.orderId}`,
      failUrl: `${baseUrl}/payment/fail?orderId=${validatedData.orderId}`
    }

    const paymentResponse = await mockPaymentService.createPaymentRequest(paymentRequest)

    if (paymentResponse.success && paymentResponse.redirectUrl) {
      await prisma.order.update({
        where: { id: validatedData.orderId },
        data: {
          paymentStatus: 'PENDING',
          notes: 'Mock ödeme sayfasına yönlendirildi'
        }
      })

      return NextResponse.json({
        success: true,
        redirectUrl: paymentResponse.redirectUrl,
        transactionId: paymentResponse.transactionId
      })
    } else {
      return NextResponse.json({ success: false, error: paymentResponse.error || 'Mock ödeme işlemi başlatılamadı' }, { status: 400 })
    }

  } catch (error) {
    console.error('Mock payment error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Geçersiz veri formatı', details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Mock ödeme işlemi sırasında bir hata oluştu' }, { status: 500 })
  }
}
