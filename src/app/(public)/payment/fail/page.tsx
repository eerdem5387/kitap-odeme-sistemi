'use client'

export const dynamic = 'force-dynamic'

import { useSearchParams, useRouter } from 'next/navigation'

export default function PaymentFailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams.get('orderId')
  const error = searchParams.get('error')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Ödeme Başarısız</h1>
        <p className="text-gray-600 mb-4">Ödeme işleminiz tamamlanamadı.</p>
        {error && (
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
