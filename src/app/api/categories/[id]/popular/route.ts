import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, handleApiError } from '@/lib/error-handler'

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Admin yetkisi kontrolü
        const authHeader = request.headers.get('authorization')
        requireAdmin(authHeader)

        const resolvedParams = await params
        const body = await request.json()
        const { isPopular } = body

        const category = await prisma.category.update({
            where: { id: resolvedParams.id },
            data: { isPopular }
        })

        return NextResponse.json({
            message: isPopular ? 'Kategori popüler olarak işaretlendi' : 'Kategori popüler olmaktan çıkarıldı',
            category
        })
    } catch (error) {
        return handleApiError(error)
    }
} 