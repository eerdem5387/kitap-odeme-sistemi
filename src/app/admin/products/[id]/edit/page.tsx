'use client'

// KALICI ÇÖZÜM: Static generation'ı kapat
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Upload } from 'lucide-react'
import { use } from 'react'

interface Product {
  id: string
  name: string
  description: string
  price: number
  comparePrice?: number
  stock: number
  sku?: string
  categoryId: string
  productType: 'SIMPLE' | 'VARIABLE'
  isActive: boolean
  isFeatured: boolean
  images: string[]
  category?: {
    id: string
    name: string
  }
  variations?: Array<{
    id: string
    sku?: string
    price: number
    stock: number
    attributes: Array<{
      attributeValue: {
        attribute: {
          name: string
        }
        value: string
      }
    }>
  }>
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id: productId } = use(params)
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>([])
  const [availableAttributes, setAvailableAttributes] = useState<Array<{
    id: string
    name: string
    type: string
    values: Array<{ id: string; value: string }>
  }>>([])
  // Basit varyasyon sistemi için state'ler
  const [variationTypes, setVariationTypes] = useState<Array<{
    id: string
    attributeId: string | null
    name: string
    values: Array<{
      id: string
      valueId: string | null
      value: string
      price: string
    }>
  }>>([])
  const [generatedVariations, setGeneratedVariations] = useState<Array<{
    id: string
    sku: string
    price: string
    stock: string
    attributes: Array<{ attributeId: string; attributeValueId: string }>
    displayName: string
  }>>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    comparePrice: '',
    stock: '',
    sku: '',
    categoryId: '',
    productType: 'SIMPLE' as 'SIMPLE' | 'VARIABLE',
    isActive: true,
    isFeatured: false,
    images: [] as string[]
  })
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [isUnlimitedStock, setIsUnlimitedStock] = useState(false)

  // Kategorileri ve attribute'ları yükle
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token')
        const [categoriesRes, attributesRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/attributes', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
        ])

        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json()
          setCategories(categoriesData)
        }

        if (attributesRes.ok) {
          const attributesData = await attributesRes.json()
          setAvailableAttributes(attributesData)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }

    fetchData()
  }, [])

  // Ürün verilerini yükle (availableAttributes yüklendikten sonra)
  useEffect(() => {
    const fetchProduct = async () => {
      // availableAttributes henüz yüklenmediyse bekle
      if (availableAttributes.length === 0) {
        return
      }

      try {
        const response = await fetch(`/api/products/${productId}`)
        if (response.ok) {
          const product: Product = await response.json()
          
          setFormData({
            name: product.name,
            description: product.description,
            price: product.price.toString(),
            comparePrice: product.comparePrice?.toString() || '',
            stock: product.stock.toString(),
            sku: product.sku || '',
            categoryId: product.categoryId,
            productType: product.productType,
            isActive: product.isActive,
            isFeatured: product.isFeatured,
            images: product.images
          })

          // Sınırsız stok durumunu kontrol et (stock = -1 ise sınırsız)
          setIsUnlimitedStock(product.stock === -1)

          // Varyasyonlu ürünse varyasyonları yükle - Yeni basit sistem
          if (product.productType === 'VARIABLE' && product.variations && product.variations.length > 0) {
            // Varyasyonlardan attribute'ları çıkar ve grupla
            const attributeMap = new Map<string, {
              attributeId: string
              attributeName: string
              values: Map<string, { valueId: string; value: string; price: number | null }>
            }>()
            
            product.variations.forEach(variation => {
              if (variation.attributes && Array.isArray(variation.attributes)) {
                variation.attributes.forEach(attr => {
                  if (attr && attr.attributeValue && attr.attributeValue.attribute) {
                    const attributeId = attr.attributeValue.attributeId || attr.attributeValue.attribute.id
                    const attributeName = attr.attributeValue.attribute.name
                    const valueId = attr.attributeValue.id
                    const value = attr.attributeValue.value
                    const price = attr.attributeValue.price
                    
                    if (!attributeMap.has(attributeId)) {
                      attributeMap.set(attributeId, {
                        attributeId,
                        attributeName,
                        values: new Map()
                      })
                    }
                    if (valueId && value) {
                      attributeMap.get(attributeId)!.values.set(valueId, { valueId, value, price })
                    }
                  }
                })
              }
            })

            // Varyasyon tiplerini oluştur
            const loadedVariationTypes = Array.from(attributeMap.values()).map((attr, index) => ({
              id: `type-${index}`,
              attributeId: attr.attributeId,
              name: attr.attributeName,
              values: Array.from(attr.values.values()).map((val, valIndex) => ({
                id: `value-${index}-${valIndex}`,
                valueId: val.valueId,
                value: val.value,
                price: val.price ? val.price.toString() : ''
              }))
            }))
            setVariationTypes(loadedVariationTypes)

            // Varyasyonları yükle
            const loadedVariations = product.variations.map(variation => {
              const displayParts: string[] = []
              const attributes: Array<{ attributeId: string; attributeValueId: string }> = []
              
              if (variation.attributes && Array.isArray(variation.attributes)) {
                variation.attributes.forEach(attr => {
                  if (attr && attr.attributeValue && attr.attributeValue.attribute) {
                    const attributeId = attr.attributeValue.attributeId || attr.attributeValue.attribute.id
                    const attributeName = attr.attributeValue.attribute.name
                    const valueId = attr.attributeValue.id
                    const value = attr.attributeValue.value
                    
                    displayParts.push(`${attributeName}: ${value}`)
                    attributes.push({ attributeId, attributeValueId: valueId })
                  }
                })
              }
              
              return {
                id: variation.id,
                sku: variation.sku || '',
                price: variation.price.toString(),
                stock: variation.stock.toString(),
                attributes,
                displayName: displayParts.join(' | ')
              }
            })
            setGeneratedVariations(loadedVariations)
          } else if (product.productType === 'VARIABLE') {
            // Varyasyonlu ürün ama henüz varyasyon yok
            setVariationTypes([])
            setGeneratedVariations([])
          }
        } else {
          showNotification('error', 'Ürün yüklenirken bir hata oluştu')
        }
      } catch (error) {
        console.error('Error fetching product:', error)
        showNotification('error', 'Ürün yüklenirken bir hata oluştu')
      } finally {
        setIsLoading(false)
      }
    }

    if (productId && availableAttributes.length > 0) {
      fetchProduct()
    }
  }, [productId, availableAttributes])

  // Toast notification gösterme fonksiyonu
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  // Yeni varyasyon tipi ekle
  const addVariationType = () => {
    const newType = {
      id: `type-${Date.now()}`,
      attributeId: null,
      name: '',
      values: []
    }
    setVariationTypes([...variationTypes, newType])
  }

  // Varyasyon tipini kaldır
  const removeVariationType = (typeId: string) => {
    setVariationTypes(variationTypes.filter(t => t.id !== typeId))
    generateVariationsFromTypes()
  }

  // Varyasyon tipi adını güncelle
  const updateVariationTypeName = (typeId: string, name: string) => {
    const updated = variationTypes.map(t => 
      t.id === typeId ? { ...t, name } : t
    )
    setVariationTypes(updated)
  }

  // Varyasyon tipine değer ekle
  const addValueToVariationType = (typeId: string) => {
    const updated = variationTypes.map(t => 
      t.id === typeId 
        ? { ...t, values: [...t.values, { id: `value-${Date.now()}`, valueId: null, value: '', price: '' }] }
        : t
    )
    setVariationTypes(updated)
  }

  // Varyasyon tipinden değer kaldır
  const removeValueFromVariationType = (typeId: string, valueId: string) => {
    const updated = variationTypes.map(t => 
      t.id === typeId 
        ? { ...t, values: t.values.filter(v => v.id !== valueId) }
        : t
    )
    setVariationTypes(updated)
    generateVariationsFromTypes()
  }

  // Varyasyon tipi değerini güncelle
  const updateVariationTypeValue = (typeId: string, valueId: string, field: 'value' | 'price', newValue: string) => {
    const updated = variationTypes.map(t => 
      t.id === typeId 
        ? { 
            ...t, 
            values: t.values.map(v => 
              v.id === valueId ? { ...v, [field]: newValue } : v
            )
          }
        : t
    )
    setVariationTypes(updated)
    generateVariationsFromTypes()
  }

  // Varyasyonları otomatik oluştur (tüm kombinasyonlar) - Sadece kombinasyonları hesapla
  const generateVariationsFromTypes = () => {
    const validTypes = variationTypes.filter(t => t.name.trim() && t.values.length > 0 && t.values.some(v => v.value.trim()))
    
    if (validTypes.length === 0) {
      // Mevcut varyasyonları koru, sadece geçersiz kombinasyonları temizle
      setGeneratedVariations(prev => prev.filter(v => {
        // Mevcut varyasyonları koru (veritabanından gelen)
        if (!v.id.startsWith('var-')) return true
        return false
      }))
      return
    }

    // Tüm kombinasyonları oluştur
    const combinations: Array<Array<{ attributeId: string | null; attributeValueId: string | null; displayName: string; tempId?: string }>> = []
    
    const generate = (current: Array<{ attributeId: string | null; attributeValueId: string | null; displayName: string; tempId?: string }>, index: number) => {
      if (index === validTypes.length) {
        combinations.push([...current])
        return
      }
      
      const type = validTypes[index]
      const validValues = type.values.filter(v => v.value.trim())
      
      for (const val of validValues) {
        generate([...current, { 
          attributeId: type.attributeId,
          attributeValueId: val.valueId,
          displayName: `${type.name}: ${val.value}`,
          tempId: val.id
        }], index + 1)
      }
    }
    
    generate([], 0)

    // Mevcut varyasyonları koru, yeni kombinasyonlar için boş varyasyonlar ekle
    const existingCombinations = new Set(
      generatedVariations
        .filter(v => !v.id.startsWith('var-')) // Sadece mevcut varyasyonları kontrol et
        .map(v => 
          v.attributes.map(a => `${a.attributeId}:${a.attributeValueId}`).sort().join('|')
        )
    )
    
    const newVariations = combinations
      .filter(combo => {
        const comboKey = combo.map(c => `${c.attributeId}:${c.attributeValueId}`).sort().join('|')
        return !existingCombinations.has(comboKey)
      })
      .map((combination, index) => ({
        id: `var-${Date.now()}-${index}`,
        sku: '',
        price: '',
        stock: '',
        attributes: combination.map(c => ({ 
          attributeId: c.attributeId || '', 
          attributeValueId: c.attributeValueId || '',
          tempId: c.tempId,
          displayName: c.displayName
        })),
        displayName: combination.map(c => c.displayName).join(' | ')
      }))

    // Mevcut varyasyonları koru, yeni olanları ekle
    setGeneratedVariations(prev => {
      const existing = prev.filter(v => !v.id.startsWith('var-'))
      return [...existing, ...newVariations]
    })
  }

  // Varyasyon güncelleme
  const updateGeneratedVariation = (index: number, field: string, value: string) => {
    const updated = [...generatedVariations]
    updated[index] = { ...updated[index], [field]: value }
    setGeneratedVariations(updated)
  }

  // Varyasyon tipleri veya değerleri değiştiğinde kombinasyonları yeniden oluştur
  useEffect(() => {
    if (formData.productType === 'VARIABLE') {
      generateVariationsFromTypes()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variationTypes, formData.productType])




  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  // Resim yükleme fonksiyonu
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    processFiles(files)
  }

  // Resim boyutlandırma fonksiyonu
  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        // 1:1 oranında 800x800 boyutunda yeniden boyutlandır
        const size = 800
        canvas.width = size
        canvas.height = size
        
        if (ctx) {
          // Resmi ortala ve kırp
          const scale = Math.max(size / img.width, size / img.height)
          const scaledWidth = img.width * scale
          const scaledHeight = img.height * scale
          const x = (size - scaledWidth) / 2
          const y = (size - scaledHeight) / 2
          
          ctx.drawImage(img, x, y, scaledWidth, scaledHeight)
          
          // Canvas'ı base64'e çevir
          const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.8)
          resolve(resizedDataUrl)
        }
      }
      
      // Blob URL yerine FileReader kullan
      const reader = new FileReader()
      reader.onload = (e) => {
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  // Dosya işleme fonksiyonu (hem upload hem drag&drop için)
  const processFiles = async (files: File[]) => {
    const validFiles = files.filter(file => {
      const isValidType = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'].includes(file.type)
      const isValidSize = file.size <= 10 * 1024 * 1024 // 10MB
      return isValidType && isValidSize
    })

    if (validFiles.length !== files.length) {
      showNotification('error', 'Bazı dosyalar geçersiz format veya boyutta')
    }

    // Geçerli dosyaları sırayla Vercel Blob'a yükle
    for (const file of validFiles) {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        if (!token) {
          showNotification('error', 'Oturum süresi doldu, lütfen tekrar giriş yapın')
          break
        }

        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/upload/image', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('Resim upload hatası:', errorData)
          showNotification('error', errorData.error || 'Resim yüklenirken bir hata oluştu')
          continue
        }

        const data = await response.json() as { url: string }

        // Önizleme için URL'yi kaydet
        setImageUrls(prev => [...prev, data.url])
        // Form verisine de ekle
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, data.url]
        }))
      } catch (error) {
        console.error('Resim yükleme hatası:', error)
        showNotification('error', 'Resim yüklenirken bir hata oluştu')
      }
    }
  }

  // Drag & Drop fonksiyonları
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.add('border-blue-500', 'bg-blue-50')
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50')
    
    const files = Array.from(e.dataTransfer.files)
    processFiles(files)
  }

  // Resim silme fonksiyonu
  const removeImage = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index))
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      // Varyasyonları hazırla - Yeni basit sistem
      let finalVariations: any[] = []
      
      if (formData.productType === 'VARIABLE') {
        // Önce tüm varyasyon tiplerini ve değerlerini veritabanına kaydet/güncelle
        const attributeValueMap = new Map<string, string>() // tempId -> realId mapping
        
        for (const type of variationTypes) {
          if (!type.name.trim() || type.values.length === 0) continue

          let attributeId = type.attributeId

          // Attribute yoksa oluştur
          if (!attributeId) {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/attributes', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ name: type.name, type: 'SELECT' })
            })

            if (response.ok) {
              const newAttribute = await response.json()
              attributeId = newAttribute.id
            } else {
              throw new Error(`Özellik "${type.name}" oluşturulamadı`)
            }
          }

          if (!attributeId) continue

          // Değerleri işle
          for (const val of type.values) {
            if (!val.value.trim()) continue

            let valueId = val.valueId

            // Value yoksa oluştur
            if (!valueId) {
              const token = localStorage.getItem('token')
              const response = await fetch(`/api/attributes/${attributeId}/values`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                  value: val.value,
                  price: val.price ? parseFloat(val.price) : null
                })
              })

              if (response.ok) {
                const newValue = await response.json()
                valueId = newValue.id
              } else {
                throw new Error(`Değer "${val.value}" oluşturulamadı`)
              }
            }

            if (valueId && val.id) {
              attributeValueMap.set(val.id, valueId)
            }
          }
        }
        
        // Geçerli varyasyonları filtrele ve gerçek ID'lerle eşleştir
        finalVariations = generatedVariations
          .filter(v => {
            const isValid = v.price.trim() !== '' && v.stock.trim() !== ''
            if (!isValid) {
              console.log('Filtered out invalid variation:', v)
            }
            return isValid
          })
          .map(v => {
            // ID kontrolü: Eğer ID geçici değilse (veritabanından gelen) gönder
            const variationId = (v.id && typeof v.id === 'string' && !v.id.startsWith('var-')) ? v.id : undefined
            
            return {
              id: variationId, // undefined gönder, API'de kontrol edilecek
              sku: v.sku || '',
              price: v.price,
              stock: v.stock,
              attributes: v.attributes.map(attr => {
                // Eğer tempId varsa ve attributeValueMap'te varsa gerçek ID'yi kullan
                const realValueId = attr.tempId && attributeValueMap.has(attr.tempId) 
                  ? attributeValueMap.get(attr.tempId)! 
                  : attr.attributeValueId
                
                return {
                  attributeId: attr.attributeId,
                  attributeValueId: realValueId
                }
              }).filter(attr => attr.attributeId && attr.attributeValueId) // Geçersiz olanları filtrele
            }
          })
          .filter(v => v.attributes.length > 0) // En az bir attribute olmalı
        
        console.log('Final variations count:', finalVariations.length)
        console.log('Final variations:', finalVariations)
        
        if (finalVariations.length === 0) {
          throw new Error('Varyasyonlu ürünler için en az bir varyasyon gereklidir. Lütfen varyasyon bilgilerini doldurun.')
        }
      }
      
      console.log('Final variations to send:', finalVariations)

      const productData = {
        ...formData,
        price: formData.productType === 'SIMPLE' ? parseFloat(formData.price) : 0,
        comparePrice: formData.productType === 'SIMPLE' && formData.comparePrice ? parseFloat(formData.comparePrice) : undefined,
        stock: formData.productType === 'SIMPLE' ? (isUnlimitedStock ? -1 : parseInt(formData.stock)) : 0,
        // Resimler artık Vercel Blob URL'leri olarak formData.images içinde tutuluyor
        images: formData.images,
        variations: formData.productType === 'VARIABLE' ? finalVariations : undefined
      }

      console.log('Sending product data:', JSON.stringify(productData, null, 2))
      console.log('Variations count:', finalVariations.length)
      console.log('Variation IDs:', finalVariations.map(v => v.id))

      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Token bulunamadı. Lütfen tekrar giriş yapın.')
      }
      
      console.log('Making API call to:', `/api/products/${productId}`)
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productData),
      })

      console.log('API Response status:', response.status)
      console.log('API Response ok:', response.ok)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Bilinmeyen hata' }))
        console.error('API Error:', errorData)
        throw new Error(errorData.error || 'Ürün güncellenirken bir hata oluştu')
      }

      const responseData = await response.json()
      console.log('API Success Response:', responseData)
      console.log('=== FORM SUBMIT SUCCESS ===')

      showNotification('success', 'Ürün başarıyla güncellendi')
      
      // Kısa bir gecikme sonrası yönlendir (kullanıcı mesajı görebilsin)
      setTimeout(() => {
        router.push('/admin/products')
      }, 1000)
    } catch (error) {
      console.error('=== FORM SUBMIT ERROR ===')
      console.error('Error updating product:', error)
      console.error('Error type:', typeof error)
      console.error('Error details:', error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error)
      showNotification('error', error instanceof Error ? error.message : 'Ürün güncellenirken bir hata oluştu')
    } finally {
      console.log('=== FORM SUBMIT FINALLY ===')
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          notification.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Link
            href="/admin/products"
            className="text-gray-600 hover:text-gray-900 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Ürün Düzenle</h1>
            <p className="text-gray-600">Ürün bilgilerini güncelleyin</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
        <form onSubmit={(e) => {
          console.log('=== FORM onSubmit EVENT TRIGGERED ===')
          console.log('Event:', e)
          console.log('Event type:', e.type)
          console.log('Event target:', e.target)
          e.preventDefault()
          console.log('Calling handleSubmit...')
          handleSubmit(e)
        }} className="space-y-4 sm:space-y-6" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ürün Adı *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                placeholder="Ürün adını girin"
              />
            </div>

            {/* SKU */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SKU (Opsiyonel)
              </label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleInputChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                placeholder="Boş bırakırsanız otomatik oluşturulur"
              />
            </div>

            {/* Price - Sadece basit ürünler için göster */}
            {formData.productType === 'SIMPLE' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fiyat *
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                  placeholder="0.00"
                />
              </div>
            )}

            {/* Compare Price - Sadece basit ürünler için göster */}
            {formData.productType === 'SIMPLE' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Karşılaştırma Fiyatı
                </label>
                <input
                  type="number"
                  name="comparePrice"
                  value={formData.comparePrice}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                  placeholder="0.00"
                />
              </div>
            )}

            {/* Stock - Sadece basit ürünler için göster */}
            {formData.productType === 'SIMPLE' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stok *
                </label>
                
                {/* Sınırsız Stok Checkbox */}
                <div className="mb-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isUnlimitedStock}
                      onChange={(e) => setIsUnlimitedStock(e.target.checked)}
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded touch-manipulation"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Sınırsız stok (Stokta gösterilecek)
                    </span>
                  </label>
                </div>

                {/* Stok Input - Sadece sınırsız değilse göster */}
                {!isUnlimitedStock && (
                  <input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleInputChange}
                    required
                    min="0"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                    placeholder="0"
                  />
                )}

                {/* Sınırsız stok seçiliyse bilgi mesajı */}
                {isUnlimitedStock && (
                  <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700">
                      ✓ Bu ürün "Stokta" olarak gösterilecek
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kategori *
              </label>
              <select
                name="categoryId"
                value={formData.categoryId}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
              >
                <option value="">Kategori seçin</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ürün Tipi *
              </label>
              <select
                name="productType"
                value={formData.productType}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
              >
                <option value="SIMPLE">Basit Ürün</option>
                <option value="VARIABLE">Varyasyonlu Ürün</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Açıklama *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows={4}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
              placeholder="Ürün açıklamasını girin"
            />
          </div>

          {/* Varyasyonlar - Sadece VARIABLE ürün tipi seçildiğinde göster */}
          {formData.productType === 'VARIABLE' && (
            <div className="border-t pt-6">
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Basit Varyasyon Sistemi
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>1. Varyasyon tiplerini ekleyin (örn: Renk, Beden)</p>
                      <p>2. Her tip için değerleri ekleyin (örn: Kırmızı, Mavi, XL, L)</p>
                      <p>3. Sistem otomatik olarak tüm kombinasyonları oluşturacak</p>
                      <p>4. Her kombinasyon için fiyat ve stok bilgilerini girin</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Varyasyon Tipleri Bölümü */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Varyasyon Tipleri</h3>
                  <button
                    type="button"
                    onClick={addVariationType}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <span>+</span>
                    Yeni Tip Ekle
                  </button>
                </div>

                {variationTypes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="mb-2">Henüz varyasyon tipi eklenmedi.</p>
                    <p className="text-sm">Yukarıdaki butona tıklayarak varyasyon tipi ekleyin (örn: Renk, Beden).</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {variationTypes.map((type) => (
                      <div key={type.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <input
                            type="text"
                            value={type.name}
                            onChange={(e) => updateVariationTypeName(type.id, e.target.value)}
                            placeholder="Varyasyon tipi adı (örn: Renk, Beden)"
                            className="text-lg font-medium text-gray-900 border-0 bg-transparent focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 flex-1"
                            onBlur={generateVariationsFromTypes}
                          />
                          <button
                            type="button"
                            onClick={() => removeVariationType(type.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium ml-2"
                          >
                            Tipi Kaldır
                          </button>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Değerler:
                            </label>
                            <button
                              type="button"
                              onClick={() => addValueToVariationType(type.id)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              + Değer Ekle
                            </button>
                          </div>

                          {type.values.length === 0 ? (
                            <p className="text-sm text-amber-600">
                              ⚠ Lütfen en az bir değer ekleyin
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {type.values.map((val) => (
                                <div key={val.id} className="flex items-center gap-2 bg-white p-2 rounded border">
                                  <input
                                    type="text"
                                    value={val.value}
                                    onChange={(e) => updateVariationTypeValue(type.id, val.id, 'value', e.target.value)}
                                    placeholder="Değer adı (örn: Kırmızı, XL)"
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    onBlur={generateVariationsFromTypes}
                                  />
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={val.price}
                                    onChange={(e) => updateVariationTypeValue(type.id, val.id, 'price', e.target.value)}
                                    placeholder="Ek fiyat (₺)"
                                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeValueFromVariationType(type.id, val.id)}
                                    className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded transition-colors"
                                    title="Değeri Sil"
                                  >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Otomatik Oluşturulan Varyasyonlar */}
              {generatedVariations.length > 0 && (
                <div className="mb-6">
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">
                          Otomatik Oluşturulan Varyasyonlar
                        </h3>
                        <p className="mt-1 text-sm text-green-700">
                          {generatedVariations.length} kombinasyon otomatik olarak oluşturuldu. Her biri için fiyat ve stok bilgilerini girin.
                        </p>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Varyasyonlar ({generatedVariations.length})
                  </h3>
                  <div className="space-y-4">
                    {generatedVariations.map((variation, index) => (
                      <div key={variation.id} className="border rounded-lg p-4 bg-white">
                        <div className="mb-3">
                          <h4 className="font-medium text-gray-900">
                            {variation.displayName}
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              SKU
                            </label>
                            <input
                              type="text"
                              value={variation.sku}
                              onChange={(e) => updateGeneratedVariation(index, 'sku', e.target.value)}
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                              placeholder="Varyasyon SKU"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Fiyat *
                            </label>
                            <input
                              type="number"
                              value={variation.price}
                              onChange={(e) => updateGeneratedVariation(index, 'price', e.target.value)}
                              step="0.01"
                              min="0"
                              required
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Stok *
                            </label>
                            <input
                              type="number"
                              value={variation.stock}
                              onChange={(e) => updateGeneratedVariation(index, 'stock', e.target.value)}
                              min="0"
                              required
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ürün Resimleri
            </label>
            
            {/* Mevcut Resimler */}
            {formData.images.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Mevcut Resimler</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {formData.images.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Ürün resmi ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            images: prev.images.filter((_, i) => i !== index)
                          }))
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resim Yükleme Alanı */}
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center transition-colors duration-200"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <p className="text-sm text-gray-600">
                    Resim yüklemek için tıklayın veya sürükleyin
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG, GIF up to 10MB
                  </p>
                  <p className="text-xs text-blue-600 mt-1 font-medium">
                    💡 Önerilen: 1:1 oranında kare resimler yükleyin
                  </p>
                </div>
              </label>
            </div>

            {/* Yüklenen Resimler */}
            {imageUrls.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Yeni Yüklenen Resimler</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {imageUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Yeni ürün resmi ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Checkboxes */}
          <div className="flex space-x-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded touch-manipulation"
              />
              <label className="ml-2 block text-sm text-gray-900">
                Aktif
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                name="isFeatured"
                checked={formData.isFeatured}
                onChange={handleInputChange}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded touch-manipulation"
              />
              <label className="ml-2 block text-sm text-gray-900">
                Öne Çıkan
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
            <Link
              href="/admin/products"
              className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors touch-manipulation min-h-[44px] flex items-center justify-center text-center"
            >
              İptal
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 touch-manipulation min-h-[44px]"
            >
              {isSaving ? 'Güncelleniyor...' : 'Ürünü Güncelle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 