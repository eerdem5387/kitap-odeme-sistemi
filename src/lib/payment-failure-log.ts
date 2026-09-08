import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

export type PaymentFailureSource =
  | 'ziraat_callback'
  | 'mock_callback'
  | 'system'
  | 'abandoned'

export function extractFailureReason(payload?: Record<string, any> | string | null): {
  reason: string
  errorCode?: string | null
} {
  let data: Record<string, any> = {}

  if (typeof payload === 'string') {
    try {
      data = JSON.parse(payload)
    } catch {
      const trimmed = payload.trim()
      if (trimmed) {
        return { reason: trimmed, errorCode: null }
      }
    }
  } else if (payload && typeof payload === 'object') {
    data = payload
  }

  const errorCode =
    data.ProcReturnCode ||
    data.procreturncode ||
    data.ErrorCode ||
    data.errorCode ||
    data.mdStatus ||
    data.MdStatus ||
    null

  const reason =
    data.ErrMsg ||
    data.errmsg ||
    data.ErrorMessage ||
    data.errorMessage ||
    data.error ||
    data.Error ||
    data.Response ||
    data.response ||
    null

  if (reason && String(reason).trim()) {
    return { reason: String(reason).trim(), errorCode: errorCode ? String(errorCode) : null }
  }

  if (errorCode) {
    return {
      reason: `Banka hata kodu: ${errorCode}`,
      errorCode: String(errorCode)
    }
  }

  return {
    reason: 'Ödeme işlemi başarısız oldu',
    errorCode: null
  }
}

export async function logPaymentFailure(params: {
  orderId: string
  reason: string
  errorCode?: string | null
  source: PaymentFailureSource
  rawPayload?: Record<string, any> | string | null
}) {
  try {
    const id = `pfl_${randomBytes(12).toString('hex')}`
    const rawPayload =
      typeof params.rawPayload === 'string'
        ? params.rawPayload
        : params.rawPayload
          ? JSON.stringify(params.rawPayload)
          : null

    await prisma.$executeRawUnsafe(
      `INSERT INTO payment_failure_logs (id, "orderId", reason, "errorCode", source, "rawPayload", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      id,
      params.orderId,
      params.reason,
      params.errorCode ?? null,
      params.source,
      rawPayload
    )

    return id
  } catch (error) {
    console.error('Payment failure log write error:', error)
    return null
  }
}

export function resolveOrderFailureReason(input: {
  paymentStatus: string
  notes?: string | null
  payments?: Array<{ status: string; gatewayResponse?: string | null }>
  failureLogs?: Array<{ reason: string; errorCode?: string | null; createdAt: Date | string }>
}): string | null {
  if (input.paymentStatus === 'COMPLETED') return null

  if (input.failureLogs && input.failureLogs.length > 0) {
    const latest = [...input.failureLogs].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })[0]
    return latest.reason
  }

  const failedPayment = input.payments?.find((p) => p.status === 'FAILED' && p.gatewayResponse)
  if (failedPayment?.gatewayResponse) {
    return extractFailureReason(failedPayment.gatewayResponse).reason
  }

  if (input.notes) {
    const noteMatch = input.notes.match(/Ziraat POS Hatası:\s*(.+)$/i)
    if (noteMatch?.[1]) return noteMatch[1].trim()
    if (/hata|fail|başarısız|red/i.test(input.notes)) return input.notes
  }

  if (input.paymentStatus === 'FAILED') {
    return 'Ödeme işlemi başarısız oldu'
  }

  if (input.paymentStatus === 'PENDING') {
    return 'Banka sonucu siteye ulaşmadı (callback alınamadı). Ziraat panelinden kontrol edin.'
  }

  return null
}
