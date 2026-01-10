import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import sharp from 'sharp'
import { verifyToken } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

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

        // Dosya boyutunu kontrol et (10MB limit)
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
        // - Kalite: %80
        let compressedBuffer: Buffer
        try {
            compressedBuffer = await sharp(inputBuffer)
                .resize({
                    width: 1200,
                    height: 1200,
                    fit: 'inside',
                    withoutEnlargement: true,
                })
                .webp({ quality: 80 })
                .toBuffer()
        } catch (sharpError: any) {
            console.error('Sharp processing error:', sharpError)
            // Sharp hatası durumunda orijinal buffer'ı kullan
            compressedBuffer = inputBuffer
        }

        // Dosya adını oluştur
        const timestamp = Date.now()
        const fileName = `products/${timestamp}.webp`

        // Önce Vercel Blob'u dene, başarısız olursa local storage'a kaydet
        let imageUrl: string
        let finalFileName: string

        try {
            // Vercel Blob'a yükle
            const blob = await put(fileName, compressedBuffer, {
                access: 'public',
                addRandomSuffix: false,
                contentType: 'image/webp',
            })
            imageUrl = blob.url
            finalFileName = fileName
        } catch (blobError: any) {
            console.error('Vercel Blob error:', blobError)
            
            // Fallback: Local storage (public/uploads klasörüne kaydet)
            const uploadsDir = join(process.cwd(), 'public', 'uploads', 'products')
            
            // Klasör yoksa oluştur
            if (!existsSync(uploadsDir)) {
                await mkdir(uploadsDir, { recursive: true })
            }

            // Dosyayı kaydet
            const filePath = join(uploadsDir, `${timestamp}.webp`)
            await writeFile(filePath, compressedBuffer)

            // URL oluştur
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
            imageUrl = `${baseUrl}/uploads/products/${timestamp}.webp`
            finalFileName = `uploads/products/${timestamp}.webp`
        }

        return NextResponse.json({
            success: true,
            url: imageUrl,
            fileName: finalFileName
        })

    } catch (error: any) {
        console.error('Error uploading file:', error)
        const errorMessage = error?.message || 'Dosya yüklenirken bir hata oluştu'
        return NextResponse.json(
            { 
                error: errorMessage,
                details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
            },
            { status: 500 }
        )
    }
}
