'use client'

// KALICI ÇÖZÜM: Static generation'ı kapat
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ShoppingCart, 
  Eye, 
  Package, 
  DollarSign, 
  MoreHorizontal, 
  CheckCircle2, 
  Clock, 
  Truck, 
  XCircle, 
  AlertCircle,
  Search,
  Filter
} from 'lucide-react'

interface Order {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  finalAmount: number
  createdAt: string
  user: {
    name: string
    email: string
  }
  items: Array<{
    id: string
    quantity: number
    product: {
      name: string
      images: string[]
    }
    variation?: {
      attributes: Array<{
        attributeValue: {
          value: string
          price?: number | null
          attribute: {
            name: string
          }
        }
      }>
    }
  }>
  _count?: {
    items: number
  }
}

const TABS = [
  { id: 'all', label: 'Tümü' },
  { id: 'PENDING', label: 'Bekleyen' },
  { id: 'CONFIRMED', label: 'Onaylanan' },
  { id: 'SHIPPED', label: 'Kargoda' },
  { id: 'DELIVERED', label: 'Teslim Edilen' },
  { id: 'CANCELLED', label: 'İptal' },
]

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Fetch Orders
    const fetchOrders = async () => {
      try {
      setIsLoading(true)
        const token = localStorage.getItem('token')
      if (!token) return

        const response = await fetch('/api/admin/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
        })
        
        if (response.ok) {
          const data = await response.json()
          if (Array.isArray(data)) {
            setOrders(data)
        }
        }
      } catch (error) {
      console.error('Error:', error)
      } finally {
        setIsLoading(false)
      }
    }

  useEffect(() => {
    fetchOrders()
  }, [])

  // Filter Logic
  useEffect(() => {
    let result = [...orders]

    // Tab Filter
    if (activeTab !== 'all') {
      result = result.filter(order => order.status === activeTab)
    }

    // Search Filter
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase()
      result = result.filter(order => 
        order.orderNumber.toLowerCase().includes(lowerTerm) ||
        order.user.name.toLowerCase().includes(lowerTerm) ||
        order.user.email.toLowerCase().includes(lowerTerm)
      )
    }

    setFilteredOrders(result)
    setCurrentPage(1)
  }, [orders, activeTab, searchTerm])

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const currentData = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Status Badge Component
  const StatusBadge = ({ status, type = 'order' }: { status: string, type?: 'order' | 'payment' }) => {
    const config = {
      PENDING: { color: 'bg-yellow-50 text-yellow-700 border-yellow-100', icon: Clock, label: 'Bekliyor' },
      CONFIRMED: { color: 'bg-blue-50 text-blue-700 border-blue-100', icon: CheckCircle2, label: 'Onaylandı' },
      SHIPPED: { color: 'bg-purple-50 text-purple-700 border-purple-100', icon: Truck, label: 'Kargoda' },
      DELIVERED: { color: 'bg-green-50 text-green-700 border-green-100', icon: Package, label: 'Teslim Edildi' },
      CANCELLED: { color: 'bg-red-50 text-red-700 border-red-100', icon: XCircle, label: 'İptal' },
      COMPLETED: { color: 'bg-green-50 text-green-700 border-green-100', icon: CheckCircle2, label: 'Ödendi' },
      FAILED: { color: 'bg-red-50 text-red-700 border-red-100', icon: AlertCircle, label: 'Başarısız' }
    }

    const statusKey = status as keyof typeof config
    const style = config[statusKey] || { color: 'bg-gray-50 text-gray-700', icon: Clock, label: status }
    const Icon = style.icon

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style.color}`}>
        <Icon className="w-3 h-3 mr-1.5" />
        {style.label}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Sipariş Yönetimi</h1>
          <p className="text-gray-500 mt-1">Toplam {filteredOrders.length} sipariş</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
        {/* Tabs */}
        <div className="flex overflow-x-auto pb-2 sm:pb-0 gap-2 no-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-gray-900 text-white shadow-md'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Sipariş No, Müşteri Adı veya E-posta ara..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Table / Cards */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-600">Sipariş No</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Müşteri</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Tutar</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Durum</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Ödeme</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Tarih</th>
                <th className="px-6 py-4 font-semibold text-gray-600 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {currentData.length > 0 ? (
                currentData.map((order) => (
                  <tr 
                    key={order.id} 
                    className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                    onClick={() => window.location.href = `/admin/orders/${order.id}`}
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">
                      #{order.orderNumber}
                      <div className="text-xs text-gray-500 font-normal mt-0.5">
                        {order._count?.items || order.items.length} ürün
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{order.user.name}</div>
                      <div className="text-xs text-gray-500">{order.user.email}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      ₺{Number(order.finalAmount).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={order.paymentStatus} type="payment" />
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('tr-TR')}
                      <div className="text-xs text-gray-400">
                        {new Date(order.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <ShoppingCart className="h-10 w-10 text-gray-300 mb-3" />
                      <p>Sipariş bulunamadı.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {currentData.length > 0 ? (
            currentData.map((order) => (
              <button
                key={order.id}
                onClick={() => window.location.href = `/admin/orders/${order.id}`}
                className="w-full text-left px-4 py-3 flex flex-col gap-2 active:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      #{order.orderNumber}
                    </p>
                    <p className="text-xs text-gray-500">
                      {order._count?.items || order.items.length} ürün • ₺{Number(order.finalAmount).toLocaleString('tr-TR')}
                      {order.items.some(item => item.variation) && (
                        <span className="ml-1 text-blue-600">• Varyasyonlu</span>
                      )}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>{order.user.name}</span>
                  <span>
                    {new Date(order.createdAt).toLocaleDateString('tr-TR')}{' '}
                    {new Date(order.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <StatusBadge status={order.paymentStatus} type="payment" />
                  <span className="inline-flex items-center text-xs text-blue-600">
                    Detayı Gör
                    <Eye className="h-3 w-3 ml-1" />
                  </span>
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-gray-500">
              <div className="flex flex-col items-center justify-center">
                <ShoppingCart className="h-10 w-10 text-gray-300 mb-3" />
                <p>Sipariş bulunamadı.</p>
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Sayfa <span className="font-medium text-gray-900">{currentPage}</span> / {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Önceki
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
        </div>
    </div>
  )
} 
