import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { Prisma } from '@prisma/client'

// Yardımcı: Tarih aralığına göre büyüme oranı hesapla
const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
}

export async function GET(request: NextRequest) {
    try {
        // Auth kontrolü
        const authHeader = request.headers.get('authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 })
        }

        const token = authHeader.substring(7)
        const decodedToken = verifyToken(token)

        if (!decodedToken || decodedToken.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Admin yetkisi gerekli' }, { status: 403 })
        }

        // Query parametreleri
        const { searchParams } = new URL(request.url)
        const period = searchParams.get('period') || 'month'
        const categoryId = searchParams.get('categoryId')
        const startDateParam = searchParams.get('startDate')
        const endDateParam = searchParams.get('endDate')

        // Tarih aralıklarını belirle
        const now = new Date()
        let startDate = new Date()
        let previousStartDate = new Date()
        let endDate = new Date()

        // Özel tarih filtresi varsa onu kullan
        if (startDateParam && endDateParam) {
            startDate = new Date(startDateParam)
            endDate = new Date(endDateParam)
            // Karşılaştırma için aynı süre kadar geriye git
            const duration = endDate.getTime() - startDate.getTime()
            previousStartDate = new Date(startDate.getTime() - duration)
        } else {
            // Periyoda göre tarih belirle
            switch (period) {
                case 'week':
                    startDate.setDate(now.getDate() - 7)
                    previousStartDate.setDate(now.getDate() - 14)
                    break
                case 'quarter':
                    startDate.setMonth(now.getMonth() - 3)
                    previousStartDate.setMonth(now.getMonth() - 6)
                    break
                case 'year':
                    startDate.setFullYear(now.getFullYear() - 1)
                    previousStartDate.setFullYear(now.getFullYear() - 2)
                    break
                case 'month':
                default:
                    startDate.setMonth(now.getMonth() - 1)
                    previousStartDate.setMonth(now.getMonth() - 2)
                    break
            }
        }

        // Temel filtre
        const baseWhere: Prisma.OrderWhereInput = {
            paymentStatus: 'COMPLETED',
            status: { not: 'CANCELLED' },
        }

        // Kategori filtresi (Eğer seçiliyse)
        // Not: Prisma'da ilişkisel filtreleme biraz karmaşıktır, bu yüzden 
        // önce sipariş ID'lerini bulup sonra ana sorguyu atabiliriz veya 
        // doğrudan include/some ile yapabiliriz.
        if (categoryId && categoryId !== 'all') {
            baseWhere.items = {
                some: {
                    product: {
                        categoryId: categoryId
                    }
                }
            }
        }

        // Dönem filtreleri
        const currentPeriodWhere = {
            ...baseWhere,
            createdAt: {
                gte: startDate,
                lte: endDate
            }
        }

        const previousPeriodWhere = {
            ...baseWhere,
            createdAt: {
                gte: previousStartDate,
                lt: startDate
            }
        }

        // Verileri paralel çek
        const [
            currentSales,
            previousSales,
            currentCount,
            previousCount,
            newCustomersCount,
            previousCustomersCount
        ] = await Promise.all([
            // Bu dönem satış
            prisma.order.aggregate({
                where: currentPeriodWhere,
                _sum: { finalAmount: true }
            }),
            // Önceki dönem satış
            prisma.order.aggregate({
                where: previousPeriodWhere,
                _sum: { finalAmount: true }
            }),
            // Bu dönem sipariş sayısı
            prisma.order.count({ where: currentPeriodWhere }),
            // Önceki dönem sipariş sayısı
            prisma.order.count({ where: previousPeriodWhere }),
            // Yeni müşteriler (Bu dönem)
            prisma.user.count({
                where: {
                    role: 'CUSTOMER',
                    createdAt: { gte: startDate, lte: endDate }
                }
            }),
            // Yeni müşteriler (Önceki dönem)
            prisma.user.count({
                where: {
                    role: 'CUSTOMER',
                    createdAt: { gte: previousStartDate, lt: startDate }
                }
            })
        ])

        // Değerleri formatla
        const currentTotalSales = Number(currentSales._sum.finalAmount || 0)
        const previousTotalSales = Number(previousSales._sum.finalAmount || 0)
        
        // Büyüme oranları
        const salesGrowth = calculateGrowth(currentTotalSales, previousTotalSales)
        const ordersGrowth = calculateGrowth(currentCount, previousCount)
        const customersGrowth = calculateGrowth(newCustomersCount, previousCustomersCount)
        
        // Ortalama sipariş tutarı
        const currentAvgOrder = currentCount > 0 ? currentTotalSales / currentCount : 0
        const previousAvgOrder = previousCount > 0 ? previousTotalSales / previousCount : 0
        const avgOrderGrowth = calculateGrowth(currentAvgOrder, previousAvgOrder)

        // Aylık grafik verisi (Son 6 ay veya seçili aralık)
        // Bunu raw query ile yapmak daha performanslı olabilir ama şimdilik JS ile gruplayalım
        // Daha iyi performans için: date_trunc('month', created_at) kullanılabilir.
        
        // En çok satan ürünler
        const topProducts = await prisma.orderItem.groupBy({
            by: ['productId'],
            where: {
                order: currentPeriodWhere
            },
            _sum: {
                quantity: true,
                totalPrice: true
            },
            orderBy: {
                _sum: {
                    quantity: 'desc'
                }
            },
            take: 5
        })

        // Ürün detaylarını al
        const topProductsDetails = await Promise.all(
            topProducts.map(async (item) => {
                const product = await prisma.product.findUnique({
                    where: { id: item.productId },
                    select: { name: true, category: { select: { name: true } } }
                })
                return {
                    name: product?.name || 'Bilinmeyen Ürün',
                    category: product?.category?.name || '-',
                    sales: item._sum.quantity || 0,
                    revenue: Number(item._sum.totalPrice || 0)
                }
            })
        )

        // En çok satan kategoriler
        // Bu sorgu biraz karmaşık olduğu için tüm satılan ürünleri çekip gruplayacağız
        // Veya raw query kullanabiliriz. Prisma ile ilişkisel group by henüz tam desteklenmiyor.
        // Performans için OrderItem üzerinden gidiyoruz.
        
        // Raw query ile kategori bazlı satış
        /*
        SELECT c.name, SUM(oi.quantity) as sales, SUM(oi.total_price) as revenue
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN categories c ON p.category_id = c.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.payment_status = 'COMPLETED' AND o.created_at >= ...
        GROUP BY c.name
        ORDER BY sales DESC
        LIMIT 5
        */
        
        // Şimdilik basitçe JS tarafında yapalım (veri azsa), ama doğrusu raw query:
        const categoryStats = await prisma.$queryRaw`
            SELECT 
                c.name, 
                CAST(SUM(oi.quantity) AS INTEGER) as sales, 
                CAST(SUM(oi."totalPrice") AS FLOAT) as revenue
            FROM "order_items" oi
            JOIN "products" p ON oi."productId" = p.id
            JOIN "categories" c ON p."categoryId" = c.id
            JOIN "orders" o ON oi."orderId" = o.id
            WHERE o."paymentStatus" = 'COMPLETED' 
            AND o."createdAt" >= ${startDate} 
            AND o."createdAt" <= ${endDate}
            GROUP BY c.name
            ORDER BY sales DESC
            LIMIT 5
        ` as any[]

        const topCategories = categoryStats.map((stat: any) => ({
            name: stat.name,
            sales: Number(stat.sales),
            revenue: Number(stat.revenue)
        }))

        // Aylık satış grafiği (Son 6 ay)
        const monthlyStats = await prisma.$queryRaw`
            SELECT 
                TO_CHAR("createdAt", 'Month') as month,
                EXTRACT(MONTH FROM "createdAt") as month_num,
                CAST(COUNT(*) AS INTEGER) as orders,
                CAST(SUM("finalAmount") AS FLOAT) as sales
            FROM "orders"
            WHERE "paymentStatus" = 'COMPLETED'
            AND "createdAt" >= NOW() - INTERVAL '6 months'
            GROUP BY month, month_num
            ORDER BY month_num ASC
        ` as any[]

        const monthlyData = monthlyStats.map((stat: any) => ({
            month: stat.month.trim(),
            orders: Number(stat.orders),
            sales: Number(stat.sales)
        }))

        return NextResponse.json({
            summary: {
                sales: {
                    current: currentTotalSales,
                    previous: previousTotalSales,
                    change: `${salesGrowth > 0 ? '+' : ''}${salesGrowth}%`
                },
                orders: {
                    current: currentCount,
                    previous: previousCount,
                    change: `${ordersGrowth > 0 ? '+' : ''}${ordersGrowth}%`
                },
                customers: {
                    current: newCustomersCount,
                    previous: previousCustomersCount,
                    change: `${customersGrowth > 0 ? '+' : ''}${customersGrowth}%`
                },
                averageOrder: {
                    current: currentAvgOrder,
                    previous: previousAvgOrder,
                    change: `${avgOrderGrowth > 0 ? '+' : ''}${avgOrderGrowth}%`
                }
            },
            topProducts: topProductsDetails,
            topCategories,
            monthlyData
        })

    } catch (error) {
        console.error('Report API Error:', error)
        return NextResponse.json({ error: 'Rapor oluşturulurken hata oluştu' }, { status: 500 })
    }
}

