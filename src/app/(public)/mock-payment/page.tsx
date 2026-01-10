'use client'

// KALICI ÇÖZÜM: Static generation'ı kapat
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CreditCard, CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function MockPaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const orderId = searchParams.get('orderId')
  const amount = searchParams.get('amount')
  const transactionId = searchParams.get('transactionId')
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentResult, setPaymentResult] = useState<'success' | 'fail' | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!orderId || !amount || !transactionId) {
      setError('Geçersiz ödeme bilgileri')
      return
    }

    // 3 saniye sonra ödeme sonucunu simüle et
    const timer = setTimeout(() => {
      simulatePayment()
    }, 3000)

    return () => clearTimeout(timer)
  }, [orderId, amount, transactionId])

  const simulatePayment = async () => {
    setIsProcessing(true)
    
    try {
      // %80 başarı oranı ile simüle et
      const isSuccess = Math.random() > 0.2
      
      if (isSuccess) {
        setPaymentResult('success')
        
        // Başarılı ödeme callback'i gönder
        await sendPaymentCallback('success')
        
        // 2 saniye sonra başarı sayfasına yönlendir
        setTimeout(() => {
          router.push(`/payment/success?orderId=${orderId}`)
        }, 2000)
      } else {
        setPaymentResult('fail')
        
        // Başarısız ödeme callback'i gönder
        await sendPaymentCallback('fail')
        
        // 2 saniye sonra hata sayfasına yönlendir
        setTimeout(() => {
          router.push(`/payment/fail?orderId=${orderId}&error=${encodeURIComponent('Mock ödeme başarısız')}`)
        }, 2000)
      }
    } catch (error) {
      console.error('Mock payment simulation error:', error)
      setError('Ödeme simülasyonu sırasında hata oluştu')
    } finally {
      setIsProcessing(false)
    }
  }

  const sendPaymentCallback = async (status: 'success' | 'fail') => {
    try {
      const callbackData = {
        orderId: orderId,
        amount: amount,
        transactionId: transactionId,
        status: status
      }

      const response = await fetch('/api/payment/mock/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(callbackData)
      })

      if (!response.ok) {
        console.error('Mock callback failed:', response.statusText)
      }
    } catch (error) {
      console.error('Mock callback error:', error)
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Hata</h1>
            <p className="text-gray-600 mb-6">{error}</p>
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          {isProcessing && !paymentResult && (
            <>
              <Loader2 className="h-16 w-16 text-blue-500 mx-auto mb-4 animate-spin" />
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Mock Ödeme İşleniyor</h1>
              <p className="text-gray-600 mb-6">
                Ödeme işleminiz simüle ediliyor...
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-medium text-blue-800 mb-2">Test Bilgileri</h3>
                <div className="text-sm text-blue-700 space-y-1">
                  <div>Sipariş No: {orderId}</div>
                  <div>Tutar: ₺{Number(amount).toLocaleString('tr-TR')}</div>
                  <div>Transaction ID: {transactionId}</div>
                </div>
              </div>
            </>
          )}

          {paymentResult === 'success' && (
            <>
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Mock Ödeme Başarılı!</h1>
              <p className="text-gray-600 mb-6">
                Test ödeme işleminiz başarıyla tamamlandı.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-medium text-green-800 mb-2">Ödeme Detayları</h3>
                <div className="text-sm text-green-700 space-y-1">
                  <div>Sipariş No: {orderId}</div>
                  <div>Tutar: ₺{Number(amount).toLocaleString('tr-TR')}</div>
                  <div>Transaction ID: {transactionId}</div>
                  <div>Durum: Başarılı</div>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Başarı sayfasına yönlendiriliyorsunuz...
              </p>
            </>
          )}

          {paymentResult === 'fail' && (
            <>
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Mock Ödeme Başarısız</h1>
              <p className="text-gray-600 mb-6">
                Test ödeme işleminiz başarısız oldu.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-medium text-red-800 mb-2">Hata Detayları</h3>
                <div className="text-sm text-red-700 space-y-1">
                  <div>Sipariş No: {orderId}</div>
                  <div>Tutar: ₺{Number(amount).toLocaleString('tr-TR')}</div>
                  <div>Transaction ID: {transactionId}</div>
                  <div>Durum: Başarısız</div>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Hata sayfasına yönlendiriliyorsunuz...
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
