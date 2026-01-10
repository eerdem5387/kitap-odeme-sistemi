import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Security headers
    const response = NextResponse.next()

    // Basic security headers
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
    response.headers.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains'
    )

    // Content Security Policy
    response.headers.set(
        'Content-Security-Policy',
        [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self'",
            "connect-src 'self'",
            "media-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ].join('; ')
    )

    // Rate limiting for API routes
    if (pathname.startsWith('/api/')) {
        const ip = request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'unknown'

        const now = Date.now()
        const windowMs = 15 * 60 * 1000 // 15 minutes
        const maxRequests = 100

        const key = `rate_limit:${ip}`
        const current = rateLimitStore.get(key)

        if (!current || now > current.resetTime) {
            rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
        } else if (current.count >= maxRequests) {
            return new NextResponse('Too Many Requests', {
                status: 429,
                headers: {
                    'Retry-After': '900', // 15 minutes
                    'X-RateLimit-Limit': maxRequests.toString(),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': current.resetTime.toString()
                }
            })
        } else {
            current.count++
            rateLimitStore.set(key, current)
        }

        response.headers.set('X-RateLimit-Limit', maxRequests.toString())
        response.headers.set('X-RateLimit-Remaining', (maxRequests - (current?.count || 1)).toString())
    }

    return response
}

export const config = {
    matcher: [
        '/api/:path*',
        '/admin/:path*'
    ],
} 