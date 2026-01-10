'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center px-4">
        <div className="mb-8">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Bir Hata Oluştu
          </h1>
          <p className="text-gray-600 mb-4">
            Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <details className="text-left bg-gray-100 p-4 rounded-lg mb-4">
              <summary className="cursor-pointer font-medium text-gray-700">
                Hata Detayları
              </summary>
              <pre className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">
                {error.message}
              </pre>
            </details>
          )}
        </div>

        <div className="space-y-4">
          <button
            onClick={reset}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Tekrar Dene
          </button>

          <Link
            href="/"
            className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
          >
            <Home className="h-5 w-5 mr-2" />
            Ana Sayfaya Dön
          </Link>
        </div>

        <div className="mt-12 text-sm text-gray-500">
          <p>Sorun devam ediyor mu?</p>
          <Link href="/contact" className="text-blue-600 hover:text-blue-700">
            Destek ekibimizle iletişime geçin
          </Link>
        </div>
      </div>
    </div>
  )
} 