import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { comparePassword, generateToken } from '@/lib/auth'
import { z } from 'zod'
import { handleApiError, ValidationError, UnauthorizedError, validateRequest } from '@/lib/error-handler'

const loginSchema = z.object({
    email: z.string().email('Geçerli bir email adresi giriniz'),
    password: z.string().min(1, 'Şifre gereklidir'),
})

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { email, password } = validateRequest(loginSchema, body)

        // Kullanıcıyı bul
        const user = await prisma.user.findUnique({
            where: { email }
        })

        if (!user) {
            throw new UnauthorizedError('Geçersiz email veya şifre')
        }

        // Şifreyi kontrol et
        const isPasswordValid = await comparePassword(password, user.password)

        if (!isPasswordValid) {
            throw new UnauthorizedError('Geçersiz email veya şifre')
        }

        // JWT token oluştur
        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role
        })

        return NextResponse.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            token
        })

    } catch (error) {
        return handleApiError(error)
    }
} 