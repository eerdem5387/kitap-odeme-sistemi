import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSettingsSchema = z.object({
    settings: z.array(z.object({
        key: z.string(),
        value: z.string(),
        type: z.string().optional(),
        category: z.string().optional()
    }))
})

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const category = searchParams.get('category')

        const where = category ? { category } : {}

        const settings = await prisma.settings.findMany({
            where,
            orderBy: { category: 'asc' }
        }).catch(() => {
            return []
        })

        // Ayarları kategorilere göre grupla
        const groupedSettings = settings.reduce((acc, setting) => {
            if (!acc[setting.category]) {
                acc[setting.category] = {}
            }

            // Key'den kategori ve alan adını çıkar (örn: "general.siteName" -> "siteName")
            const keyParts = setting.key.split('.')
            const fieldName = keyParts.length > 1 ? keyParts[1] : setting.key

            // Değeri tipine göre dönüştür
            let parsedValue: any = setting.value
            if (setting.type === 'number') {
                parsedValue = parseFloat(setting.value)
            } else if (setting.type === 'boolean') {
                parsedValue = setting.value === 'true'
            } else if (setting.type === 'json') {
                try {
                    parsedValue = JSON.parse(setting.value)
                } catch {
                    parsedValue = setting.value
                }
            }

            acc[setting.category][fieldName] = parsedValue
            return acc
        }, {} as Record<string, any>)

        const res = NextResponse.json(groupedSettings)
        // Cache'i devre dışı bırak - ayarlar her zaman güncel olmalı
        res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
        res.headers.set('Pragma', 'no-cache')
        res.headers.set('Expires', '0')
        return res
    } catch (error) {
        return NextResponse.json({ error: 'Ayarlar getirilirken bir hata oluştu' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { settings } = updateSettingsSchema.parse(body)

        if (process.env.NODE_ENV === 'development') {
          console.log('Updating settings:', settings.length, 'items')
        }

        // Mevcut ayarları güncelle veya yeni ayar ekle
        const results = await Promise.all(
            settings.map(async (setting) => {
                const result = await prisma.settings.upsert({
                    where: { key: setting.key },
                    update: {
                        value: setting.value,
                        type: setting.type || 'string',
                        category: setting.category || 'general'
                    },
                    create: {
                        key: setting.key,
                        value: setting.value,
                        type: setting.type || 'string',
                        category: setting.category || 'general'
                    }
                })
                if (process.env.NODE_ENV === 'development') {
                  console.log(`Upserted setting: ${setting.key} = ${setting.value}`)
                }
                return result
            })
        )

        if (process.env.NODE_ENV === 'development') {
          console.log('Settings updated successfully:', results.length, 'items')
        }

        const res = NextResponse.json({
            message: 'Ayarlar başarıyla güncellendi',
            updatedCount: results.length
        })
        // Cache'i devre dışı bırak
        res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
        res.headers.set('Pragma', 'no-cache')
        res.headers.set('Expires', '0')
        return res
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Geçersiz veri formatı', details: (error as any).issues }, { status: 400 })
        }
        return NextResponse.json({ error: 'Ayarlar güncellenirken bir hata oluştu' }, { status: 500 })
    }
} 