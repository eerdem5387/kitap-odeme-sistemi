'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, ChevronDown } from 'lucide-react'
import { safeDocument, isClient } from '@/lib/browser-utils'
import { cartService } from '@/lib/cart-service'
import { useToast } from '@/hooks/useToast'
import Toast from '@/components/ui/Toast'

interface ProductDetailClientProps {
  product: {
    id: string
    name: string
    slug: string
    description: string
    price: number
    comparePrice?: number
    stock: number
    sku?: string
    images: string[]
    productType: 'SIMPLE' | 'VARIABLE'
    category?: {
      name: string
    }
    variations?: Array<{
      id: string
      price: number
      stock: number
      sku?: string
      attributes: Array<{
        attributeValue: {
          attributeId: string
          value: string
        }
      }>
    }>
  }
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedVariation, setSelectedVariation] = useState<any>(null)
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({})
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({})

  const { toasts, removeToast, success, error } = useToast()

  const handleAddToCart = () => {
    if (!isClient) return

    try {
      cartService.addItem(
        {
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: selectedVariation ? selectedVariation.price : product.price,
          stock: selectedVariation ? selectedVariation.stock : product.stock,
          images: product.images
        },
        quantity,
        selectedVariation || undefined
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
    } catch (err) {
      console.error('Sepete ekleme hatası:', err)
      error('Sepete eklenirken bir hata oluştu. Lütfen tekrar deneyin.')
    }
  }

  const handleQuantityChange = (newQuantity: number) => {
    const maxStock =
      selectedVariation?.stock === -1
        ? 999
        : selectedVariation
        ? selectedVariation.stock
        : product.stock === -1
        ? 999
        : product.stock

    if (newQuantity >= 1 && newQuantity <= maxStock) {
      setQuantity(newQuantity)
    }
  }

  const getAttributeDisplayName = (attributeId: string) => {
    const map: Record<string, string> = {
      cmdpvbew6000qlaulvoazkpgu: 'Öğrenci',
      renk: 'Renk',
      beden: 'Beden',
      boyut: 'Boyut',
      model: 'Model',
      tip: 'Tip',
      kategori: 'Kategori'
    }
    return map[attributeId] || 'Özellik'
  }

  const getAvailableAttributes = () => {
    const attributes: Record<string, string[]> = {}

    product.variations?.forEach((variation) => {
      variation.attributes.forEach((attr) => {
        const name = getAttributeDisplayName(attr.attributeValue.attributeId)
        const value = attr.attributeValue.value
        if (!attributes[name]) attributes[name] = []
        if (!attributes[name].includes(value)) attributes[name].push(value)
      })
    })

    return attributes
  }

  const handleAttributeChange = (attributeName: string, value: string) => {
    const next = { ...selectedAttributes, [attributeName]: value }
    setSelectedAttributes(next)

    const match = product.variations?.find((variation) =>
      variation.attributes.every((attr) => {
        const name = getAttributeDisplayName(attr.attributeValue.attributeId)
        return next[name] === attr.attributeValue.value
      })
    )

    setSelectedVariation(match || null)
    setQuantity(1)
  }

  const toggleDropdown = (attributeName: string) => {
    setOpenDropdowns((prev) => ({ ...prev, [attributeName]: !prev[attributeName] }))
  }

  useEffect(() => {
    if (!isClient) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.dropdown-container')) {
        setOpenDropdowns({})
      }
    }

    safeDocument.addEventListener('mousedown', handleClickOutside as any)
    return () => {
      safeDocument.removeEventListener('mousedown', handleClickOutside as any)
    }
  }, [])

  const effectivePrice = selectedVariation ? selectedVariation.price : product.price
  const effectiveStock = selectedVariation?.stock ?? product.stock

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Görseller */}
        <div className="space-y-4">
          <div className="aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg overflow-hidden">
            {product.images?.length ? (
              <img
                src={product.images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src="/placeholder-product.svg"
                alt="Ürün görseli yok"
                className="w-full h-full object-contain p-8 opacity-60"
              />
            )}
          </div>

          {product.images && product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg overflow-hidden ${
                    selectedImage === index ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ürün Bilgileri */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
            {product.category && (
              <p className="text-lg text-gray-600">{product.category.name}</p>
            )}
          </div>

          {/* Fiyat ve stok – varyasyonlu üründe sadece seçimden sonra göster */}
          {(product.productType === 'SIMPLE' || selectedVariation) && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-3xl font-bold text-gray-900">
                  ₺{Number(effectivePrice).toLocaleString('tr-TR')}
                </span>
                {product.productType === 'SIMPLE' &&
                  product.comparePrice &&
                  !selectedVariation && (
                    <span className="text-xl text-gray-500 line-through">
                      ₺{Number(product.comparePrice).toLocaleString('tr-TR')}
                    </span>
                  )}
              </div>

              <div className="flex items-center space-x-2">
                {effectiveStock === -1 && (
                  <>
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <span className="text-sm font-medium text-green-700">Sınırsız stok</span>
                  </>
                )}
                {effectiveStock > 10 && effectiveStock !== -1 && (
                  <>
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <span className="text-sm font-medium text-green-700">
                      Stokta: {effectiveStock} adet
                    </span>
                  </>
                )}
                {effectiveStock > 0 && effectiveStock <= 10 && (
                  <>
                    <div className="w-3 h-3 bg-orange-500 rounded-full" />
                    <span className="text-sm font-medium text-orange-700">
                      Son {effectiveStock} adet!
                    </span>
                  </>
                )}
                {effectiveStock === 0 && (
                  <>
                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                    <span className="text-sm font-medium text-red-700">Stokta yok</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Sepete ekleme alanı */}
          <div className="space-y-4">
            {product.productType === 'VARIABLE' ? (
              <div className="space-y-4">
                {/* Öğrenci / varyasyon seçimi */}
                {product.variations && product.variations.length > 0 && (
                  <div className="space-y-4">
                    {Object.entries(getAvailableAttributes()).map(([attributeName, values]) => {
                      const displayName =
                        attributeName === 'Özellik' || attributeName === 'Öğrenci'
                          ? 'Öğrenciler'
                          : attributeName

                      return (
                        <div key={attributeName} className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">
                            {displayName}:
                          </label>
                          <div className="relative dropdown-container">
                            <button
                              type="button"
                              onClick={() => toggleDropdown(attributeName)}
                              className="w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <span
                                className={
                                  selectedAttributes[attributeName]
                                    ? 'text-gray-900'
                                    : 'text-gray-500'
                                }
                              >
                                {selectedAttributes[attributeName] || 'Seçiniz'}
                              </span>
                              <ChevronDown
                                className={`h-4 w-4 text-gray-400 transition-transform ${
                                  openDropdowns[attributeName] ? 'rotate-180' : ''
                                }`}
                              />
                            </button>

                            {openDropdowns[attributeName] && (
                              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {values.map((value) => (
                                  <button
                                    key={`${attributeName}-${value}`}
                                    onClick={() => {
                                      handleAttributeChange(attributeName, value)
                                      toggleDropdown(attributeName)
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                                  >
                                    {value}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {selectedVariation && (
                      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">
                            Seçilen Öğrenci:
                          </span>
                          <span className="text-sm text-gray-600">
                            {selectedVariation.attributes
                              .map(
                                (attr: any) =>
                                  `${getAttributeDisplayName(
                                    attr.attributeValue.attributeId
                                  )}: ${attr.attributeValue.value}`
                              )
                              .join(', ')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Fiyat:</span>
                          <span className="text-lg font-bold text-gray-900">
                            ₺{Number(selectedVariation.price).toLocaleString('tr-TR')}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-4">
                      <div className="flex items-center border border-gray-300 rounded-lg">
                        <button
                          className="px-3 py-2 text-gray-600 hover:text-gray-900"
                          onClick={() => handleQuantityChange(quantity - 1)}
                          disabled={quantity <= 1}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={quantity}
                          onChange={(e) =>
                            handleQuantityChange(parseInt(e.target.value || '1', 10))
                          }
                          className="w-16 text-center border-none focus:ring-0"
                        />
                        <button
                          className="px-3 py-2 text-gray-600 hover:text-gray-900"
                          onClick={() => handleQuantityChange(quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={handleAddToCart}
                        disabled={!selectedVariation}
                        className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        Sepete Ekle
                      </button>
                    </div>

                    {!selectedVariation && (
                      <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">
                        Lütfen öğrenciyi seçin
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex space-x-4">
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    className="px-3 py-2 text-gray-600 hover:text-gray-900"
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= 1}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) =>
                      handleQuantityChange(parseInt(e.target.value || '1', 10))
                    }
                    className="w-16 text-center border-none focus:ring-0"
                  />
                  <button
                    className="px-3 py-2 text-gray-600 hover:text-gray-900"
                    onClick={() => handleQuantityChange(quantity + 1)}
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Sepete Ekle
                </button>
              </div>
            )}
          </div>

          {/* Açıklama */}
          <div className="border-t pt-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <span className="w-1 h-8 bg-blue-600 mr-3 rounded-full" />
              Ürün Açıklaması
            </h2>
            <div className="bg-gradient-to-r from-gray-50 to-white p-6 rounded-xl border border-gray-200">
              <p className="text-gray-700 leading-relaxed text-base whitespace-pre-line">
                {product.description}
              </p>
            </div>
          </div>

          {/* Detaylar */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ürün Detayları</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">SKU:</span>
                <span className="ml-2 text-gray-900">{product.sku || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">Kategori:</span>
                <span className="ml-2 text-gray-900">{product.category?.name || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">Ürün Tipi:</span>
                <span className="ml-2 text-gray-900">
                  {product.productType === 'SIMPLE' ? 'Basit Ürün' : 'Varyasyonlu Ürün'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  )
}