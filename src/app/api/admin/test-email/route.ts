import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/lib/email'
import { requireAdmin, handleApiError } from '@/lib/error-handler'
import { z } from 'zod'

const testEmailSchema = z.object({
    to: z.string().email('Geçerli bir e-posta adresi giriniz')
})

export async function POST(request: NextRequest) {
    try {
        // Admin yetkisi kontrolü
        const authHeader = request.headers.get('authorization')
        requireAdmin(authHeader)

        console.log('=== TEST EMAIL API CALLED ===')

        const body = await request.json()
        console.log('Test email data:', body)

        // Form verilerini doğrula
        const { to } = testEmailSchema.parse(body)

        const subject = 'E-posta Ayarları Test'
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">E-posta Ayarları Test</h2>
                <p>Merhaba,</p>
                <p>Bu e-posta, e-posta ayarlarınızın doğru çalıştığını test etmek için gönderilmiştir.</p>
                
                <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3>Test Bilgileri</h3>
                    <p><strong>Gönderim Tarihi:</strong> ${new Date().toLocaleString('tr-TR')}</p>
                    <p><strong>Alıcı:</strong> ${to}</p>
                    <p><strong>Durum:</strong> ✅ Başarılı</p>
                </div>

                <p>E-posta ayarlarınız doğru çalışıyor! Artık sipariş bildirimleri ve diğer e-postalar gönderilebilir.</p>
                
                <p>Teşekkürler,<br>E-Ticaret Sistemi</p>
            </div>
        `

        const success = await emailService.sendEmail({
            to,
            subject,
            html
        })

        if (!success) {
            throw new Error('E-posta gönderilemedi')
        }

        return NextResponse.json({
            message: 'Test e-postası başarıyla gönderildi'
        }, { status: 200 })

    } catch (error) {
        return handleApiError(error)
    }
}
