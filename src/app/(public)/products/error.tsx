'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('Products page error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="flex justify-center mb-6">
            <div className="bg-red-100 p-4 rounded-full">
              <AlertCircle className="h-12 w-12 text-red-600" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Bir Hata Oluştu
          </h1>
          
          <p className="text-gray-600 mb-6">
            Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.
          </p>

          <div className="space-y-3">
            <button
              onClick={reset}
              className="w-full flex items-center justify-center px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors font-semibold"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Tekrar Dene
            </button>
            
            <Link
              href="/"
              className="w-full flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-semibold"
            >
              <Home className="h-5 w-5 mr-2" />
              Ana Sayfaya Dön
            </Link>
          </div>

          <p className="mt-6 text-sm text-gray-500">
            Sorun devam ediyor mu?{' '}
            <Link href="/contact" className="text-blue-600 hover:text-blue-700 font-medium">
              Destek ekibimizle iletişime geçin
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

