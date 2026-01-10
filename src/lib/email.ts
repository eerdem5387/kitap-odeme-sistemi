import nodemailer from 'nodemailer'
import { prisma } from './prisma'

interface EmailSettings {
  smtpHost: string
  smtpPort: string
  smtpUser: string
  smtpPassword: string
  fromName: string
  fromEmail: string
}

interface EmailData {
  to: string
  subject: string
  html: string
  text?: string
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null
  private settings: EmailSettings | null = null

  async initialize() {
    try {
      // E-posta ayarlarını veritabanından al
      const emailSettings = await prisma.settings.findMany({
        where: {
          category: 'email'
        }
      })

      if (emailSettings.length === 0) {
        console.warn('E-posta ayarları bulunamadı')
        return false
      }

      // Ayarları düzenle
      const settings: EmailSettings = {
        smtpHost: '',
        smtpPort: '',
        smtpUser: '',
        smtpPassword: '',
        fromName: '',
        fromEmail: ''
      }

      emailSettings.forEach(setting => {
        const key = setting.key.split('.')[1] as keyof EmailSettings
        if (key in settings) {
          settings[key] = setting.value
        }
      })

      // Gerekli ayarların varlığını kontrol et
      if (!settings.smtpHost || !settings.smtpPort || !settings.smtpUser || !settings.smtpPassword) {
        console.warn('E-posta ayarları eksik')
        return false
      }

      this.settings = settings

      // Transporter oluştur
      this.transporter = nodemailer.createTransport({
        host: settings.smtpHost,
        port: parseInt(settings.smtpPort),
        secure: parseInt(settings.smtpPort) === 465, // true for 465, false for other ports
        auth: {
          user: settings.smtpUser,
          pass: settings.smtpPassword,
        },
      })

      // Bağlantıyı test et
      if (this.transporter) {
        await this.transporter.verify()
      }
      console.log('E-posta servisi başarıyla başlatıldı')
      return true
    } catch (error) {
      console.error('E-posta servisi başlatılamadı:', error)
      return false
    }
  }

  async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      if (!this.transporter || !this.settings) {
        const initialized = await this.initialize()
        if (!initialized) {
          throw new Error('E-posta servisi başlatılamadı')
        }
      }

      const mailOptions = {
        from: `"${this.settings!.fromName}" <${this.settings!.fromEmail}>`,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text || this.htmlToText(emailData.html)
      }

