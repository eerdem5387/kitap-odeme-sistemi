import { NextRequest, NextResponse } from 'next/server'
import { ziraatPaymentService } from '@/lib/ziraat-payment'
import { requireAdmin, handleApiError } from '@/lib/error-handler'

export async function POST(request: NextRequest) {
    try {
        // Admin yetkisi kontrolü
        const authHeader = request.headers.get('authorization')
        requireAdmin(authHeader)

        console.log('=== TEST ZIRAAT API CALLED ===')

        // Ziraat servisini başlat (DB'den ayarları çeker)
        const initialized = await ziraatPaymentService.initialize()
        if (!initialized) {
            return NextResponse.json({
                success: false,
                error: 'Ziraat ayarları eksik veya yüklenemedi. Lütfen ayarlardan bilgileri kontrol edin.'
            }, { status: 400 })
        }

        // Sembolik bir test siparişi oluştur
        const testOrderId = `TEST-${Date.now()}`
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com'

        // Ödeme isteği oluşturmayı dene (Hash algoritması ve ayarlar doğru mu?)
        const response = await ziraatPaymentService.createPaymentRequest({
            amount: 1.00, // 1 TL'lik test
            orderId: testOrderId,
            successUrl: `${baseUrl}/api/payment/ziraat/callback`,
            failUrl: `${baseUrl}/api/payment/ziraat/callback`,
            installments: '0',
            // Test verileri
            // customerEmail, name vs. gerekirse servise eklenebilir, 
            // şu anki implementasyonumuzda createPaymentRequest bunları parametre olarak alıyor mu kontrol edelim.
            // createPaymentRequest metodumuz parametre olarak sadece interface'de tanımlı alanları alıyor.
        })

        if (response.success && response.redirectUrl && response.formParams) {
            // Hash başarıyla üretildi ve form parametreleri hazırlandı.
            // Bu aşamada credentials (merchantId, storeKey) doğru formatta demektir.
            return NextResponse.json({
                success: true,
                message: 'Ziraat POS konfigürasyonu başarılı! Hash üretildi ve form parametreleri hazır.',
                debug: {
                    redirectUrl: response.redirectUrl,
                    params: response.formParams
                }
            }, { status: 200 })
        } else {
            return NextResponse.json({
                success: false,
                error: response.error || 'Test başarısız. Hash üretilemedi.'
            }, { status: 400 })
        }

    } catch (error) {
        console.error('Ziraat Test Error:', error)
        return handleApiError(error)
    }
}
