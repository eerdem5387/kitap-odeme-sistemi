'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight, CheckCircle } from 'lucide-react'
import { isClient } from '@/lib/browser-utils'
import { cartService, CartItem } from '@/lib/cart-service'

export default function CartPage() {
  const router = useRouter()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [shippingCost, setShippingCost] = useState<number>(29.99)
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number>(500)

  useEffect(() => {
    loadCart()
    
    const handleCartUpdate = () => loadCart()
    window.addEventListener('cartUpdated', handleCartUpdate)
    
    // Sayfa görünür olduğunda kargo ayarlarını yenile
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadShippingSettings()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Sayfa focus olduğunda kargo ayarlarını yenile
    const handleFocus = () => {
      loadShippingSettings()
    }
    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const loadShippingSettings = () => {
    if (!isClient) return
    
    // Kargo ayarlarını yükle
    fetch('/api/settings?category=shipping')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) return
        const shippingSettings = data.shipping || {}
        if (typeof shippingSettings.defaultShippingCost === 'number') {
          setShippingCost(shippingSettings.defaultShippingCost)
        }
        if (typeof shippingSettings.freeShippingThreshold === 'number') {
          setFreeShippingThreshold(shippingSettings.freeShippingThreshold)
        }
      })
      .catch(err => {
        console.error('Shipping settings load error (cart):', err)
      })
  }

  const loadCart = () => {
    if (!isClient) return
    const cart = cartService.getCart()
    setCartItems(cart.items)
    setIsLoading(false)
    
    // Kargo ayarlarını da yükle
    loadShippingSettings()
  }

  const updateQuantity = (itemId: string, quantity: number, variationId?: string) => {
    cartService.updateQuantity(itemId, quantity, variationId)
    // Event listener will update state
  }

  const removeItem = (itemId: string, variationId?: string) => {
    cartService.removeItem(itemId, variationId)
  }

  const clearCart = () => {
    if (confirm('Sepeti temizlemek istediğinize emin misiniz?')) {
      cartService.clearCart()
    }
  }

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const shipping = (() => {
    if (!isFinite(freeShippingThreshold) || freeShippingThreshold <= 0) {
      return shippingCost
    }
    return subtotal >= freeShippingThreshold ? 0 : shippingCost
  })()
  const total = subtotal + shipping

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

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gray-100 rounded-full mb-6">
              <ShoppingCart className="h-12 w-12 text-gray-400" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Sepetiniz Boş</h2>
            <p className="text-gray-600 mb-8">Sepetinize henüz ürün eklemediniz.</p>
            <Link
              href="/products"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Alışverişe Başla
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 pb-20 lg:pb-0">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Page Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-4">
            <div className="bg-blue-600 p-2.5 sm:p-3 rounded-full">
              <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Sepetim</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">{cartItems.length} ürün</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            {cartItems.map((item) => (
              <div key={item.variationId ? `${item.id}-${item.variationId}` : item.id} className="bg-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg border border-gray-100 p-3 sm:p-4 lg:p-6 hover:shadow-lg sm:hover:shadow-xl transition-shadow">
                <div className="flex items-start sm:items-center space-x-3 sm:space-x-4">
                  {/* Product Image */}
                  <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gray-100 rounded-lg sm:rounded-xl overflow-hidden border-2 border-gray-200">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gradient-to-br from-gray-50 to-gray-100">
                        <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10" />
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 line-clamp-2 mb-1">
                        <Link href={`/products/${item.slug}`} className="hover:text-blue-600 transition-colors">
                            {item.name}
                        </Link>
                    </h3>
                    {item.variationOptions && (
                        <p className="text-xs text-gray-500 mb-1 bg-gray-100 inline-block px-2 py-1 rounded-md">
                            {item.variationOptions}
                        </p>
                    )}
                    <p className="text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3">
                      Birim: <span className="font-semibold text-gray-700">{item.price.toFixed(2)} ₺</span>
                    </p>

                  {/* Quantity Controls */}
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <span className="text-xs text-gray-500 font-medium hidden sm:inline">Adet:</span>
                      <div className="flex items-center border-2 border-gray-200 rounded-lg">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1, item.variationId)}
                          className="p-2 sm:p-2.5 rounded-l-lg hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                      disabled={item.quantity <= 1}
                          aria-label="Azalt"
                    >
                      <Minus className="h-4 w-4 text-gray-600" />
                    </button>
                        <span className="w-10 sm:w-12 text-center font-bold text-gray-900 text-sm sm:text-base">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1, item.variationId)}
                          className="p-2 sm:p-2.5 rounded-r-lg hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                          aria-label="Artır"
                          disabled={item.quantity >= item.stock}
                    >
                      <Plus className="h-4 w-4 text-gray-600" />
                    </button>
                      </div>
                    </div>
                  </div>

                  {/* Price & Remove */}
                  <div className="flex flex-col items-end space-y-2 sm:space-y-3">
                    <p className="text-base sm:text-lg lg:text-xl font-bold text-blue-600 whitespace-nowrap">
                      {(item.price * item.quantity).toFixed(2)} ₺
                    </p>
                    <button
                      onClick={() => removeItem(item.id, item.variationId)}
                      className="p-2 text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors border-2 border-transparent hover:border-red-200 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                      aria-label="Sepetten Kaldır"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Clear Cart Button */}
            {cartItems.length > 0 && (
            <button
              onClick={clearCart}
                className="w-full py-3 text-red-600 hover:bg-red-50 active:bg-red-100 rounded-xl transition-colors text-sm font-semibold border-2 border-red-200 hover:border-red-300 touch-manipulation min-h-[44px]"
            >
              Sepeti Temizle
            </button>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl border border-gray-100 p-4 sm:p-6 sticky bottom-20 lg:bottom-auto lg:top-8 z-40 lg:z-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-200">Sipariş Özeti</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Ara Toplam</span>
                  <span className="font-semibold text-gray-900">{subtotal.toFixed(2)} ₺</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Kargo</span>
                  <span className="font-semibold flex items-center">
                    {shipping === 0 ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                        <span className="text-green-600">Ücretsiz</span>
                      </>
                    ) : (
                      <span className="text-gray-900">{shipping.toFixed(2)} ₺</span>
                    )}
                  </span>
                </div>
                <div className="border-t-2 border-gray-200 pt-4 flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Toplam</span>
                  <span className="text-xl font-bold text-blue-600">{total.toFixed(2)} ₺</span>
                </div>
              </div>

              <button
                onClick={() => router.push('/checkout')}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 sm:py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center touch-manipulation min-h-[52px] text-sm sm:text-base"
              >
                Siparişi Tamamla
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </button>

              <Link
                href="/products"
                className="mt-4 block text-center text-blue-600 hover:text-blue-700 text-sm font-semibold transition-colors"
              >
                ← Alışverişe Devam Et
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
