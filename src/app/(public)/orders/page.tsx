'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Clock, CheckCircle, Truck, AlertCircle } from 'lucide-react'

interface OrderItem {
  id: string
  productId: string
  quantity: number
  unitPrice: number
  totalPrice: number
  product: {
    id: string
    name: string
    images: string[]
  }
}

interface Order {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  totalAmount: number
  finalAmount: number
  createdAt: string
  items: OrderItem[]
  shippingAddress: {
    title: string
    firstName: string
    lastName: string
    phone: string
    city: string
    district: string
    fullAddress: string
  }
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login?redirect=/orders')
        return
      }

      const response = await fetch('/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login?redirect=/orders')
          return
        }
        throw new Error('Siparişler yüklenirken bir hata oluştu')
      }

      const data = await response.json()
      setOrders(data)
    } catch (error) {
      console.error('Error fetching orders:', error)
      setError(error instanceof Error ? error.message : 'Siparişler yüklenirken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'CONFIRMED':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'SHIPPED':
        return <Truck className="h-4 w-4 text-blue-600" />
      case 'DELIVERED':
        return <Package className="h-4 w-4 text-green-600" />
      case 'CANCELLED':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Beklemede'
      case 'CONFIRMED':
        return 'Onaylandı'
      case 'SHIPPED':
        return 'Kargoda'
      case 'DELIVERED':
        return 'Teslim Edildi'
      case 'CANCELLED':
        return 'İptal Edildi'
      default:
        return status
    }
  }

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Beklemede'
      case 'COMPLETED':
        return 'Tamamlandı'
      case 'FAILED':
        return 'Başarısız'
      default:
        return status
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Siparişler yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Siparişlerim</h1>
          <p className="text-gray-600 mt-2">Tüm siparişlerinizi görüntüleyin</p>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz siparişiniz yok</h3>
            <p className="text-gray-600 mb-6">İlk siparişinizi vermek için ürünlerimizi keşfedin</p>
            <button
              onClick={() => router.push('/products')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ürünleri Görüntüle
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-sm border">
                {/* Order Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Sipariş #{order.orderNumber}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(order.createdAt).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2 mb-2">
                        {getStatusIcon(order.status)}
                        <span className="text-sm font-medium text-gray-900">
                          {getStatusText(order.status)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Ödeme: {getPaymentStatusText(order.paymentStatus)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="p-6">
                  <div className="space-y-4">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                          {item.product.images && item.product.images.length > 0 ? (
                            <img
                              src={item.product.images[0]}
                              alt={item.product.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Package className="h-8 w-8 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{item.product.name}</h4>
                          <p className="text-sm text-gray-600">
                            {item.quantity} adet x {item.unitPrice.toLocaleString('tr-TR')} ₺
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            {item.totalPrice.toLocaleString('tr-TR')} ₺
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order Total */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900">Toplam</span>
                      <span className="text-lg font-semibold text-gray-900">
                        {order.finalAmount.toLocaleString('tr-TR')} ₺
                      </span>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-2">Teslimat Adresi</h4>
                    <div className="text-sm text-gray-600">
                      <p>{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
                      <p>{order.shippingAddress.fullAddress}</p>
                      <p>{order.shippingAddress.district}, {order.shippingAddress.city}</p>
                      <p>Tel: {order.shippingAddress.phone}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <button
                      onClick={() => router.push(`/orders/${order.id}`)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Detayları Görüntüle
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 