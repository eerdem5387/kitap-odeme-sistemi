import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-blue-100 rounded-full mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.709M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Sayfa Bulunamadı
        </h2>
        
        <p className="text-gray-600 mb-6">
          Aradığınız sayfa mevcut değil veya taşınmış olabilir.
        </p>
        
        <div className="flex gap-3 justify-center">
          <Button asChild>
            <Link href="/">
              Ana Sayfaya Dön
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/products">
              Ürünleri Görüntüle
            </Link>
          </Button>
        </div>
        
        <div className="mt-8 text-sm text-gray-500">
          <p>Yardıma mı ihtiyacınız var?</p>
          <Link href="/contact" className="text-blue-600 hover:text-blue-800">
            İletişime Geçin
          </Link>
        </div>
      </div>
    </div>
  )
}
