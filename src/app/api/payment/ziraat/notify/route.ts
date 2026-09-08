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

/**
 * NestPay server-to-server bildirimi.
 * Banka buraya POST atar; 303 redirect değil, düz metin APPROVED/FAILED bekler.
 * Tarayıcı dönüşü /api/payment/ziraat/callback üzerinden yapılır.
 */
async function handleNotify(data: Record<string, string>, baseUrl: string) {
    const result = await processZiraatCallback(data, baseUrl)
    return new NextResponse(result.success ? 'APPROVED' : 'FAILED', {
        status: 200,
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store'
        }
    })
}

export async function POST(request: NextRequest) {
    try {
        const baseUrl = getBaseUrl(request)
        const formData = await request.formData()
        return await handleNotify(parseCallbackBody(formData), baseUrl)
    } catch (error) {
        console.error('Ziraat notify POST error:', error)
        return new NextResponse('FAILED', {
            status: 200,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        })
    }
}

export async function GET(request: NextRequest) {
    try {
        const baseUrl = getBaseUrl(request)
        const { searchParams } = new URL(request.url)
        return await handleNotify(parseCallbackBody(searchParams), baseUrl)
    } catch (error) {
        console.error('Ziraat notify GET error:', error)
        return new NextResponse('FAILED', {
            status: 200,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        })
    }
}
