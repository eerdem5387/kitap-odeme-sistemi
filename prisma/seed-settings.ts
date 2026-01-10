import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const defaultSettings = [
    // Genel ayarlar
    { key: 'general.siteName', value: 'E-Ticaret Sitesi', type: 'string', category: 'general' },
    { key: 'general.siteDescription', value: 'Modern ve güvenilir e-ticaret deneyimi', type: 'string', category: 'general' },
    { key: 'general.contactEmail', value: 'info@example.com', type: 'string', category: 'general' },
    { key: 'general.contactPhone', value: '+90 XXX XXX XX XX', type: 'string', category: 'general' },
    { key: 'general.address', value: 'İstanbul, Türkiye', type: 'string', category: 'general' },

    // E-posta ayarları
    { key: 'email.smtpHost', value: 'smtp.gmail.com', type: 'string', category: 'email' },
    { key: 'email.smtpPort', value: '587', type: 'string', category: 'email' },
    { key: 'email.smtpUser', value: 'noreply@example.com', type: 'string', category: 'email' },
    { key: 'email.smtpPassword', value: '********', type: 'string', category: 'email' },
    { key: 'email.fromName', value: 'E-Ticaret Sitesi', type: 'string', category: 'email' },
    { key: 'email.fromEmail', value: 'noreply@example.com', type: 'string', category: 'email' },

    // Ödeme ayarları
    { key: 'payment.stripeEnabled', value: 'true', type: 'boolean', category: 'payment' },
    { key: 'payment.stripePublishableKey', value: 'pk_test_...', type: 'string', category: 'payment' },
    { key: 'payment.stripeSecretKey', value: 'sk_test_...', type: 'string', category: 'payment' },
    { key: 'payment.paypalEnabled', value: 'false', type: 'boolean', category: 'payment' },
    { key: 'payment.paypalClientId', value: '', type: 'string', category: 'payment' },
    { key: 'payment.paypalSecret', value: '', type: 'string', category: 'payment' },

    // Kargo ayarları
    { key: 'shipping.freeShippingThreshold', value: '500', type: 'number', category: 'shipping' },
    { key: 'shipping.defaultShippingCost', value: '29.99', type: 'number', category: 'shipping' },
    { key: 'shipping.maxShippingDays', value: '7', type: 'number', category: 'shipping' },
    { key: 'shipping.allowPickup', value: 'true', type: 'boolean', category: 'shipping' },

    // Güvenlik ayarları
    { key: 'security.sessionTimeout', value: '3600', type: 'number', category: 'security' },
    { key: 'security.maxLoginAttempts', value: '5', type: 'number', category: 'security' },
    { key: 'security.requireTwoFactor', value: 'false', type: 'boolean', category: 'security' }
]

async function main() {
    console.log('Varsayılan ayarlar ekleniyor...')

    for (const setting of defaultSettings) {
        await prisma.settings.upsert({
            where: { key: setting.key },
            update: {
                value: setting.value,
                type: setting.type,
                category: setting.category
            },
            create: {
                key: setting.key,
                value: setting.value,
                type: setting.type,
                category: setting.category
            }
        })
    }

    console.log('Varsayılan ayarlar başarıyla eklendi!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    }) 