import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

function escCsv(value: unknown) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function asciiFilename(name: string) {
    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
        .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ş/g, 'S')
        .replace(/İ/g, 'I').replace(/Ö/g, 'O').replace(/Ç/g, 'C')
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80) || 'rapor'
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
        const productId = searchParams.get('productId') || undefined
        const { startDate, endDate } = resolveDateRange(searchParams)

        const items = await prisma.orderItem.findMany({
            where: {
                ...(productId ? { productId } : {}),
                order: {
                    paymentStatus: 'COMPLETED',
                    status: { not: 'CANCELLED' },
                    createdAt: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            },
            select: {
                quantity: true,
                product: { select: { id: true, name: true } },
                order: {
                    select: {
                        studentName: true,
                        createdAt: true
                    }
                }
            },
            orderBy: [
                { order: { createdAt: 'desc' } }
            ]
        })

        const detailRows = items.map((item) => ({
            studentName: item.order.studentName?.trim() || '—',
            productName: item.product?.name || 'Bilinmeyen Ürün',
            createdAt: item.order.createdAt,
            quantity: item.quantity
        }))

        const salesByProduct = new Map<string, number>()
        for (const row of detailRows) {
            salesByProduct.set(
                row.productName,
                (salesByProduct.get(row.productName) || 0) + Number(row.quantity || 0)
            )
        }
        const productSummary = Array.from(salesByProduct.entries())
            .map(([name, sales]) => ({ name, sales }))
            .sort((a, b) => b.sales - a.sales)

        const lines: string[] = []
        lines.push('"Öğrenci Adı";"Satın Alınan Ürün";"İşlem Tarihi"')

        if (detailRows.length === 0) {
            lines.push('"—";"Veri bulunamadı";"—"')
        } else {
            for (const row of detailRows) {
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
        }

        lines.push('')
        lines.push('"Ürün Bazlı Satış Adedi"')
        lines.push('"Ürün";"Satış Adedi"')
        if (productSummary.length === 0) {
            lines.push('"—";"0"')
        } else {
            for (const row of productSummary) {
                lines.push([escCsv(row.name), escCsv(row.sales)].join(';'))
            }
        }

        const productLabelForFile = productId
            ? (detailRows[0]?.productName || productId)
            : 'tum-urunler'
        const startLabel = startDate.toISOString().slice(0, 10)
        const endLabel = endDate.toISOString().slice(0, 10)
        const filename = asciiFilename(`rapor_${productLabelForFile}_${startLabel}_${endLabel}.csv`)

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
        const message = error instanceof Error ? error.message : 'Rapor indirilirken hata oluştu'
        return NextResponse.json(
            { error: 'Rapor indirilirken hata oluştu', detail: message },
            { status: 500 }
        )
    }
}
