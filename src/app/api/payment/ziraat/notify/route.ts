import { NextRequest } from 'next/server'
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

/**
 * NestPay sunucudan sunucuya bildirim.
 * Tahsilat bankada bitmiş olsa bile tarayıcı kapanırsa sonuç buraya gelir.
 * Banka, cevap gövdesi tam olarak "Approved" olana kadar yaklaşık 5 dakikada bir yeniden gönderir.
 * "APPROVED" veya "FAILED" kabul edilmez; kalıcı yazım yapılmadan Approved dönülmez.
 */
async function handleNotify(request: NextRequest) {
    const baseUrl = getBaseUrl(request)
    const data = await readCallbackData(request)
    const result = await processZiraatCallback(data, baseUrl)
    return result.acknowledge ? nestpayAckResponse() : nestpayRetryResponse()
}

export async function POST(request: NextRequest) {
    try {
        return await handleNotify(request)
    } catch (error) {
        console.error('Ziraat notify POST error:', error)
        return nestpayRetryResponse()
    }
}

export async function GET(request: NextRequest) {
    try {
        return await handleNotify(request)
    } catch (error) {
        console.error('Ziraat notify GET error:', error)
        return nestpayRetryResponse()
    }
}
