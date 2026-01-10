import { NextRequest, NextResponse } from 'next/server'
import { mockPaymentService } from '@/lib/mock-payment'
import { requireAdmin, handleApiError } from '@/lib/error-handler'
import { z } from 'zod'

const testMockSchema = z.object({
    amount: z.number().positive('Geçerli bir tutar giriniz'),
    orderId: z.string().min(1, 'Sipariş ID gereklidir')
})

export async function POST(request: NextRequest) {
    try {
        // Admin yetkisi kontrolü
        const authHeader = request.headers.get('authorization')
        requireAdmin(authHeader)

        console.log('=== TEST MOCK API CALLED ===')

        const body = await request.json()
        console.log('Test Mock data:', body)

        // Form verilerini doğrula
        const { amount, orderId } = testMockSchema.parse(body)

        // Mock test ödeme oluştur
        const paymentResponse = await mockPaymentService.createTestPayment(orderId, amount)

        if (paymentResponse.success && paymentResponse.redirectUrl) {
            return NextResponse.json({
                success: true,
                redirectUrl: paymentResponse.redirectUrl,
                transactionId: paymentResponse.transactionId,
                message: 'Mock ödeme test başarılı'
            }, { status: 200 })
        } else {
            return NextResponse.json({
                success: false,
                error: paymentResponse.error || 'Mock test başarısız'
            }, { status: 400 })
        }

    } catch (error) {
        return handleApiError(error)
    }
}
