'use client'

export const dynamic = 'force-dynamic'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { CheckCircle, Printer, ArrowRight, MapPin, Mail, Phone, Clock } from 'lucide-react'
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
  paymentStatus?: string
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
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const cartClearedRef = useRef(false)

  const clearCartIfPaid = (data: Order) => {
    if (!isClient || data.paymentStatus !== 'COMPLETED' || cartClearedRef.current) return
    const clearedOrderId = localStorage.getItem('lastClearedOrderId')
    if (clearedOrderId !== orderId) {
      cartService.clearCart()
      localStorage.setItem('lastClearedOrderId', orderId)
      localStorage.removeItem('pendingPaymentOrderId')
    }
    cartClearedRef.current = true
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userName')
    localStorage.removeItem('userPhone')
  }

  useEffect(() => {
    if (!orderId) {
      setError('Sipariş numarası bulunamadı')
      setLoading(false)
      return
    }

    let cancelled = false
    let attempts = 0
    const maxAttempts = 36

    const fetchOrder = async (): Promise<Order | null> => {
      const token = localStorage.getItem('token')
      const guestEmail = localStorage.getItem('userEmail') || ''
      const url = token
        ? `/api/orders/${orderId}`
        : `/api/orders/${orderId}?guest=${encodeURIComponent(guestEmail)}`
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: 'no-store'
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Sipariş getirilemedi')
      return data
    }

    const run = async () => {
      try {
        let data = await fetchOrder()
        if (cancelled || !data) return
        setOrder(data)
        setLoading(false)

        if (data.paymentStatus === 'COMPLETED') {
          clearCartIfPaid(data)
          return
        }

        setVerifying(true)
        while (!cancelled && attempts < maxAttempts && data?.paymentStatus !== 'COMPLETED') {
          attempts += 1
          await new Promise((r) => setTimeout(r, 10000))
          data = await fetchOrder()
          if (cancelled || !data) return
          setOrder(data)
          if (data.paymentStatus === 'COMPLETED') {
            clearCartIfPaid(data)
            break
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Sipariş getirilemedi')
      } finally {
        if (!cancelled) {
          setVerifying(false)
          setLoading(false)
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [orderId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {verifying ? 'Ödeme bankadan doğrulanıyor...' : 'Yükleniyor...'}
          </p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow p-6 max-w-md text-center">
          <p className="text-red-600 mb-4">{error || 'Sipariş bulunamadı'}</p>
          <button onClick={() => router.push('/')} className="text-blue-600 underline">
            Ana sayfa
          </button>
        </div>
      </div>
    )
  }

  const isPaid = order.paymentStatus === 'COMPLETED'

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
          {isPaid ? (
            <>
              <CheckCircle className="h-14 w-14 text-green-600 mx-auto mb-3" />
              <h1 className="text-2xl font-bold text-gray-900">Ödemeniz Alındı</h1>
              <p className="text-gray-600 mt-2">
                Siparişiniz başarıyla alındı. Sipariş No: <strong>#{order.orderNumber}</strong>
              </p>
            </>
          ) : (
            <>
              <Clock className="h-14 w-14 text-amber-500 mx-auto mb-3" />
              <h1 className="text-2xl font-bold text-gray-900">Ödeme Doğrulanıyor</h1>
              <p className="text-gray-600 mt-2">
                Banka tahsilatı alınmış olabilir. Sonuç siteye birkaç dakika içinde otomatik düşer; bu ekran kendi kendine güncellenir.
                Sayfayı kapatabilirsiniz, ödeme ayrıca kayda geçecektir.
                Sipariş No: <strong>#{order.orderNumber}</strong>
              </p>
              <button
                onClick={() => router.push(`/payment/${order.id}`)}
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Ödemeyi tekrar dene
              </button>
            </>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Sipariş Özeti</h2>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.product.name} × {item.quantity}</span>
                <span>₺{Number(item.totalPrice).toLocaleString('tr-TR')}</span>
              </div>
            ))}
          </div>
          <div className="border-t mt-4 pt-4 flex justify-between font-semibold">
            <span>Toplam</span>
            <span>₺{Number(order.finalAmount).toLocaleString('tr-TR')}</span>
          </div>
        </div>

        {order.shippingAddress && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Teslimat
            </h2>
            <p className="text-sm text-gray-700">
              {order.shippingAddress.firstName} {order.shippingAddress.lastName}
            </p>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
              <Phone className="h-3 w-3" /> {order.shippingAddress.phone}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {order.shippingAddress.fullAddress}, {order.shippingAddress.district}, {order.shippingAddress.city}
            </p>
            {order.user?.email && (
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <Mail className="h-3 w-3" /> {order.user.email}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-gray-700"
          >
            <Printer className="h-4 w-4" /> Yazdır
          </button>
          <button
            onClick={() => router.push('/products')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Alışverişe devam <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
