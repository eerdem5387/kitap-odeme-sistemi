import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

function escCsv(value: unknown) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function resolveDateRange(searchParams: URLSearchParams) {
    const period = searchParams.get('period') || 'month'
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const now = new Date()
    let startDate = new Date()
    let endDate = new Date()

    if (startDateParam || endDateParam) {
        startDate = startDateParam
            ? new Date(`${startDateParam}T00:00:00`)
            : new Date(0)
        endDate = endDateParam
            ? new Date(`${endDateParam}T23:59:59.999`)
            : now
        return { startDate, endDate }
    }

    switch (period) {
        case 'week':
            startDate.setDate(now.getDate() - 7)
            break
        case 'quarter':
            startDate.setMonth(now.getMonth() - 3)
            break
        case 'year':
            startDate.setFullYear(now.getFullYear() - 1)
            break
        case 'month':
        default:
            startDate.setMonth(now.getMonth() - 1)
            break
    }

    return { startDate, endDate }
}

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 })
        }

        const token = authHeader.substring(7)
        const decodedToken = verifyToken(token)
        if (!decodedToken || decodedToken.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Admin yetkisi gerekli' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const productId = searchParams.get('productId')
        const { startDate, endDate } = resolveDateRange(searchParams)

        const detailRows = productId
            ? await prisma.$queryRaw`
                SELECT
                    COALESCE(NULLIF(TRIM(o."studentName"), ''), '—') as "studentName",
                    COALESCE(p.name, 'Bilinmeyen Ürün') as "productName",
                    o."createdAt" as "createdAt",
                    CAST(oi.quantity AS INTEGER) as quantity
                FROM "order_items" oi
                JOIN "orders" o ON o.id = oi."orderId"
                LEFT JOIN "products" p ON p.id = oi."productId"
                WHERE o."paymentStatus" = 'COMPLETED'
                AND o.status <> 'CANCELLED'
                AND o."createdAt" >= ${startDate}
                AND o."createdAt" <= ${endDate}
                AND oi."productId" = ${productId}
                ORDER BY o."createdAt" DESC, "studentName" ASC
            ` as Array<{ studentName: string; productName: string; createdAt: Date; quantity: number }>
            : await prisma.$queryRaw`
                SELECT
                    COALESCE(NULLIF(TRIM(o."studentName"), ''), '—') as "studentName",
                    COALESCE(p.name, 'Bilinmeyen Ürün') as "productName",
                    o."createdAt" as "createdAt",
                    CAST(oi.quantity AS INTEGER) as quantity
                FROM "order_items" oi
                JOIN "orders" o ON o.id = oi."orderId"
                LEFT JOIN "products" p ON p.id = oi."productId"
                WHERE o."paymentStatus" = 'COMPLETED'
                AND o.status <> 'CANCELLED'
                AND o."createdAt" >= ${startDate}
                AND o."createdAt" <= ${endDate}
                ORDER BY o."createdAt" DESC, "productName" ASC, "studentName" ASC
            ` as Array<{ studentName: string; productName: string; createdAt: Date; quantity: number }>

        const productSummary = productId
            ? await prisma.$queryRaw`
                SELECT
                    COALESCE(p.name, 'Bilinmeyen Ürün') as name,
                    CAST(SUM(oi.quantity) AS INTEGER) as sales
                FROM "order_items" oi
                JOIN "orders" o ON o.id = oi."orderId"
                LEFT JOIN "products" p ON p.id = oi."productId"
                WHERE o."paymentStatus" = 'COMPLETED'
                AND o.status <> 'CANCELLED'
                AND o."createdAt" >= ${startDate}
                AND o."createdAt" <= ${endDate}
                AND oi."productId" = ${productId}
                GROUP BY p.name
                ORDER BY sales DESC
            ` as Array<{ name: string; sales: number }>
            : await prisma.$queryRaw`
                SELECT
                    COALESCE(p.name, 'Bilinmeyen Ürün') as name,
                    CAST(SUM(oi.quantity) AS INTEGER) as sales
                FROM "order_items" oi
                JOIN "orders" o ON o.id = oi."orderId"
                LEFT JOIN "products" p ON p.id = oi."productId"
                WHERE o."paymentStatus" = 'COMPLETED'
                AND o.status <> 'CANCELLED'
                AND o."createdAt" >= ${startDate}
                AND o."createdAt" <= ${endDate}
                GROUP BY p.name
                ORDER BY sales DESC
            ` as Array<{ name: string; sales: number }>

        const lines: string[] = []
        lines.push('"Öğrenci Adı";"Satın Alınan Ürün";"İşlem Tarihi"')
        for (const row of detailRows) {
            // quantity > 1 ise aynı öğrenci için satırları çoğaltmak yerine ürün adında adet belirt
            const productLabel =
                Number(row.quantity) > 1
                    ? `${row.productName} (x${row.quantity})`
                    : row.productName
            lines.push(
                [
                    escCsv(row.studentName),
                    escCsv(productLabel),
                    escCsv(new Date(row.createdAt).toLocaleDateString('tr-TR'))
                ].join(';')
            )
        }

        lines.push('')
        lines.push('"Ürün Bazlı Satış Adedi"')
        lines.push('"Ürün";"Satış Adedi"')
        for (const row of productSummary) {
            lines.push([escCsv(row.name), escCsv(Number(row.sales || 0))].join(';'))
        }

        if (detailRows.length === 0) {
            lines.splice(1, 0, '"—";"Veri bulunamadı";"—"')
        }

        const productSlug = productId && detailRows[0]?.productName
            ? detailRows[0].productName
                .toLocaleLowerCase('tr-TR')
                .replace(/[^a-z0-9ğüşıöç\s-]/gi, '')
                .trim()
                .replace(/\s+/g, '-')
                .slice(0, 40)
            : 'tum-urunler'

        const startLabel = startDate.toISOString().slice(0, 10)
        const endLabel = endDate.toISOString().slice(0, 10)
        const filename = `rapor_${productSlug}_${startLabel}_${endLabel}.csv`

        const csv = '\uFEFF' + lines.join('\n') + '\n'

        return new NextResponse(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`
            }
        })
    } catch (error) {
        console.error('Report export error:', error)
        return NextResponse.json({ error: 'Rapor indirilirken hata oluştu' }, { status: 500 })
    }
}
