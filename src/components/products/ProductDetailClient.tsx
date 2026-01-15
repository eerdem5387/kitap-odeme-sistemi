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
          price?: number | null
          attribute?: {
            id: string
            name: string
          }
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

  // Tek bir varyasyon için sepete ekleme (eski sistem - geriye dönük uyumluluk)
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

  // Attribute'ları attribute ID'ye göre grupla (her attribute için ayrı seçim)
  const getAvailableAttributes = () => {
    const attributesMap: Record<string, {
      id: string
      name: string
      values: Array<{ value: string; price?: number | null }>
    }> = {}

    product.variations?.forEach((variation) => {
      variation.attributes.forEach((attr) => {
        const attributeId = attr.attributeValue.attributeId
        const attributeName = attr.attributeValue.attribute?.name || 'Özellik'
        const value = attr.attributeValue.value
        const price = attr.attributeValue.price

        if (!attributesMap[attributeId]) {
          attributesMap[attributeId] = {
            id: attributeId,
            name: attributeName,
            values: []
          }
        }

        // Aynı değer yoksa ekle
        if (!attributesMap[attributeId].values.find(v => v.value === value)) {
          attributesMap[attributeId].values.push({ value, price })
        }
      })
    })

    // Object.values ile array'e çevir
    return Object.values(attributesMap)
  }

  // Seçili attribute değerlerinin fiyatlarını topla
  const calculateAttributePricesTotal = () => {
    let total = 0
    const availableAttributes = getAvailableAttributes()
    
    availableAttributes.forEach(attr => {
      const selectedValue = selectedAttributes[attr.id]
      if (selectedValue) {
        const valueData = attr.values.find(v => v.value === selectedValue)
        if (valueData?.price) {
          total += Number(valueData.price)
        }
      }
    })
    
    return total
  }

  const handleAttributeChange = (attributeId: string, value: string) => {
    const next = { ...selectedAttributes, [attributeId]: value }
    setSelectedAttributes(next)

    // Tüm attribute'lar seçildiğinde varyasyonu bul
    const availableAttributes = getAvailableAttributes()
    const allSelected = availableAttributes.every(attr => next[attr.id])

    if (allSelected) {
      // Tüm attribute'lar seçildiğinde, bu kombinasyona uyan varyasyonu bul
      const match = product.variations?.find((variation) => {
        // Varyasyonun tüm attribute'ları seçilen değerlerle eşleşmeli
        return variation.attributes.length === availableAttributes.length &&
               variation.attributes.every((attr) => {
                 return next[attr.attributeValue.attributeId] === attr.attributeValue.value
               })
      })
      setSelectedVariation(match || null)
    } else {
      // Tüm attribute'lar seçilmediyse varyasyonu temizle
      setSelectedVariation(null)
    }
    
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

  const attributePricesTotal = calculateAttributePricesTotal()
  const basePrice = selectedVariation ? selectedVariation.price : product.price
  const effectivePrice = basePrice + attributePricesTotal
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
                  ₺{Number(effectivePrice).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {product.productType === 'SIMPLE' &&
                  product.comparePrice &&
                  !selectedVariation && (
                    <span className="text-xl text-gray-500 line-through">
                      ₺{Number(product.comparePrice).toLocaleString('tr-TR')}
                    </span>
                  )}
              </div>
              {attributePricesTotal > 0 && (
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex items-center gap-2">
                    <span>Ana fiyat: ₺{Number(basePrice).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span>+</span>
                    <span>Seçili özellikler: ₺{Number(attributePricesTotal).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}

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
                {/* Varyasyon seçimi - Her attribute için mecburi dropdown */}
                {product.variations && product.variations.length > 0 && (
                  <div className="space-y-4">
                    {getAvailableAttributes().map((attribute) => (
                      <div key={attribute.id} className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 block">
                          {attribute.name} *
                        </label>
                        <div className="relative dropdown-container">
                          <button
                            type="button"
                            onClick={() => toggleDropdown(attribute.id)}
                            className={`w-full flex items-center justify-between px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              selectedAttributes[attribute.id]
                                ? 'border-blue-500 text-gray-900'
                                : 'border-gray-300 text-gray-500 hover:border-blue-500'
                            }`}
                          >
                            <span>
                              {selectedAttributes[attribute.id] || `Bir ${attribute.name} seçin`}
                            </span>
                            <ChevronDown
                              className={`h-4 w-4 text-gray-400 transition-transform ${
                                openDropdowns[attribute.id] ? 'rotate-180' : ''
                              }`}
                            />
                          </button>

                          {openDropdowns[attribute.id] && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              {attribute.values.map((valueData) => (
                                <button
                                  key={`${attribute.id}-${valueData.value}`}
                                  onClick={() => {
                                    handleAttributeChange(attribute.id, valueData.value)
                                    toggleDropdown(attribute.id)
                                  }}
                                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none flex items-center justify-between ${
                                    selectedAttributes[attribute.id] === valueData.value ? 'bg-blue-50 font-medium' : ''
                                  }`}
                                >
                                  <span>{valueData.value}</span>
                                  {valueData.price && (
                                    <span className="text-xs text-gray-600 ml-2">
                                      +₺{Number(valueData.price).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Seçilen varyasyon bilgisi ve sepete ekleme */}
                    {selectedVariation && (
                      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-3">
                        <div className="space-y-2">
                          <span className="text-sm font-semibold text-gray-900 block">
                            Seçilen Varyasyon:
                          </span>
                          <div className="space-y-1">
                            {selectedVariation.attributes.map((attr: any) => {
                              const attributeName = attr.attributeValue.attribute?.name || 'Özellik'
                              return (
                                <div key={attr.attributeValue.id} className="flex justify-between text-sm">
                                  <span className="text-gray-600">{attributeName}:</span>
                                  <span className="text-gray-900 font-medium">{attr.attributeValue.value}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                          <span className="text-sm font-medium text-gray-700">Fiyat:</span>
                          <span className="text-lg font-bold text-blue-600">
                            ₺{Number(selectedVariation.price).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        {selectedVariation.stock !== undefined && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Stok:</span>
                            <span className={`font-medium ${
                              selectedVariation.stock > 10 ? 'text-green-600' : 
                              selectedVariation.stock > 0 ? 'text-orange-600' : 'text-red-600'
                            }`}>
                              {selectedVariation.stock === -1 ? 'Sınırsız' : `${selectedVariation.stock} adet`}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Miktar ve sepete ekleme */}
                    <div className="flex space-x-4">
                      <div className="flex items-center border border-gray-300 rounded-lg">
                        <button
                          className="px-3 py-2 text-gray-600 hover:text-gray-900"
                          onClick={() => handleQuantityChange(quantity - 1)}
                          disabled={quantity <= 1 || !selectedVariation}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={selectedVariation?.stock === -1 ? 999 : selectedVariation?.stock || 1}
                          value={quantity}
                          onChange={(e) => {
                            const newQty = parseInt(e.target.value || '1', 10)
                            const maxStock = selectedVariation?.stock === -1 ? 999 : selectedVariation?.stock || 1
                            handleQuantityChange(Math.min(Math.max(1, newQty), maxStock))
                          }}
                          className="w-16 text-center border-none focus:ring-0"
                          disabled={!selectedVariation}
                        />
                        <button
                          className="px-3 py-2 text-gray-600 hover:text-gray-900"
                          onClick={() => {
                            const maxStock = selectedVariation?.stock === -1 ? 999 : selectedVariation?.stock || 1
                            handleQuantityChange(Math.min(maxStock, quantity + 1))
                          }}
                          disabled={!selectedVariation || (selectedVariation?.stock !== -1 && quantity >= selectedVariation.stock)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={handleAddToCart}
                        disabled={!selectedVariation}
                        className={`flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center justify-center ${
                          selectedVariation 
                            ? 'hover:bg-blue-700' 
                            : 'opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        {selectedVariation ? 'Sepete Ekle' : 'Lütfen tüm seçimleri yapın'}
                      </button>
                    </div>
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