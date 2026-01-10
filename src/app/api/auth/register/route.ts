import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateToken } from '@/lib/auth'
import { z } from 'zod'

const registerSchema = z.object({
    name: z.string().min(2, 'İsim en az 2 karakter olmalıdır'),
    email: z.string().email('Geçerli bir email adresi giriniz'),
    password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
})

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { name, email, password } = registerSchema.parse(body)

        // Email kontrolü
        const existingUser = await prisma.user.findUnique({
            where: { email }
        })

        if (existingUser) {
            return NextResponse.json(
                { error: 'Bu email adresi zaten kullanılıyor' },
                { status: 400 }
            )
        }

        // Şifreyi hashle
        const hashedPassword = await hashPassword(password)

        // Kullanıcıyı oluştur
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: 'CUSTOMER'
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true
            }
        })

        // JWT token oluştur
        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role
        })

        return NextResponse.json({
            user,
            token
        })

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Geçersiz veri formatı', details: error.issues },
                { status: 400 }
            )
        }

        console.error('Register error:', error)
        return NextResponse.json(
            { error: 'Kayıt işlemi sırasında bir hata oluştu' },
            { status: 500 }
        )
    }
} 