import { NextRequest, NextResponse } from 'next/server'
import { ziraatPaymentService } from '@/lib/ziraat-payment'
import { prisma } from '@/lib/prisma'
import { emailService } from '@/lib/email'

// Helper to get base URL from request
function getBaseUrl(request: NextRequest): string {
    // Önce environment variable'dan kontrol et
    if (process.env.NEXT_PUBLIC_BASE_URL) {
        return process.env.NEXT_PUBLIC_BASE_URL
    }
    
    // Request'ten host bilgisini al
    const host = request.headers.get('host') || ''
    const protocol = request.headers.get('x-forwarded-proto') || 
                     (host.includes('localhost') ? 'http' : 'https')
    
    return `${protocol}://${host}`
}

// Helper to process callback data (works for both POST formData and GET searchParams)
async function handleCallback(data: Record<string, any>, baseUrl: string) {
    console.log('Ziraat Callback Data:', data)

    const result = await ziraatPaymentService.verifyCallback(data)
    const orderId = data["oid"] || data["OID"] || data["OrderId"]

    if (!orderId) {
        return { 
            success: false, 
            redirectUrl: `${baseUrl}/payment/fail?error=SiparisNoBulunamadi` 
        }
    }

    if (result.success) {
        // Ödeme Başarılı - Maksimum hız için kritik işlemleri önce yap
        // Sipariş güncellemesini başlat ama await etme (asenkron devam etsin)
        prisma.order.update({
            where: { id: orderId },
            data: {
                paymentStatus: 'COMPLETED',
                status: 'CONFIRMED',
                notes: `Ziraat POS Onaylandı. AuthCode: ${data.AuthCode}, TransId: ${data.TransId}`
            },
            select: { id: true, user: { select: { email: true } } } // Sadece gerekli alanları seç
        }).then((order) => {
            // Ödeme kaydı ve e-posta gönderimini arka planda yap
            Promise.all([
                // Ödeme kaydı
                prisma.payment.create({
                    data: {
                        orderId: order.id,
                        amount: Number(data.amount || 0),
                        method: 'CREDIT_CARD',
                        status: 'COMPLETED',
                        transactionId: data.TransId || `TX-${Date.now()}`,
                        gatewayResponse: JSON.stringify(data)
                    }
                }).catch((e) => {
                    console.warn('Payment record creation failed (likely duplicate):', e)
                }),
                // E-posta gönderimi - tamamen asenkron
                emailService.sendOrderStatusUpdate(
                    { id: order.id, user: order.user } as any, 
                    order.user.email, 
                    'CONFIRMED'
                ).catch((e) => {
                    console.error('Email send error:', e)
                })
            ]).catch((e) => {
                console.error('Background tasks error:', e)
            })
        }).catch((e) => {
            console.error('Order update error:', e)
        })

        // Hemen redirect yap - hiçbir işlemi beklemeyiz (tümü asenkron)
        return {
            success: true,
            redirectUrl: `${baseUrl}/payment/success?orderId=${orderId}`
        }

    } else {
        // Ödeme Başarısız
        await prisma.order.update({
            where: { id: orderId },
            data: {
                paymentStatus: 'FAILED',
                notes: `Ziraat POS Hatası: ${result.error}`
            }
        })

        try {
            await prisma.payment.create({
                data: {
                    orderId: orderId,
                    amount: Number(data.amount || 0),
                    method: 'CREDIT_CARD',
                    status: 'FAILED',
                    transactionId: data.TransId, // Başarısız işlemde de dönebilir
                    gatewayResponse: JSON.stringify({
                        ...data,
                        error: result.error
                    })
                }
            })
        } catch {}

        return {
            success: false,
            redirectUrl: `${baseUrl}/payment/fail?orderId=${orderId}&error=${encodeURIComponent(result.error || 'OdemeBasarisiz')}`
        }
    }
}

export async function POST(request: NextRequest) {
    try {
        const baseUrl = getBaseUrl(request)
        const formData = await request.formData()
        const data: Record<string, string> = {}
        formData.forEach((value, key) => {
            data[key] = value.toString()
        })

        const result = await handleCallback(data, baseUrl)
        // 303 See Other - hızlı redirect için
        const response = NextResponse.redirect(result.redirectUrl, 303)
        // Cache header'ları ekle - redirect'i hızlandır
        response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
        response.headers.set('Pragma', 'no-cache')
        response.headers.set('Expires', '0')
        return response
    } catch (error) {
        console.error('Ziraat POST Callback Error:', error)
        const baseUrl = getBaseUrl(request)
        const response = NextResponse.redirect(`${baseUrl}/payment/fail?error=SistemHatasi`, 303)
        response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
        return response
    }
}

export async function GET(request: NextRequest) {
    try {
        const baseUrl = getBaseUrl(request)
        const { searchParams } = new URL(request.url)
        const data: Record<string, string> = {}
        searchParams.forEach((value, key) => {
            data[key] = value
        })

        const result = await handleCallback(data, baseUrl)
        // 303 See Other - hızlı redirect için
        const response = NextResponse.redirect(result.redirectUrl, 303)
        // Cache header'ları ekle - redirect'i hızlandır
        response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
        response.headers.set('Pragma', 'no-cache')
        response.headers.set('Expires', '0')
        return response
    } catch (error) {
        console.error('Ziraat GET Callback Error:', error)
        const baseUrl = getBaseUrl(request)
        const response = NextResponse.redirect(`${baseUrl}/payment/fail?error=SistemHatasi`, 303)
        response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
        return response
    }
}
