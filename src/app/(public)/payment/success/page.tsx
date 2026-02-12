'use client'

export const dynamic = 'force-dynamic'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { CheckCircle, Printer, ArrowRight, MapPin, Mail, Phone } from 'lucide-react'
import { cartService } from '@/lib/cart-service'
import { isClient } from '@/lib/browser-utils'

interface OrderItem {
  id: string
  product: { name: string; images: string[] }
  variation?: {
    attributes: Array<{ attributeValue: { attributeId: string; value: string } }>
  }
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface Address {
  title: string
  firstName: string
  lastName: string
  phone: string
  city: string
  district: string
  fullAddress: string
}

interface Order {
  id: string
  orderNumber: string
  totalAmount: number
  shippingFee: number
  finalAmount: number
  createdAt: string
  items: OrderItem[]
  shippingAddress: Address
  billingAddress: Address
  user: { name: string; email: string }
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams.get('orderId') || ''

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const cartClearedRef = useRef(false)

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        if (!orderId) {
          setError('Sipariş numarası bulunamadı')
          return
        }
        const token = localStorage.getItem('token')
        const guestEmail = localStorage.getItem('userEmail') || ''
        const url = token
          ? `/api/orders/${orderId}`
          : `/api/orders/${orderId}?guest=${encodeURIComponent(guestEmail)}`

        const res = await fetch(url, { headers: token ? { 'Authorization': `Bearer ${token}` } : undefined })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Sipariş getirilemedi')
        setOrder(data)
        
        // Sipariş başarıyla yüklendiğinde ve ödeme tamamlandıysa sepeti temizle ve misafir verilerini sil
        if (isClient && data.paymentStatus === 'COMPLETED' && !cartClearedRef.current) {
          const clearedOrderId = localStorage.getItem('lastClearedOrderId')
          if (clearedOrderId !== orderId) {
            cartService.clearCart()
            localStorage.setItem('lastClearedOrderId', orderId)
            cartClearedRef.current = true
          } else {
            cartClearedRef.current = true
          }
          // Her sipariş sonrası misafir bilgilerini temizle; bir sonraki alışveriş ilk kezmiş gibi olsun
          localStorage.removeItem('userEmail')
          localStorage.removeItem('userName')
          localStorage.removeItem('userPhone')
        }
      } catch (e: any) {
        setError(e?.message || 'Sipariş getirilemedi')
      } finally {
        setLoading(false)
      }
    }
    fetchOrder()
  }, [orderId])

  // Ayrı bir useEffect ile sepet temizleme ve misafir verisi temizleme
  useEffect(() => {
    if (isClient && order && order.paymentStatus === 'COMPLETED' && !cartClearedRef.current) {
      const clearedOrderId = localStorage.getItem('lastClearedOrderId')
      if (clearedOrderId !== orderId) {
        cartService.clearCart()
        localStorage.setItem('lastClearedOrderId', orderId)
        cartClearedRef.current = true
      }
      localStorage.removeItem('userEmail')
      localStorage.removeItem('userName')
      localStorage.removeItem('userPhone')
    }
  }, [order, orderId])

  const formatTL = (n: number) => `₺${Number(n || 0).toLocaleString('tr-TR')}`

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Hata</h1>
          <p className="text-gray-600 mb-6">{error || 'Sipariş bulunamadı'}</p>
          <button onClick={() => router.push('/products')} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
            Ürünlere Dön
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white border rounded-lg p-6 mb-8 flex items-start gap-4">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Teşekkürler! Ödemeniz Alındı</h1>
            <p className="text-gray-600 mt-1">Siparişiniz onaylandı ve hazırlanıyor.</p>
            <div className="mt-2 text-sm text-gray-500">Sipariş No: <span className="font-medium">{order.orderNumber}</span> • Tarih: {new Date(order.createdAt).toLocaleString('tr-TR')}</div>
          </div>
          <button onClick={() => window.print()} className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            <Printer className="h-4 w-4 mr-2" /> Yazdır / PDF
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Items */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Sipariş Özeti</h2>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                      {item.product.images && item.product.images[0] ? (
                        <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-gray-500">Resim</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{item.product.name}</div>
                      {item.variation && (
                        <div className="text-xs text-gray-500 mt-1">
                          {item.variation.attributes.map((a, i) => (
                            <span key={i}>{a.attributeValue.attributeId}: {a.attributeValue.value}{i < item.variation!.attributes.length - 1 ? ', ' : ''}</span>
                          ))}
                        </div>
                      )}
                      <div className="text-sm text-gray-500 mt-1">Adet: {item.quantity} • Birim: {formatTL(item.unitPrice)}</div>
                    </div>
                    <div className="text-right font-semibold text-gray-900">{formatTL(item.totalPrice)}</div>
                  </div>
                ))}
              </div>
              <div className="border-t mt-4 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Ara Toplam</span>
                  <span>{formatTL(order.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Kargo</span>
                  <span>{order.shippingFee > 0 ? formatTL(order.shippingFee) : 'Ücretsiz'}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 border-t pt-3">
                  <span>Toplam</span>
                  <span>{formatTL(order.finalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Fatura Bilgileri</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="font-medium text-gray-900 mb-1">Teslimat Adresi</div>
                  <div className="text-sm text-gray-700">{order.shippingAddress.firstName} {order.shippingAddress.lastName}</div>
                  <div className="text-sm text-gray-600 flex items-start mt-1">
                    <MapPin className="h-4 w-4 mr-2 mt-0.5" />
                    <span>{order.shippingAddress.fullAddress}, {order.shippingAddress.district}, {order.shippingAddress.city}</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1 flex items-center"><Phone className="h-4 w-4 mr-2" />{order.shippingAddress.phone}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-900 mb-1">Fatura Adresi</div>
                  <div className="text-sm text-gray-700">{order.billingAddress.firstName} {order.billingAddress.lastName}</div>
                  <div className="text-sm text-gray-600 flex items-start mt-1">
                    <MapPin className="h-4 w-4 mr-2 mt-0.5" />
                    <span>{order.billingAddress.fullAddress}, {order.billingAddress.district}, {order.billingAddress.city}</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1 flex items-center"><Phone className="h-4 w-4 mr-2" />{order.billingAddress.phone}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Customer & actions */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Müşteri</h2>
              <div className="text-sm text-gray-800 font-medium">{order.user.name || 'Müşteri'}</div>
              <div className="text-sm text-gray-600 mt-1 flex items-center"><Mail className="h-4 w-4 mr-2" />{order.user.email}</div>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Sonraki Adımlar</h2>
              <div className="space-y-3">
                <button onClick={() => window.print()} className="w-full inline-flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                  <Printer className="h-4 w-4 mr-2" /> Faturayı Yazdır / PDF
                </button>
                <button onClick={() => router.push('/products')} className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Alışverişe Devam Et <ArrowRight className="h-4 w-4 ml-2" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


