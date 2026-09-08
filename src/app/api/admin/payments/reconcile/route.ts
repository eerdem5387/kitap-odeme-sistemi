import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ziraatPaymentService } from '@/lib/ziraat-payment'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function markOrderPaid(params: {
  orderId: string
  amount: number
  authCode?: string
  transId?: string
  note: string
  gatewayResponse?: string
}) {
  const txn =
    params.transId ||
    `RECON-${params.orderId.slice(-8)}-${Date.now()}`

  await prisma.$executeRaw`
    UPDATE orders
    SET "paymentStatus" = 'COMPLETED',
        status = 'CONFIRMED',
        notes = ${params.note},
        "updatedAt" = NOW()
    WHERE id = ${params.orderId}
      AND "paymentStatus" <> 'COMPLETED'
  `

  const existing = await prisma.payment.findFirst({
    where: {
      OR: [
        { transactionId: txn },
        { orderId: params.orderId, status: 'COMPLETED' }
      ]
    }
  })

  if (!existing) {
    await prisma.payment.create({
      data: {
        id: `pay_${randomBytes(12).toString('hex')}`,
        orderId: params.orderId,
        amount: params.amount,
        method: 'CREDIT_CARD',
        status: 'COMPLETED',
        transactionId: txn,
        gatewayResponse: params.gatewayResponse || JSON.stringify({
          source: 'admin_reconcile',
          authCode: params.authCode,
          transId: params.transId
        })
      }
    })
  }

  return txn
}

/**
 * Tek sipariş veya toplu mutabakat.
 * body: { orderId?: string, orderIds?: string[], mode?: 'inquire'|'mark_paid'|'cleanup_retries' }
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 })
    }
    const decoded = verifyToken(authHeader.slice(7))
    if (!decoded || decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin yetkisi gerekli' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const mode = body.mode || 'inquire'
    const orderIds: string[] = Array.isArray(body.orderIds)
      ? body.orderIds
      : body.orderId
        ? [body.orderId]
        : []

    if (mode === 'cleanup_retries') {
      // Aynı kullanıcıda yakında COMPLETED olan PENDING denemeleri iptal et
      const cancelled = await prisma.$executeRaw`
        UPDATE orders o
        SET status = 'CANCELLED',
            notes = CONCAT(COALESCE(notes, ''), CASE WHEN notes IS NULL OR notes = '' THEN '' ELSE ' | ' END,
              'Otomatik: Başarılı ödeme sonrası mükerrer deneme iptal edildi.'),
            "updatedAt" = NOW()
        WHERE o."paymentStatus" = 'PENDING'
          AND o.status = 'PENDING'
          AND o."createdAt" >= NOW() - INTERVAL '90 days'
          AND EXISTS (
            SELECT 1 FROM orders c
            WHERE c."userId" = o."userId"
              AND c."paymentStatus" = 'COMPLETED'
              AND abs(c."finalAmount" - o."finalAmount") < 1
              AND c."createdAt" BETWEEN o."createdAt" - INTERVAL '3 days' AND o."createdAt" + INTERVAL '3 days'
              AND c.id <> o.id
          )
      `
      return NextResponse.json({ success: true, mode, cancelledCount: Number(cancelled) })
    }

    if (orderIds.length === 0 && mode !== 'reconcile_pending') {
      return NextResponse.json({ error: 'orderId gerekli' }, { status: 400 })
    }

    // Son 45 gün PENDING siparişleri bankadan sorgula
    let targets = orderIds
    if (mode === 'reconcile_pending' || (mode === 'inquire' && orderIds.length === 0)) {
      const pending = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM orders
        WHERE "paymentStatus" = 'PENDING'
          AND status = 'PENDING'
          AND "createdAt" >= NOW() - INTERVAL '45 days'
        ORDER BY "createdAt" DESC
        LIMIT 80
      `
      targets = pending.map((p) => p.id)
    }

    const results: Array<Record<string, any>> = []

    for (const orderId of targets) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          orderNumber: true,
          studentName: true,
          paymentStatus: true,
          finalAmount: true,
          notes: true
        }
      })

      if (!order) {
        results.push({ orderId, error: 'Sipariş bulunamadı' })
        continue
      }

      if (order.paymentStatus === 'COMPLETED') {
        results.push({
          orderId,
          orderNumber: order.orderNumber,
          skipped: true,
          reason: 'Zaten ödenmiş'
        })
        continue
      }

      if (mode === 'mark_paid') {
        const txn = await markOrderPaid({
          orderId: order.id,
          amount: Number(order.finalAmount),
          note: `Manuel mutabakat (admin). ${body.note || 'Ziraat panelinde başarılı görüldü.'}`.trim(),
          authCode: body.authCode,
          transId: body.transId
        })
        results.push({
          orderId,
          orderNumber: order.orderNumber,
          studentName: order.studentName,
          markedPaid: true,
          transactionId: txn
        })
        continue
      }

      // inquire / reconcile_pending
      const inquiry = await ziraatPaymentService.inquireOrderStatus(order.id)
      let markedPaid = false
      let transactionId: string | undefined

      if (inquiry.success && inquiry.paid && (mode === 'reconcile_pending' || body.apply === true)) {
        transactionId = await markOrderPaid({
          orderId: order.id,
          amount: Number(order.finalAmount),
          authCode: inquiry.authCode,
          transId: inquiry.transId,
          note: [
            'Ziraat mutabakat (OrderStatusQuery).',
            inquiry.authCode ? `AuthCode: ${inquiry.authCode}` : null,
            inquiry.transId ? `TransId: ${inquiry.transId}` : null
          ].filter(Boolean).join(' '),
          gatewayResponse: JSON.stringify({
            source: 'ziraat_order_status_query',
            inquiry
          })
        })
        markedPaid = true
      }

      results.push({
        orderId,
        orderNumber: order.orderNumber,
        studentName: order.studentName,
        inquiry: {
          success: inquiry.success,
          paid: inquiry.paid,
          error: inquiry.error,
          authCode: inquiry.authCode,
          transId: inquiry.transId,
          procReturnCode: inquiry.procReturnCode,
          orderStatus: inquiry.orderStatus
        },
        markedPaid,
        transactionId
      })

      // Banka rate-limit için kısa bekleme
      await new Promise((r) => setTimeout(r, 200))
    }

    return NextResponse.json({
      success: true,
      mode,
      checked: results.length,
      paidFound: results.filter((r) => r.inquiry?.paid || r.markedPaid).length,
      markedPaid: results.filter((r) => r.markedPaid).length,
      results
    })
  } catch (error) {
    console.error('Reconcile error:', error)
    return NextResponse.json({ error: 'Mutabakat sırasında hata oluştu' }, { status: 500 })
  }
}
