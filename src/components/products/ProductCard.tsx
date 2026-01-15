'use client'

import Link from 'next/link'
import { ShoppingCart, Search } from 'lucide-react'
import { isClient } from '@/lib/browser-utils'
import { cartService } from '@/lib/cart-service'
import { useToast } from '@/hooks/useToast'
import Toast from '@/components/ui/Toast'

interface ProductCardProps {
  product: {
    id: string
    name: string
    slug: string
    price: number
    comparePrice?: number
    stock: number
    images: string[]
    category?: {
      name: string
    }
    productType: 'SIMPLE' | 'VARIABLE'
  }
}

export default function ProductCard({ product }: ProductCardProps) {
  const { toasts, removeToast, success, error } = useToast()
  const handleAddToCart = () => {
    if (!isClient) return
    
    // Varyasyonlu ürünler için ürün detay sayfasına yönlendir
    if (product.productType === 'VARIABLE') {
      window.location.assign(`/products/${product.slug}`)
      return
    }

    try {
      // cartService ile ürün ekle (SIMPLE ürün)
      cartService.addItem(
        {
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          stock: product.stock,
          images: product.images
        },
        1
      )
      success(
        'Sepete ekleme işlemi başarılı!',
        5000,
        {
          label: 'Sepete Git',
          onClick: () => {
            window.location.href = '/cart'
          }
        }
      )
    } catch (err: unknown) {
      console.error('Sepete ekleme hatası:', err)
      error('Sepete eklenirken bir hata oluştu. Lütfen tekrar deneyin.')
    }
  }

  return (
    <>
    <div className="group bg-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg overflow-hidden hover:shadow-xl sm:hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 sm:hover:-translate-y-2 active:scale-[0.98]">
      <Link href={`/products/${product.slug}`} className="block touch-manipulation">
        <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden">
          {product.images && product.images.length > 0 ? (
            <img 
              src={product.images[0]} 
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <img
              src="/placeholder-product.svg"
              alt="Ürün görseli yok"
              className="w-full h-full object-cover opacity-60"
              loading="lazy"
            />
          )}
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
        </div>
      </Link>
      
      <div className="p-3 sm:p-4 lg:p-6">
        <Link href={`/products/${product.slug}`} className="block touch-manipulation">
          <h3 className="font-bold text-gray-900 mb-2 sm:mb-3 hover:text-gray-600 transition-colors text-sm sm:text-base lg:text-lg leading-tight line-clamp-2">
            {product.name}
          </h3>
        </Link>
        
        {product.category && (
          <p className="text-xs sm:text-sm text-gray-600 bg-gray-50 px-2 sm:px-3 py-1 rounded-full inline-block mb-2 sm:mb-3 lg:mb-4 font-medium">
            {product.category.name}
          </p>
        )}
        
        {/* Stock Badge */}
        {product.stock !== -1 && product.stock <= 10 && product.stock > 0 && product.productType !== 'VARIABLE' && (
          <div className="mb-2 sm:mb-3">
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">
              Son {product.stock} adet!
            </span>
          </div>
        )}
        {product.stock === 0 && product.productType !== 'VARIABLE' && (
          <div className="mb-2 sm:mb-3">
            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
              Stokta Yok
            </span>
          </div>
        )}
        
        <div className="space-y-2 sm:space-y-3 lg:space-y-4">
          <div>
            {product.productType === 'VARIABLE' ? (
              <span className="text-sm sm:text-base text-gray-600 bg-gray-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg inline-block">
                Fiyatı görmek için seçenekleri seçin
              </span>
            ) : (
              <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
                <span className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  ₺{Number(product.price).toLocaleString('tr-TR')}
                </span>
                {product.comparePrice && (
                  <span className="text-xs sm:text-sm text-gray-500 line-through bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                    ₺{Number(product.comparePrice).toLocaleString('tr-TR')}
                  </span>
                )}
              </div>
            )}
          </div>
          
          <button 
            onClick={handleAddToCart}
            className={`w-full px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 flex items-center justify-center transform active:scale-95 hover:scale-105 touch-manipulation min-h-[44px] ${
              product.productType === 'VARIABLE' 
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-md sm:shadow-lg' 
                : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white hover:from-gray-600 hover:to-gray-700 shadow-md sm:shadow-lg'
            }`}
          >
            {product.productType === 'VARIABLE' ? (
              <>
                <Search className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 flex-shrink-0" />
                <span className="truncate">Seçenekleri Seç</span>
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 flex-shrink-0" />
                <span className="truncate">Sepete Ekle</span>
              </>
            )}
          </button>
        </div>
        
        {product.productType === 'VARIABLE' && (
          <div className="mt-2 text-center">
            <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
              Seçenekler Mevcut
            </span>
          </div>
        )}
      </div>
    </div>
    <Toast toasts={toasts} onRemove={removeToast} />
    </>
  )
} 