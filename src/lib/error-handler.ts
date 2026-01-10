import { NextResponse } from 'next/server'
import { z } from 'zod'

export interface ApiError {
    status: number
    message: string
    code?: string
    details?: any
}

export class AppError extends Error {
    public status: number
    public code?: string
    public details?: any

    constructor(message: string, status: number = 500, code?: string, details?: any) {
        super(message)
        this.status = status
        this.code = code
        this.details = details
        this.name = 'AppError'
    }
}

export class ValidationError extends AppError {
    constructor(message: string, details?: any) {
        super(message, 400, 'VALIDATION_ERROR', details)
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = 'Kaynak bulunamadı') {
        super(message, 404, 'NOT_FOUND')
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = 'Yetkilendirme gerekli') {
        super(message, 401, 'UNAUTHORIZED')
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = 'Bu işlem için yetkiniz yok') {
        super(message, 403, 'FORBIDDEN')
    }
}

export class ConflictError extends AppError {
    constructor(message: string = 'Çakışma hatası') {
        super(message, 409, 'CONFLICT')
    }
}

export class RateLimitError extends AppError {
    constructor(message: string = 'Çok fazla istek gönderildi') {
        super(message, 429, 'RATE_LIMIT')
    }
}

export class DatabaseError extends AppError {
    constructor(message: string = 'Veritabanı hatası') {
        super(message, 500, 'DATABASE_ERROR')
    }
}

export function handleApiError(error: unknown): NextResponse {
    console.error('API Error:', error)

    // AppError instances
    if (error instanceof AppError) {
        return NextResponse.json(
            {
                error: error.message,
                code: error.code,
                details: error.details
            },
            { status: error.status }
        )
    }

    // Zod validation errors
    if (error instanceof z.ZodError) {
        return NextResponse.json(
            {
                error: 'Geçersiz veri formatı',
                code: 'VALIDATION_ERROR',
                details: error.issues
            },
            { status: 400 }
        )
    }

    // Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
        const prismaError = error as any

        switch (prismaError.code) {
            case 'P2002':
                return NextResponse.json(
                    {
                        error: 'Bu kayıt zaten mevcut',
                        code: 'DUPLICATE_ENTRY'
                    },
                    { status: 409 }
                )
            case 'P2025':
                return NextResponse.json(
                    {
                        error: 'Kayıt bulunamadı',
                        code: 'NOT_FOUND'
                    },
                    { status: 404 }
                )
            case 'P2003':
                return NextResponse.json(
                    {
                        error: 'Geçersiz referans',
                        code: 'INVALID_REFERENCE'
                    },
                    { status: 400 }
                )
            case 'P2014':
                return NextResponse.json(
                    {
                        error: 'İlişki ihlali',
                        code: 'RELATION_VIOLATION'
                    },
                    { status: 400 }
                )
            default:
                return NextResponse.json(
                    {
                        error: 'Veritabanı hatası',
                        code: 'DATABASE_ERROR'
                    },
                    { status: 500 }
                )
        }
    }

    // JSON parsing errors
    if (error instanceof SyntaxError && 'body' in error) {
        return NextResponse.json(
            {
                error: 'Geçersiz JSON formatı',
                code: 'INVALID_JSON'
            },
            { status: 400 }
        )
    }

    // Generic error
    return NextResponse.json(
        {
            error: 'Sunucu hatası',
            code: 'INTERNAL_SERVER_ERROR'
        },
        { status: 500 }
    )
}

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
    try {
        return schema.parse(data)
    } catch (error) {
        if (error instanceof z.ZodError) {
            throw new ValidationError('Geçersiz veri formatı', error.issues)
        }
        throw error
    }
}

export function requireAuth(authHeader: string | null): { userId: string; email: string; role: string } {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('Yetkilendirme token\'ı gerekli')
    }

    const token = authHeader.substring(7)

    if (!token) {
        throw new UnauthorizedError('Token bulunamadı')
    }

    // JWT token'ı doğrula
    const { verifyToken } = require('./auth')
    const decoded = verifyToken(token)

    if (!decoded || !decoded.userId || !decoded.email || !decoded.role) {
        throw new UnauthorizedError('Geçersiz token')
    }

    return {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
    }
}

export function requireAdmin(authHeader: string | null): { userId: string; email: string; role: string } {
    const user = requireAuth(authHeader)

    if (user.role !== 'ADMIN') {
        throw new ForbiddenError('Admin yetkisi gerekli')
    }

    return user
}

export function handleAsync<T>(
    handler: () => Promise<T>
): Promise<NextResponse> {
    return handler()
        .then((result) => NextResponse.json(result))
        .catch(handleApiError)
}
