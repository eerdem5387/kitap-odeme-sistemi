'use client'

// KALICI ÇÖZÜM: Static generation'ı kapat
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ShoppingCart, 
  Users, 
  Package, 
  TrendingUp, 
  DollarSign,
  Clock,
  ArrowRight,
  Activity
} from 'lucide-react'
import { safeLocalStorage, isClient } from '@/lib/browser-utils'

interface DashboardData {
  totalOrders: number
  totalCustomers: number
  totalProducts: number
  totalRevenue: number
  recentOrders: Array<{
    id: string
    orderNumber: string
    user: { name: string; email: string }
    finalAmount: number
    status: string
    createdAt: Date
  }>
  lowStockProducts: Array<{
    id: string
    name: string
    stock: number
  }>
  trends: {
    ordersGrowth: number
    customersGrowth: number
    productsGrowth: number
    revenueGrowth: number
  }
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        if (!isClient) return
        const token = safeLocalStorage.getItem('token')
        if (!token) throw new Error('Yetkilendirme gerekli')

        const res = await fetch('/api/admin/dashboard', {
          headers: { 'Authorization': `Bearer ${token}` }
        })

        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                window.location.href = '/login?redirect=/admin'
                return
            }
            throw new Error('Veri yüklenemedi')
        }

        const jsonData = await res.json()
        // Tarih dönüşümleri
        if (jsonData.recentOrders) {
            jsonData.recentOrders = jsonData.recentOrders.map((order: any) => ({
                ...order,
                createdAt: new Date(order.createdAt)
            }))
        }
        setData(jsonData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Hata oluştu')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Günaydın'
    if (hour < 18) return 'Tünaydın'
    return 'İyi Akşamlar'
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
        <div className="p-6 text-center">
            <p className="text-red-500">{error}</p>
            <button onClick={() => window.location.reload()} className="mt-4 text-blue-600 hover:underline">Yenile</button>
        </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {getGreeting()}, Admin
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            İşte mağazanızın bugünkü durumu ve performansı.
          </p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={() => router.push('/admin/products/new')}
                className="bg-gray-900 text-white px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-all font-medium shadow-sm"
            >
                Ürün Ekle
            </button>
            <button 
                onClick={() => router.push('/admin/reports')}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all font-medium shadow-sm"
            >
                Raporları Gör
            </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title="Toplam Gelir"
            value={`₺${data?.totalRevenue.toLocaleString('tr-TR')}`}
            trend={data?.trends.revenueGrowth || 0}
            icon={DollarSign}
            color="blue"
        />
        <StatCard 
            title="Siparişler"
            value={data?.totalOrders.toString() || '0'}
            trend={data?.trends.ordersGrowth || 0}
            icon={ShoppingCart}
            color="purple"
        />
        <StatCard 
            title="Müşteriler"
            value={data?.totalCustomers.toString() || '0'}
            trend={data?.trends.customersGrowth || 0}
            icon={Users}
            color="green"
        />
        <StatCard 
            title="Ürünler"
            value={data?.totalProducts.toString() || '0'}
            trend={data?.trends.productsGrowth || 0}
            icon={Package}
            color="orange"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-gray-900 text-lg">Son Siparişler</h3>
                <button 
                    onClick={() => router.push('/admin/orders')}
                    className="text-sm text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1"
                >
                    Tümünü Gör <ArrowRight className="h-4 w-4" />
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50/50 text-gray-500">
                        <tr>
                            <th className="px-6 py-4 font-medium">Sipariş No</th>
                            <th className="px-6 py-4 font-medium">Müşteri</th>
                            <th className="px-6 py-4 font-medium">Tutar</th>
                            <th className="px-6 py-4 font-medium">Durum</th>
                            <th className="px-6 py-4 font-medium text-right">Tarih</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data?.recentOrders.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                    Henüz sipariş bulunmuyor.
                                </td>
                            </tr>
                        ) : (
                            data?.recentOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {order.orderNumber}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {order.user.name}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        ₺{Number(order.finalAmount).toLocaleString('tr-TR')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={order.status} />
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-500">
                                        {new Date(order.createdAt).toLocaleDateString('tr-TR')}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Side Panel: Low Stock & Quick Actions */}
        <div className="space-y-8">
            {/* Low Stock Alert */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-6">
                    <Activity className="h-5 w-5 text-red-500" />
                    <h3 className="font-bold text-gray-900 text-lg">Kritik Stok</h3>
                </div>
                <div className="space-y-4">
                    {data?.lowStockProducts.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 text-sm">
                            <div className="bg-green-50 text-green-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                                <Package className="h-6 w-6" />
                            </div>
                            Tüm stok seviyeleri iyi durumda.
                        </div>
                    ) : (
                        data?.lowStockProducts.map((product) => (
                            <div key={product.id} className="flex items-center justify-between p-3 rounded-xl bg-red-50/50 border border-red-100">
                                <div className="flex-1 min-w-0 pr-4">
                                    <p className="font-medium text-gray-900 truncate">{product.name}</p>
                                    <p className="text-xs text-red-600 font-medium mt-0.5">
                                        {product.stock === 0 ? 'Tükendi' : `${product.stock} adet kaldı`}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                                    className="text-xs bg-white border border-gray-200 px-3 py-1.5 rounded-lg font-medium text-gray-600 hover:bg-gray-50"
                                >
                                    Yönet
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Quick Stats or Tips */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg">
                <h3 className="font-bold text-lg mb-2">Pro İpucu 💡</h3>
                <p className="text-blue-100 text-sm leading-relaxed">
                    Raporlar sayfasını kullanarak en çok satan ürünlerinizi analiz edebilir ve stok planlamanızı buna göre yapabilirsiniz.
                </p>
            </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, trend, icon: Icon, color }: any) {
    const isPositive = trend >= 0
    
    const colorStyles = {
        blue: 'bg-blue-50 text-blue-600',
        purple: 'bg-purple-50 text-purple-600',
        green: 'bg-green-50 text-green-600',
        orange: 'bg-orange-50 text-orange-600'
    }

    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${colorStyles[color as keyof typeof colorStyles]}`}>
                    <Icon className="h-6 w-6" />
                </div>
                {trend !== 0 && (
                    <div className={`flex items-center px-2 py-1 rounded-lg text-xs font-medium ${isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        <TrendingUp className={`h-3 w-3 mr-1 ${!isPositive && 'rotate-180'}`} />
                        {isPositive ? '+' : ''}{trend}%
                    </div>
                )}
            </div>
            <div>
                <p className="text-gray-500 text-sm font-medium">{title}</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1 tracking-tight">{value}</h3>
            </div>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const styles = {
        PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-100',
        CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-100',
        SHIPPED: 'bg-purple-50 text-purple-700 border-purple-100',
        DELIVERED: 'bg-green-50 text-green-700 border-green-100',
        CANCELLED: 'bg-red-50 text-red-700 border-red-100'
    }

    const labels = {
        PENDING: 'Beklemede',
        CONFIRMED: 'Onaylandı',
        SHIPPED: 'Kargoda',
        DELIVERED: 'Tamamlandı',
        CANCELLED: 'İptal'
    }

    const statusKey = status as keyof typeof styles
    
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[statusKey] || 'bg-gray-50 text-gray-700'}`}>
            {labels[statusKey] || status}
        </span>
    )
}
