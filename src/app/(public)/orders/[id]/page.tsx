'use client'

// KALICI ÇÖZÜM: Static generation'ı kapat
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { CheckCircle, Clock, Truck, Package, AlertCircle } from 'lucide-react'

interface Order {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  totalAmount: number
  finalAmount: number
  createdAt: string
  notes?: string
  items: Array<{
    id: string
    product: {
      name: string
      images: string[]
    }
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
  shippingAddress: {
    title: string
    firstName: string
    lastName: string
    phone: string
    city: string
    district: string
    fullAddress: string
  }
  billingAddress: {
    title: string
    firstName: string
    lastName: string
    phone: string
    city: string
    district: string
    fullAddress: string
  }
}

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const orderId = params.id as string
  const isSuccess = searchParams.get('success') === 'true'
  
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchOrder()
    
    // Başarılı ödeme durumunda sepeti temizle
    if (isSuccess) {
      sessionStorage.removeItem('cart')
      window.dispatchEvent(new Event('cartUpdated'))
    }
  }, [orderId, isSuccess])

  const fetchOrder = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login?redirect=/orders/' + orderId)
        return
      }

      const response = await fetch(`/api/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Sipariş bulunamadı')
      }

      const orderData = await response.json()
      setOrder(orderData)
    } catch (error) {
      console.error('Error fetching order:', error)
      setError('Sipariş yüklenirken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'CONFIRMED':
        return <CheckCircle className="h-5 w-5 text-blue-500" />
      case 'SHIPPED':
        return <Truck className="h-5 w-5 text-purple-500" />
      case 'DELIVERED':
        return <Package className="h-5 w-5 text-green-500" />
      case 'CANCELLED':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
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
        return 'Bilinmiyor'
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
        return 'Bilinmiyor'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error && !order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Hata</h1>
            <p className="text-gray-600 mb-8">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Ana Sayfaya Dön
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Sipariş Bulunamadı</h1>
            <p className="text-gray-600 mb-8">
              Aradığınız sipariş bulunamadı veya erişim izniniz yok.
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Ana Sayfaya Dön
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        {isSuccess && (
          <div className="mb-8 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span>Ödeme başarıyla tamamlandı! Siparişiniz onaylandı.</span>
            </div>
          </div>
        )}

        {/* Order Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sipariş #{order.orderNumber}</h1>
              <p className="text-gray-600">
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
              <div className="flex items-center mb-2">
                {getStatusIcon(order.status)}
                <span className="ml-2 font-medium">{getStatusText(order.status)}</span>
              </div>
              <div className="text-sm text-gray-600">
                Ödeme: {getPaymentStatusText(order.paymentStatus)}
              </div>
            </div>
          </div>

          {order.notes && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Sipariş Notları</h3>
              <p className="text-gray-600">{order.notes}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Sipariş Kalemleri</h2>
              
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0">
                      {item.product.images && item.product.images[0] ? (
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                          <span className="text-xs text-gray-500">Resim</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.product.name}</h3>
                      <p className="text-sm text-gray-500">Adet: {item.quantity}</p>
                      <p className="text-sm text-gray-500">
                        Birim Fiyat: ₺{Number(item.unitPrice).toLocaleString('tr-TR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        ₺{Number(item.totalPrice).toLocaleString('tr-TR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="mt-6 border-t pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ara Toplam</span>
                    <span className="font-medium">₺{Number(order.totalAmount).toLocaleString('tr-TR')}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Kargo</span>
                    <span className="font-medium">
                      {order.finalAmount > order.totalAmount ? 
                        `₺${(Number(order.finalAmount) - Number(order.totalAmount)).toLocaleString('tr-TR')}` : 
                        'Ücretsiz'
                      }
                    </span>
                  </div>
                  
                  <div className="border-t pt-2">
                    <div className="flex justify-between">
                      <span className="text-lg font-semibold text-gray-900">Toplam</span>
                      <span className="text-lg font-semibold text-gray-900">
                        ₺{Number(order.finalAmount).toLocaleString('tr-TR')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Shipping Address */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Teslimat Adresi</h3>
                <div className="space-y-2 text-sm">
                  <p className="font-medium">{order.shippingAddress.title}</p>
                  <p>{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
                  <p>{order.shippingAddress.phone}</p>
                  <p>{order.shippingAddress.fullAddress}</p>
                  <p>{order.shippingAddress.district}, {order.shippingAddress.city}</p>
                </div>
              </div>

              {/* Billing Address */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Fatura Adresi</h3>
                <div className="space-y-2 text-sm">
                  <p className="font-medium">{order.billingAddress.title}</p>
                  <p>{order.billingAddress.firstName} {order.billingAddress.lastName}</p>
                  <p>{order.billingAddress.phone}</p>
                  <p>{order.billingAddress.fullAddress}</p>
                  <p>{order.billingAddress.district}, {order.billingAddress.city}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">İşlemler</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/')}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Alışverişe Devam Et
                  </button>
                  <button
                    onClick={() => router.push('/profile')}
                    className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    Siparişlerim
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 