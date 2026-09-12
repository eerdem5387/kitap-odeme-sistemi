'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function PaymentFailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams.get('orderId')
  const error = searchParams.get('error')
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) return
    let cancelled = false
    let attempts = 0

    const check = async () => {
      const token = localStorage.getItem('token')
      const guestEmail = localStorage.getItem('userEmail') || ''
      const url = token
        ? `/api/orders/${orderId}`
        : `/api/orders/${orderId}?guest=${encodeURIComponent(guestEmail)}`
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: 'no-store'
      })
      if (!res.ok) return
      const data = await res.json()
      if (cancelled) return
      setStatus(data.paymentStatus || null)
      if (data.paymentStatus === 'COMPLETED') {
        router.replace(`/payment/success?orderId=${orderId}`)
      }
    }

    check()
    const timer = window.setInterval(() => {
      attempts += 1
      if (attempts > 36) {
        window.clearInterval(timer)
        return
      }
      check()
    }, 10000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [orderId, router])

  const bankRejected = status === 'FAILED'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {bankRejected ? 'Banka Ödemeyi Reddetti' : 'Ödeme Sonucu Bekleniyor'}
        </h1>
        <p className="text-gray-600 mb-4">
          {bankRejected
            ? 'Banka işlemi reddetti. Kartınızdan çekim olmadıysa aynı siparişle tekrar deneyebilirsiniz.'
            : 'Kart çekimi bankada görünüyorsa kayıt birkaç dakika içinde otomatik oluşur. Bu ekran başarısız ödeme demek değildir.'}
        </p>
        {error && bankRejected && (
          <p className="text-sm text-red-600 mb-6">Hata: {decodeURIComponent(error)}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {orderId ? (
            <button
              onClick={() => router.push(`/payment/${orderId}`)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Aynı siparişi tekrar öde
            </button>
          ) : (
            <button
              onClick={() => router.push('/checkout')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Ödemeyi tekrar dene
            </button>
          )}
          <button
            onClick={() => router.push('/products')}
            className="bg-gray-100 text-gray-800 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Ürünlere Dön
          </button>
        </div>
      </div>
    </div>
  )
}
