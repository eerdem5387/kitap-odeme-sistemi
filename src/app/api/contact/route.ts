import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { emailService } from '@/lib/email'

const contactFormSchema = z.object({
    name: z.string().min(1, 'Ad soyad gereklidir'),
    email: z.string().email('Geçerli bir e-posta adresi giriniz'),
    phone: z.string().optional(),
    subject: z.string().min(1, 'Konu gereklidir'),
    message: z.string().min(10, 'Mesaj en az 10 karakter olmalıdır')
})

export async function POST(request: NextRequest) {
    try {
        console.log('=== CONTACT FORM API CALLED ===')

        const body = await request.json()
        console.log('Contact form data:', body)

        // Form verilerini doğrula
        const validatedData = contactFormSchema.parse(body)

        // E-posta bildirimi gönder
        try {
            await emailService.sendContactFormNotification(validatedData)
        } catch (emailError) {
            console.error('E-posta gönderilirken hata:', emailError)
            // E-posta hatası form gönderimini etkilemesin
        }

        return NextResponse.json({
            message: 'Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.'
        }, { status: 200 })

    } catch (error) {
        console.error('Error processing contact form:', error)

        if (error instanceof z.ZodError) {
            return NextResponse.json({
                error: 'Form verileri geçersiz',
                details: error.issues
            }, { status: 400 })
        }

        return NextResponse.json({
            error: 'Mesaj gönderilirken bir hata oluştu'
        }, { status: 500 })
    }
}
