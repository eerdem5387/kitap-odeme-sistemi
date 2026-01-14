import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, handleApiError } from '@/lib/error-handler'

export async function GET(request: NextRequest) {
    try {
        // Admin yetkisi kontrolü
        const authHeader = request.headers.get('authorization')
        requireAdmin(authHeader)

        const attributes = await prisma.productAttribute.findMany({
            include: {
                values: {
                    orderBy: {
                        value: 'asc'
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        })

        return NextResponse.json(attributes)
    } catch (error) {
        return handleApiError(error)
    }
}

export async function POST(request: NextRequest) {
    try {
        // Admin yetkisi kontrolü
        const authHeader = request.headers.get('authorization')
        requireAdmin(authHeader)

        const body = await request.json()
        const { name, type = 'SELECT' } = body

        if (!name || name.trim() === '') {
            return NextResponse.json(
                { error: 'Attribute adı gereklidir' },
                { status: 400 }
            )
        }

        // Mevcut attribute'u kontrol et
        const existing = await prisma.productAttribute.findUnique({
            where: { name: name.trim() }
        })

        if (existing) {
            return NextResponse.json(existing)
        }

        // Yeni attribute oluştur
        const attribute = await prisma.productAttribute.create({
            data: {
                name: name.trim(),
                type: type as 'SELECT' | 'RADIO' | 'CHECKBOX'
            },
            include: {
                values: true
            }
        })

        return NextResponse.json(attribute, { status: 201 })
    } catch (error) {
        return handleApiError(error)
    }
}