      const result = await this.transporter!.sendMail(mailOptions)
      console.log('E-posta başarıyla gönderildi:', result.messageId)
      return true
    } catch (error) {
      console.error('E-posta gönderilirken hata:', error)
      return false
    }
  }

  private htmlToText(html: string): string {
    // Basit HTML to text dönüşümü
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim()
  }

  // Sipariş oluşturuldu bildirimi
  async sendOrderConfirmation(order: any, customerEmail: string): Promise<boolean> {
    const subject = `Siparişiniz Alındı - #${order.orderNumber}`
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Siparişiniz Alındı!</h2>
        <p>Merhaba,</p>
        <p>Siparişiniz başarıyla alındı. Sipariş detayları aşağıdadır:</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Sipariş Bilgileri</h3>
          <p><strong>Sipariş No:</strong> ${order.orderNumber}</p>
          <p><strong>Tarih:</strong> ${new Date(order.createdAt).toLocaleDateString('tr-TR')}</p>
          <p><strong>Toplam Tutar:</strong> ₺${Number(order.finalAmount).toLocaleString('tr-TR')}</p>
        </div>

        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Sipariş Kalemleri</h3>
          ${order.items.map((item: any) => `
            <div style="border-bottom: 1px solid #e2e8f0; padding: 10px 0;">
              <p><strong>${item.product.name}</strong></p>
              <p>Adet: ${item.quantity}</p>
              <p>Fiyat: ₺${Number(item.unitPrice).toLocaleString('tr-TR')}</p>
              ${item.variation && item.variation.attributes && item.variation.attributes.length > 0 ? 
                `<p>Seçilen Özellikler: ${item.variation.attributes.map((attr: any) => 
                  `${attr.attributeValue.attribute.name}: ${attr.attributeValue.value}`
                ).join(', ')}</p>` : ''
              }
            </div>
          `).join('')}
        </div>

        <p>Siparişinizin durumunu takip etmek için <a href="${process.env.NEXTAUTH_URL}/orders/${order.id}" style="color: #2563eb;">buraya tıklayın</a>.</p>
        
        <p>Teşekkürler,<br>${this.settings?.fromName || 'Levent Kolej Ürün Hizmeti'}</p>
      </div>
    `

    return this.sendEmail({
      to: customerEmail,
      subject,
      html
    })
  }

  // Admin'e yeni sipariş bildirimi
  async sendOrderNotificationToAdmin(order: any): Promise<boolean> {
    // Admin e-posta adresini al
    const generalSettings = await prisma.settings.findFirst({
      where: { key: 'general.contactEmail' }
    })

    if (!generalSettings?.value) {
      console.warn('Admin e-posta adresi bulunamadı')
      return false
    }

    const subject = `Yeni Sipariş - #${order.orderNumber}`
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Yeni Sipariş!</h2>
        <p>Yeni bir sipariş alındı. Sipariş detayları aşağıdadır:</p>
        
        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Sipariş Bilgileri</h3>
          <p><strong>Sipariş No:</strong> ${order.orderNumber}</p>
          <p><strong>Müşteri:</strong> ${order.user.name} (${order.user.email})</p>
          <p><strong>Tarih:</strong> ${new Date(order.createdAt).toLocaleDateString('tr-TR')}</p>
          <p><strong>Toplam Tutar:</strong> ₺${Number(order.finalAmount).toLocaleString('tr-TR')}</p>
        </div>

        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Sipariş Kalemleri</h3>
          ${order.items.map((item: any) => `
            <div style="border-bottom: 1px solid #fecaca; padding: 10px 0;">
              <p><strong>${item.product.name}</strong></p>
              <p>Adet: ${item.quantity}</p>
              <p>Fiyat: ₺${Number(item.unitPrice).toLocaleString('tr-TR')}</p>
              ${item.variation && item.variation.attributes && item.variation.attributes.length > 0 ? 
                `<p>Seçilen Özellikler: ${item.variation.attributes.map((attr: any) => 
                  `${attr.attributeValue.attribute.name}: ${attr.attributeValue.value}`
                ).join(', ')}</p>` : ''
              }
            </div>
          `).join('')}
        </div>

        <p>Siparişi yönetmek için <a href="${process.env.NEXTAUTH_URL}/admin/orders/${order.id}" style="color: #dc2626;">admin paneline gidin</a>.</p>
      </div>
    `

    return this.sendEmail({
      to: generalSettings.value,
      subject,
      html
    })
  }

  // Sipariş durumu güncellendi bildirimi
  async sendOrderStatusUpdate(order: any, customerEmail: string, newStatus: string): Promise<boolean> {
    const statusTexts: Record<string, string> = {
      'CONFIRMED': 'Onaylandı',
      'SHIPPED': 'Kargoya Verildi',
      'DELIVERED': 'Teslim Edildi',
      'CANCELLED': 'İptal Edildi'
    }

    const status = statusTexts[newStatus] || newStatus
    const subject = `Sipariş Durumu Güncellendi - #${order.orderNumber}`
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Sipariş Durumu Güncellendi</h2>
        <p>Merhaba,</p>
        <p>Siparişinizin durumu güncellendi:</p>
        
        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Sipariş Bilgileri</h3>
          <p><strong>Sipariş No:</strong> ${order.orderNumber}</p>
          <p><strong>Yeni Durum:</strong> <span style="color: #2563eb; font-weight: bold;">${status}</span></p>
          <p><strong>Güncelleme Tarihi:</strong> ${new Date().toLocaleDateString('tr-TR')}</p>
        </div>

        <p>Siparişinizin detaylarını görmek için <a href="${process.env.NEXTAUTH_URL}/orders/${order.id}" style="color: #2563eb;">buraya tıklayın</a>.</p>
        
        <p>Teşekkürler,<br>${this.settings?.fromName || 'Levent Kolej Ürün Hizmeti'}</p>
      </div>
    `

    return this.sendEmail({
      to: customerEmail,
      subject,
      html
    })
  }

  // İletişim formu bildirimi
  async sendContactFormNotification(formData: any): Promise<boolean> {
    const generalSettings = await prisma.settings.findFirst({
      where: { key: 'general.contactEmail' }
    })

    if (!generalSettings?.value) {
      console.warn('Admin e-posta adresi bulunamadı')
      return false
    }

    const subject = `Yeni İletişim Formu - ${formData.name}`
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Yeni İletişim Formu</h2>
        <p>Yeni bir iletişim formu gönderildi:</p>
        
        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Form Bilgileri</h3>
          <p><strong>Ad Soyad:</strong> ${formData.name}</p>
          <p><strong>E-posta:</strong> ${formData.email}</p>
          <p><strong>Telefon:</strong> ${formData.phone || 'Belirtilmemiş'}</p>
          <p><strong>Konu:</strong> ${formData.subject}</p>
          <p><strong>Mesaj:</strong></p>
          <div style="background: white; padding: 15px; border-radius: 4px; margin-top: 10px;">
            ${formData.message.replace(/\n/g, '<br>')}
          </div>
        </div>

        <p>Bu mesaja yanıt vermek için: <a href="mailto:${formData.email}" style="color: #dc2626;">${formData.email}</a></p>
      </div>
    `

    return this.sendEmail({
      to: generalSettings.value,
      subject,
      html
    })
  }
}

export const emailService = new EmailService()
