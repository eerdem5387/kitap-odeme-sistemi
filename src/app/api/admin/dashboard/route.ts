import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Authorization kontrolü
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Yetkilendirme gerekli' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decodedToken = verifyToken(token)
    
    console.log('Admin Dashboard Auth Check:', {
      hasToken: !!token,
      decodedToken,
      role: decodedToken?.role,
      expectedRole: 'ADMIN'
    })

    if (!decodedToken || decodedToken.role !== 'ADMIN') {
      console.log('Admin Dashboard Auth Failed:', {
        reason: !decodedToken ? 'Token invalid' : 'Role mismatch',
        userRole: decodedToken?.role
      })
      return NextResponse.json(
        { 
          error: 'Admin yetkisi gerekli', 
          code: !decodedToken ? 'TOKEN_INVALID' : 'ROLE_MISMATCH' 
        },
        { status: 403 }
      )
    }

    // Paralel olarak sadece gerekli istatistikleri çek (optimize edilmiş)
    // Promise.allSettled kullanarak bir query başarısız olsa bile diğerleri çalışsın
    const [
      basicStatsResult,
      revenueResult,
      recentOrdersResult,
      lowStockResult
    ] = await Promise.allSettled([
      // Temel istatistikler (tek query'de)
      Promise.all([
        prisma.product.count(),
        prisma.user.count({ where: { role: 'CUSTOMER' } }),
        prisma.order.count(),
        prisma.order.count({ where: { status: 'DELIVERED' } })
      ]),
      
      // Toplam gelir (sadece tamamlanan ödemeler)
      prisma.order.aggregate({
        where: { 
          paymentStatus: 'COMPLETED',
          status: { not: 'CANCELLED' }
        },
        _sum: { finalAmount: true }
      }),
      
      // Son 5 sipariş (sadece gerekli alanlar)
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          finalAmount: true,
          status: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      }),
      
      // Düşük stok ürünler (sadece gerekli alanlar)
      prisma.product.findMany({
        where: {
          OR: [
            { stock: { lt: 10, gt: 0 } },
            { stock: 0 }
          ],
          productType: 'SIMPLE',
          isActive: true
        },
        take: 5,
        select: {
          id: true,
          name: true,
          stock: true
        },
        orderBy: { stock: 'asc' }
      })
    ])

    // Hata yakalama ile güvenli veri çıkarma
    const [totalProducts, totalCustomers, totalOrders, completedOrders] = 
      basicStatsResult.status === 'fulfilled' ? basicStatsResult.value : [0, 0, 0, 0]
    
    const totalRevenue = revenueResult.status === 'fulfilled' 
      ? Number(revenueResult.value._sum.finalAmount || 0) 
      : 0
    
    const recentOrdersData = recentOrdersResult.status === 'fulfilled' 
      ? recentOrdersResult.value 
      : []
    
    const lowStockProductsData = lowStockResult.status === 'fulfilled' 
      ? lowStockResult.value 
      : []

    // Bu ay ve geçen ay tarihleri
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    // Bu ay ve geçen ay istatistikleri
    const [
      thisMonthOrders,
      lastMonthOrders,
      thisMonthCustomers,
      lastMonthCustomers,
      thisMonthProducts,
      lastMonthProducts,
      thisMonthRevenue,
      lastMonthRevenue
    ] = await Promise.all([
      prisma.order.count({
        where: { createdAt: { gte: thisMonth } }
      }),
      prisma.order.count({
        where: { 
          createdAt: { gte: lastMonth, lt: thisMonth }
        }
      }),
      prisma.user.count({
        where: { 
          role: 'CUSTOMER',
          createdAt: { gte: thisMonth }
        }
      }),
      prisma.user.count({
        where: { 
          role: 'CUSTOMER',
          createdAt: { gte: lastMonth, lt: thisMonth }
        }
      }),
      prisma.product.count({
        where: { createdAt: { gte: thisMonth } }
      }),
      prisma.product.count({
        where: { 
          createdAt: { gte: lastMonth, lt: thisMonth }
        }
      }),
      prisma.order.aggregate({
        where: {
          paymentStatus: 'COMPLETED',
          status: { not: 'CANCELLED' },
          createdAt: { gte: thisMonth }
        },
        _sum: { finalAmount: true }
      }),
      prisma.order.aggregate({
        where: {
          paymentStatus: 'COMPLETED',
          status: { not: 'CANCELLED' },
          createdAt: { gte: lastMonth, lt: thisMonth }
        },
        _sum: { finalAmount: true }
      })
    ])

    // Trend hesaplamaları
    const ordersGrowth = lastMonthOrders > 0 
      ? Math.round(((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100)
      : (thisMonthOrders > 0 ? 100 : 0)
    
    const customersGrowth = lastMonthCustomers > 0 
      ? Math.round(((thisMonthCustomers - lastMonthCustomers) / lastMonthCustomers) * 100)
      : (thisMonthCustomers > 0 ? 100 : 0)
    
    const productsGrowth = lastMonthProducts > 0 
      ? Math.round(((thisMonthProducts - lastMonthProducts) / lastMonthProducts) * 100)
      : (thisMonthProducts > 0 ? 100 : 0)
    
    const thisMonthRevenueAmount = Number(thisMonthRevenue._sum.finalAmount || 0)
    const lastMonthRevenueAmount = Number(lastMonthRevenue._sum.finalAmount || 0)
    const revenueGrowth = lastMonthRevenueAmount > 0 
      ? Math.round(((thisMonthRevenueAmount - lastMonthRevenueAmount) / lastMonthRevenueAmount) * 100)
      : (thisMonthRevenueAmount > 0 ? 100 : 0)

    // Delivery rate
    const deliveryRate = totalOrders > 0 
      ? Math.round((completedOrders / totalOrders) * 100)
      : 0

    return NextResponse.json({
      totalOrders,
      totalCustomers,
      totalProducts,
      totalRevenue,
      recentOrders: recentOrdersData.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        user: order.user,
        finalAmount: Number(order.finalAmount),
        status: order.status,
        createdAt: order.createdAt
      })),
      lowStockProducts: lowStockProductsData,
      trends: {
        ordersGrowth,
        customersGrowth,
        productsGrowth,
        revenueGrowth
      },
      performance: {
        salesTarget: 85,
        customerSatisfaction: 4.8,
        deliveryRate
      }
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Dashboard verileri yüklenirken bir hata oluştu' },
      { status: 500 }
    )
  }
}

