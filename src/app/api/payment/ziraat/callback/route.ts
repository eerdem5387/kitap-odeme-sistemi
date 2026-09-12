import { NextRequest, NextResponse } from 'next/server'
import {
    nestpayAckResponse,
    nestpayRetryResponse,
    processZiraatCallback,
    readCallbackData
} from '@/lib/ziraat-callback-handler'

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

async function respond(request: NextRequest) {
    const baseUrl = getBaseUrl(request)
    const data = await readCallbackData(request)
    const result = await processZiraatCallback(data, baseUrl)

    // Banka sunucu bildirimi yanlışlıkla bu URL'e gelirse redirect değil, tam "Approved" dön.
    if (!isLikelyBrowser(request)) {
        return result.acknowledge ? nestpayAckResponse() : nestpayRetryResponse()
    }

    const response = NextResponse.redirect(result.redirectUrl, 303)
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    return response
}

export async function POST(request: NextRequest) {
    try {
        return await respond(request)
    } catch (error) {
        console.error('Ziraat POST Callback Error:', error)
        if (!isLikelyBrowser(request)) {
            return nestpayRetryResponse()
        }
        const baseUrl = getBaseUrl(request)
        const response = NextResponse.redirect(`${baseUrl}/payment/fail?error=SistemHatasi`, 303)
        response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
        return response
    }
}

export async function GET(request: NextRequest) {
    try {
        return await respond(request)
    } catch (error) {
        console.error('Ziraat GET Callback Error:', error)
        if (!isLikelyBrowser(request)) {
            return nestpayRetryResponse()
        }
        const baseUrl = getBaseUrl(request)
        const response = NextResponse.redirect(`${baseUrl}/payment/fail?error=SistemHatasi`, 303)
        response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
        return response
    }
}
