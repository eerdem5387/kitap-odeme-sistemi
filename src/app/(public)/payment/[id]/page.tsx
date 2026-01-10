'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { CreditCard, Lock, CheckCircle, AlertCircle, ArrowLeft, User } from 'lucide-react'

interface Order {
  id: string
  orderNumber: string
  totalAmount: number
  finalAmount: number
  status: string
  paymentStatus: string
  items: Array<{
    id: string
    product: {
      name: string
      images: string[]
    }
    variation?: {
      id: string
      attributes: Array<{
        attributeValue: {
          attributeId: string
          value: string
        }
      }>
    }
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
}

export default function PaymentPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string
  
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  
  // Payment form state
  const [cardNumber, setCardNumber] = useState('')
  const [cardHolder, setCardHolder] = useState('')
  const [expiryMonth, setExpiryMonth] = useState('')
  const [expiryYear, setExpiryYear] = useState('')
  const [cvv, setCvv] = useState('')

  // Provider'ı env'den al, yoksa default ziraat olsun (gerçek projede)
  const provider = process.env.NEXT_PUBLIC_PAYMENT_PROVIDER || 'ziraat'

  useEffect(() => {
    fetchOrder()
  }, [orderId])

  const fetchOrder = async () => {
    try {
      const token = localStorage.getItem('token')
      const guestEmail = localStorage.getItem('userEmail') || ''

      const url = token
        ? `/api/orders/${orderId}`
        : `/api/orders/${orderId}?guest=${encodeURIComponent(guestEmail)}`

      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Sipariş bulunamadı')
      }

      const orderData = await response.json()
      setOrder(orderData)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Sipariş yüklenirken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePayment = async () => {
    try {
      setIsProcessing(true)
      setError('')
      const token = localStorage.getItem('token')
      const guestEmail = localStorage.getItem('userEmail') || ''

      // Ödeme başlatma isteği
      const payload = {
        orderId,
        amount: order?.finalAmount ? Number(order.finalAmount) : 0,
        method: 'CREDIT_CARD',
        guestEmail: !token ? guestEmail : undefined,
        // Kart bilgilerini Ziraat Hosting modelinde göndermiyoruz, banka sayfasında girilecek.
        // Eğer API modeline geçilirse burada alınır.
      }

      const res = await fetch('/api/payment/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Ödeme başlatılamadı')
      }

      if (data.success && data.requiresRedirect && data.redirectUrl && data.formParams) {
        // Ziraat Bankası Form Post İşlemi
        const form = document.createElement('form')
        form.method = 'POST'
        form.action = data.redirectUrl
        // form.target = '_blank' // İsteğe bağlı yeni sekme
        form.style.display = 'none'

        Object.entries(data.formParams).forEach(([key, value]) => {
          const input = document.createElement('input')
          input.type = 'hidden'
          input.name = key
          input.value = String(value)
          form.appendChild(input)
        })

        document.body.appendChild(form)
        form.submit()
      } else {
        throw new Error('Ödeme parametreleri alınamadı')
      }

    } catch (err: any) {
      setError(err?.message || 'Ödeme başlatılamadı')
      setIsProcessing(false)
    }
  }

  // ... Helper functions (formatCardNumber, getProductDisplayName) same as before ...
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    if (parts.length) {
      return parts.join(' ')
    } else {
      return v
    }
  }

  const getProductDisplayName = (item: any) => {
    if (item.variation) {
      const variationDetails = item.variation.attributes.map((attr: any) => {
        return `${attr.attributeValue.attributeId}: ${attr.attributeValue.value}`
      }).join(', ')
      return `${item.product.name} - ${variationDetails}`
    }
    return item.product.name
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

  if (!order) return null // Should be handled by error state above

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 pb-20 lg:pb-0">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => router.push('/checkout')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors font-medium"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Teslimat Bilgilerine Geri Dön
            </button>
          </div>
          <div className="flex items-center space-x-3 sm:space-x-4 mb-4 sm:mb-6">
            <div className="bg-green-600 p-2.5 sm:p-3 rounded-full">
              <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Ödeme</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Sipariş #{order.orderNumber}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* Payment Form */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center mb-6 pb-4 border-b border-gray-200">
              <div className="bg-blue-100 p-2 rounded-lg mr-3">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Güvenli Ödeme</h2>
                <p className="text-sm text-gray-500 mt-1">Ziraat Bankası Güvencesiyle</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center">
                <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-5">
                <div className="flex items-center mb-2">
                  <Lock className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="text-sm font-bold text-blue-900">3D Secure ile Ödeme</h3>
                </div>
                <p className="text-sm text-blue-800">
                  Kart bilgilerinizi bankanın güvenli ödeme sayfasında gireceksiniz.
                </p>
              </div>

              <button
                onClick={handlePayment}
                disabled={isProcessing || !order || !order.finalAmount}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 sm:py-4 px-4 rounded-xl font-semibold hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center touch-manipulation min-h-[52px] text-sm sm:text-base"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Yönlendiriliyor...
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5 mr-2" />
                    Ödemeyi Başlat
                  </>
                )}
              </button>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-100 rounded-xl">
              <div className="flex items-center text-sm text-blue-800">
                <Lock className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="font-medium">Ödeme bilgileriniz SSL ile şifrelenerek güvenli şekilde işlenir.</span>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl border border-gray-100 p-4 sm:p-6 sticky bottom-20 lg:bottom-auto lg:top-8 z-40 lg:z-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-200">Sipariş Özeti</h2>
            
            {/* Order Items */}
            <div className="space-y-4 mb-6">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {item.product.images && item.product.images[0] ? (
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                        <span className="text-xs text-gray-500">Resim</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">{getProductDisplayName(item)}</h3>
                    <p className="text-sm text-gray-500">Adet: {item.quantity}</p>
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    ₺{item.totalPrice.toLocaleString('tr-TR')}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Totals */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Ara Toplam</span>
                <span className="font-medium">₺{order.totalAmount.toLocaleString('tr-TR')}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Kargo</span>
                <span className="font-medium">
                  {order.finalAmount > order.totalAmount ? 
                    `₺${(order.finalAmount - order.totalAmount).toLocaleString('tr-TR')}` : 
                    'Ücretsiz'
                  }
                </span>
              </div>
              
              <div className="border-t pt-2">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold text-gray-900">Toplam</span>
                  <span className="text-lg font-semibold text-gray-900">
                    ₺{order.finalAmount.toLocaleString('tr-TR')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
