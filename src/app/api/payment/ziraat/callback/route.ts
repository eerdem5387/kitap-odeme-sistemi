import { NextRequest, NextResponse } from 'next/server'
import { parseCallbackBody, processZiraatCallback } from '@/lib/ziraat-callback-handler'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

function getBaseUrl(request: NextRequest): string {
    if (process.env.NEXT_PUBLIC_BASE_URL) {
        return process.env.NEXT_PUBLIC_BASE_URL
    }
    const host = request.headers.get('host') || ''
    const protocol = request.headers.get('x-forwarded-proto') ||
        (host.includes('localhost') ? 'http' : 'https')
    return `${protocol}://${host}`
}

function isLikelyBrowser(request: NextRequest): boolean {
    const accept = (request.headers.get('accept') || '').toLowerCase()
    const ua = (request.headers.get('user-agent') || '').toLowerCase()
    if (accept.includes('text/html')) return true
    if (ua.includes('mozilla') || ua.includes('chrome') || ua.includes('safari') || ua.includes('mobile')) {
        return true
    }
    return false
}

async function respond(request: NextRequest, data: Record<string, string>) {
    const baseUrl = getBaseUrl(request)
    const result = await processZiraatCallback(data, baseUrl)

    // Banka sunucu bildirimi yanlışlıkla bu URL'e gelirse redirect yerine APPROVED dön
    if (!isLikelyBrowser(request)) {
        return new NextResponse(result.success ? 'APPROVED' : 'FAILED', {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-store'
            }
        })
    }

    const response = NextResponse.redirect(result.redirectUrl, 303)
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    return response
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        return await respond(request, parseCallbackBody(formData))
    } catch (error) {
        console.error('Ziraat POST Callback Error:', error)
        const baseUrl = getBaseUrl(request)
        const response = NextResponse.redirect(`${baseUrl}/payment/fail?error=SistemHatasi`, 303)
        response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
        return response
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        return await respond(request, parseCallbackBody(searchParams))
    } catch (error) {
        console.error('Ziraat GET Callback Error:', error)
        const baseUrl = getBaseUrl(request)
        const response = NextResponse.redirect(`${baseUrl}/payment/fail?error=SistemHatasi`, 303)
        response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
        return response
    }
}
