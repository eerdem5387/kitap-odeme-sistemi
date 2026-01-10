import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, handleApiError } from '@/lib/error-handler'

export async function GET() {
    try {
        const categories = await prisma.category.findMany({
            include: {
                _count: {
                    select: { products: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(categories)
    } catch (error) {
        console.error('Error fetching categories:', error)
        return NextResponse.json(
            { error: 'Kategoriler getirilemedi' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        // Admin yetkisi kontrolü
        const authHeader = request.headers.get('authorization')
        requireAdmin(authHeader)

        const body = await request.json()
        const { name, slug, description, isActive = true, isPopular = false } = body

        if (!name) {
            return NextResponse.json(
                { error: 'Kategori adı gereklidir' },
                { status: 400 }
            )
        }

        // Slug yoksa otomatik oluştur
        let finalSlug = slug
        if (!finalSlug) {
            finalSlug = name
                .toLowerCase()
                .replace(/ğ/g, 'g')
                .replace(/ü/g, 'u')
                .replace(/ş/g, 's')
                .replace(/ı/g, 'i')
                .replace(/ö/g, 'o')
                .replace(/ç/g, 'c')
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim()
        }

        const category = await prisma.category.create({
            data: {
                name,
                slug: finalSlug,
                description: description || null,
                isActive,
                isPopular
            }
        })

        return NextResponse.json(category, { status: 201 })
    } catch (error) {
        return handleApiError(error)
    }
} 