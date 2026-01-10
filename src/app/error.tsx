'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Bir Hata Oluştu
        </h1>
        
        <p className="text-gray-600 text-center mb-6">
          Üzgünüz, beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.
        </p>
        
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-100 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Hata Detayları:</h3>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap">
              {error.message}
            </pre>
            {error.digest && (
              <p className="text-xs text-gray-500 mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}
        
        <div className="flex gap-3">
          <Button
            onClick={reset}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Tekrar Dene
          </Button>
          <Button
            onClick={() => window.location.href = '/'}
            variant="outline"
            className="flex-1"
          >
            Ana Sayfaya Dön
          </Button>
        </div>
      </div>
    </div>
  )
}
