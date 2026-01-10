import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import sharp from 'sharp'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
    try {
        // Yetkilendirme kontrolü
        const authHeader = request.headers.get('authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Yetkilendirme gerekli' },
                { status: 401 }
            )
        }

        const token = authHeader.substring(7)
        const decoded = verifyToken(token)
        if (!decoded || decoded.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Admin yetkisi gerekli' },
                { status: 403 }
            )
        }

        const data = await request.formData()
        const file: File | null = data.get('file') as unknown as File

        if (!file) {
            return NextResponse.json(
                { error: 'Dosya bulunamadı' },
                { status: 400 }
            )
        }

        // Dosya tipini kontrol et
        if (!file.type.startsWith('image/')) {
            return NextResponse.json(
                { error: 'Sadece görsel dosyaları yüklenebilir' },
                { status: 400 }
            )
        }

        // Dosya boyutunu kontrol et (10MB limit - yüksek boyutluları da kabul edip sıkıştıracağız)
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'Dosya boyutu 10MB\'dan büyük olamaz' },
                { status: 400 }
            )
        }

        // Dosyayı belleğe al
        const arrayBuffer = await file.arrayBuffer()
        const inputBuffer = Buffer.from(arrayBuffer)

        // sharp ile otomatik yeniden boyutlandırma + sıkıştırma
        // - Maksimum 1200x1200
        // - WebP formatı
        // - Kalite: %80 (genelde 80–90 KB civarına düşürür)
        const compressedBuffer = await sharp(inputBuffer)
            .resize({
                width: 1200,
                height: 1200,
                fit: 'inside',
                withoutEnlargement: true,
            })
            .webp({ quality: 80 })
            .toBuffer()

        // Dosya adını oluştur (her zaman webp uzantılı)
        const timestamp = Date.now()
        const fileName = `products/${timestamp}.webp`

        // Vercel Blob'a yükle (sıkıştırılmış buffer'ı gönderiyoruz)
        const blob = await put(fileName, compressedBuffer, {
            access: 'public',
            addRandomSuffix: false,
            contentType: 'image/webp',
        })

        return NextResponse.json({
            success: true,
            url: blob.url,
            fileName: fileName
        })

    } catch (error) {
        console.error('Error uploading file:', error)
        return NextResponse.json(
            { error: 'Dosya yüklenirken bir hata oluştu' },
            { status: 500 }
        )
    }
}
