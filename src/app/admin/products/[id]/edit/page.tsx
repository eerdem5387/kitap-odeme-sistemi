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
  const [selectedAttributes, setSelectedAttributes] = useState<Array<{
    attributeId: string
    attributeName: string
    selectedValues: string[] // attributeValue ID'leri
  }>>([])
  const [variations, setVariations] = useState<Array<{
    id: string
    sku: string
    price: string
    stock: string
    attributes: Array<{ attributeId: string; attributeValueId: string }>
  }>>([])
  // Hızlı ekleme modu için state'ler
  const [isQuickMode, setIsQuickMode] = useState(false)
  const [quickVariations, setQuickVariations] = useState<Array<{
    id: string
    name: string
    price: string
    stock: string
    sku: string
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

  // Ürün verilerini yükle
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/products/${productId}`)
        if (response.ok) {
          const product: Product = await response.json()
          
          // Debug için veri yapısını logla
          console.log('Product data:', product)
          if (product.variations) {
            console.log('Variations data:', product.variations)
            console.log('First variation details:', JSON.stringify(product.variations[0], null, 2))
            if (product.variations[0] && product.variations[0].attributes) {
              console.log('First variation attributes:', product.variations[0].attributes)
            }
          }
          
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

          // Varyasyonlu ürünse varyasyonları yükle
          if (product.productType === 'VARIABLE' && product.variations) {
            console.log('Varyasyonlu ürün tespit edildi, varyasyonlar yükleniyor...')
            
            // Varyasyonlardan attribute'ları çıkar ve ID'lerine göre grupla
            const attributeMap = new Map<string, {
              attributeId: string
              attributeName: string
              valueIds: Set<string>
            }>()
            
            product.variations.forEach(variation => {
              if (variation.attributes && Array.isArray(variation.attributes)) {
                variation.attributes.forEach(attr => {
                  if (attr && attr.attributeValue && attr.attributeValue.attribute) {
                    const attributeId = attr.attributeValue.attributeId || attr.attributeValue.attribute.id
                    const attributeName = attr.attributeValue.attribute.name
                    const valueId = attr.attributeValue.id
                    
                    if (!attributeMap.has(attributeId)) {
                      attributeMap.set(attributeId, {
                        attributeId,
                        attributeName,
                        valueIds: new Set()
                      })
                    }
                    if (valueId) {
                      attributeMap.get(attributeId)!.valueIds.add(valueId)
                    }
                  }
                })
              }
            })

            // Seçili attribute'ları state'e ekle
            const loadedSelectedAttributes = Array.from(attributeMap.values()).map(attr => ({
              attributeId: attr.attributeId,
              attributeName: attr.attributeName,
              selectedValues: Array.from(attr.valueIds)
            }))
            setSelectedAttributes(loadedSelectedAttributes)

            // Tek attribute varsa hızlı mod
            if (loadedSelectedAttributes.length === 1) {
              setIsQuickMode(true)
              const selectedAttr = loadedSelectedAttributes[0]
              const quickVars = product.variations.map(variation => {
                const attr = variation.attributes && Array.isArray(variation.attributes) && variation.attributes.length > 0
                  ? variation.attributes.find(a => 
                      a.attributeValue?.attributeId === selectedAttr.attributeId ||
                      a.attributeValue?.attribute?.id === selectedAttr.attributeId
                    )
                  : null
                
                // Değer adını bul
                const valueId = attr?.attributeValue?.id
                const valueName = attr?.attributeValue?.value || ''
                
                return {
                  id: variation.id,
                  name: valueName,
                  price: variation.price.toString(),
                  stock: variation.stock.toString(),
                  sku: variation.sku || ''
                }
              })
              setQuickVariations(quickVars)
              setVariations([])
            } else {
              // 2+ attribute varsa normal mod
              setIsQuickMode(false)
              setQuickVariations([])
              const loadedVariations = product.variations.map(variation => ({
                id: variation.id,
                sku: variation.sku || '',
                price: variation.price.toString(),
                stock: variation.stock.toString(),
                attributes: variation.attributes && Array.isArray(variation.attributes) 
                  ? variation.attributes
                      .filter(attr => attr && attr.attributeValue)
                      .map(attr => ({
                        attributeId: attr.attributeValue.attributeId || attr.attributeValue.attribute?.id || '',
                        attributeValueId: attr.attributeValue.id || ''
                      }))
                      .filter(attr => attr.attributeId && attr.attributeValueId)
                  : []
              }))
              setVariations(loadedVariations)
            }
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

    if (productId) {
      fetchProduct()
    }
  }, [productId])

  // Toast notification gösterme fonksiyonu
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  // Attribute seçme (mevcut attribute'lardan)
  const addSelectedAttribute = (attributeId: string) => {
    const attribute = availableAttributes.find(attr => attr.id === attributeId)
    if (!attribute) return

    // Zaten seçili mi kontrol et
    if (selectedAttributes.some(sa => sa.attributeId === attributeId)) {
      showNotification('error', 'Bu özellik zaten seçili')
      return
    }

    const newSelected = {
      attributeId: attribute.id,
      attributeName: attribute.name,
      selectedValues: [] // Başlangıçta boş
    }
    setSelectedAttributes([...selectedAttributes, newSelected])
  }

  // Seçili attribute'u kaldırma
  const removeSelectedAttribute = (attributeId: string) => {
    setSelectedAttributes(selectedAttributes.filter(sa => sa.attributeId !== attributeId))
    generateVariations()
  }

  // Attribute değerlerini seçme/güncelleme
  const updateSelectedAttributeValues = (attributeId: string, valueIds: string[]) => {
    const updated = selectedAttributes.map(sa => 
      sa.attributeId === attributeId 
        ? { ...sa, selectedValues: valueIds }
        : sa
    )
    setSelectedAttributes(updated)
    generateVariations()
  }

  // Varyasyonları otomatik oluştur (attribute ID'lerine göre)
  const generateVariations = () => {
    const validAttributes = selectedAttributes.filter(sa => 
      sa.selectedValues.length > 0
    )

    if (validAttributes.length === 0) {
      setVariations([])
      setIsQuickMode(false)
      setQuickVariations([])
      return
    }

    // Tek attribute varsa hızlı mod
    if (validAttributes.length === 1) {
      setIsQuickMode(true)
      const attribute = validAttributes[0]
      const attributeData = availableAttributes.find(a => a.id === attribute.attributeId)
      
      // Mevcut varyasyonları koru, sadece yeni değerler için boş varyasyonlar ekle
      const existingValueNames = new Set(quickVariations.map(qv => qv.name.trim()))
      const newValues = attribute.selectedValues
        .filter(valueId => {
          const value = attributeData?.values.find(v => v.id === valueId)
          return value && !existingValueNames.has(value.value)
        })
        .map((valueId, index) => {
          const value = attributeData?.values.find(v => v.id === valueId)
          return {
            id: `quick-${Date.now()}-${index}`,
            name: value?.value || '',
            price: '',
            stock: '1',
            sku: ''
          }
        })
      
      if (newValues.length > 0) {
        setQuickVariations([...quickVariations, ...newValues])
      }
      setVariations([])
      return
    }

    // 2+ attribute varsa normal mod - tüm kombinasyonları oluştur
    setIsQuickMode(false)
    setQuickVariations([])

    const combinations = generateCombinations(validAttributes)
    
    // Mevcut varyasyonları koru, yeni kombinasyonlar için boş varyasyonlar ekle
    const existingCombinations = new Set(
      variations.map(v => 
        v.attributes.map(a => `${a.attributeId}:${a.attributeValueId}`).sort().join('|')
      )
    )
    
    const newVariations = combinations
      .filter(combo => {
        const comboKey = combo.map(a => `${a.attributeId}:${a.attributeValueId}`).sort().join('|')
        return !existingCombinations.has(comboKey)
      })
      .map((combination, index) => ({
        id: `var-${Date.now()}-${index}`,
        sku: '',
        price: '',
        stock: '',
        attributes: combination
      }))

    setVariations([...variations, ...newVariations])
  }

  // Kombinasyon oluşturma fonksiyonu (attribute ID'lerine göre)
  const generateCombinations = (selectedAttrs: Array<{ attributeId: string; selectedValues: string[] }>) => {
    if (selectedAttrs.length === 0) return []
    
    const combinations: Array<Array<{ attributeId: string; attributeValueId: string }>> = []
    
    const generate = (current: Array<{ attributeId: string; attributeValueId: string }>, index: number) => {
      if (index === selectedAttrs.length) {
        combinations.push([...current])
        return
      }
      
      const attr = selectedAttrs[index]
      for (const valueId of attr.selectedValues) {
        generate([...current, { attributeId: attr.attributeId, attributeValueId: valueId }], index + 1)
      }
    }
    
    generate([], 0)
    return combinations
  }

  // Hızlı mod fonksiyonları
  const addQuickVariation = () => {
    setQuickVariations([...quickVariations, {
      id: `quick-${Date.now()}`,
      name: '',
      price: '',
      stock: '1',
      sku: ''
    }])
  }

  const removeQuickVariation = (index: number) => {
    setQuickVariations(quickVariations.filter((_, i) => i !== index))
  }

  const updateQuickVariation = (index: number, field: string, value: string) => {
    const updated = [...quickVariations]
    updated[index] = { ...updated[index], [field]: value }
    setQuickVariations(updated)
  }

  // Toplu ekleme fonksiyonu
  const [bulkImportText, setBulkImportText] = useState('')
  const [showBulkImport, setShowBulkImport] = useState(false)

  const handleBulkImport = () => {
    if (!bulkImportText.trim()) {
      showNotification('error', 'Lütfen öğrenci isimlerini girin')
      return
    }

    // Pipe (|) ile ayır ve temizle
    const names = bulkImportText
      .split('|')
      .map(name => name.trim())
      .filter(name => name.length > 0)

    if (names.length === 0) {
      showNotification('error', 'Geçerli öğrenci ismi bulunamadı')
      return
    }

    // Mevcut boş satırları temizle, yeni isimleri ekle
    const existingWithNames = quickVariations.filter(qv => qv.name.trim() !== '')
    const newVariations = names.map(name => ({
      id: `quick-${Date.now()}-${Math.random()}`,
      name: name.trim(),
      price: '',
      stock: '1',
      sku: ''
    }))

    setQuickVariations([...existingWithNames, ...newVariations])
    setBulkImportText('')
    setShowBulkImport(false)
    showNotification('success', `${names.length} öğrenci başarıyla eklendi`)
  }


  // Varyasyon güncelleme
  const updateVariation = (index: number, field: string, value: string) => {
    const updatedVariations = [...variations]
    updatedVariations[index] = { ...updatedVariations[index], [field]: value }
    setVariations(updatedVariations)
  }

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
      // Hızlı modda quickVariations'ı variations formatına çevir
      let finalVariations = variations
      if (isQuickMode && quickVariations.length > 0 && selectedAttributes.length === 1) {
        const selectedAttr = selectedAttributes[0]
        const attributeData = availableAttributes.find(a => a.id === selectedAttr.attributeId)
        
        finalVariations = quickVariations
          .filter(qv => qv.name.trim() !== '' && qv.price.trim() !== '')
          .map(qv => {
            // Değer ID'sini bul
            const valueData = attributeData?.values.find(v => v.value === qv.name.trim())
            if (!valueData) {
              showNotification('error', `"${qv.name}" değeri bulunamadı. Lütfen özellik değerlerinden seçin.`)
              return null
            }
            return {
              id: qv.id.startsWith('quick-') ? undefined : qv.id, // Yeni varyasyonlar için id gönderme
              sku: qv.sku || '',
              price: qv.price,
              stock: qv.stock || '1',
              attributes: [{ attributeId: selectedAttr.attributeId, attributeValueId: valueData.id }]
            }
          })
          .filter(v => v !== null) as any[]
      } else if (!isQuickMode && variations.length > 0) {
        // Normal mod - zaten attribute ID'leri var
        finalVariations = variations
          .filter(v => v.price.trim() !== '' && v.stock.trim() !== '')
          .map(v => ({
            id: v.id.startsWith('var-') ? undefined : v.id, // Yeni varyasyonlar için id gönderme
            sku: v.sku || '',
            price: v.price,
            stock: v.stock,
            attributes: v.attributes.map(attr => ({
              attributeId: attr.attributeId,
              attributeValueId: attr.attributeValueId
            }))
          }))
      }

      const productData = {
        ...formData,
        price: formData.productType === 'SIMPLE' ? parseFloat(formData.price) : 0,
        comparePrice: formData.productType === 'SIMPLE' && formData.comparePrice ? parseFloat(formData.comparePrice) : undefined,
        stock: formData.productType === 'SIMPLE' ? (isUnlimitedStock ? -1 : parseInt(formData.stock)) : 0,
        // Resimler artık Vercel Blob URL'leri olarak formData.images içinde tutuluyor
        images: formData.images,
        variations: formData.productType === 'VARIABLE' ? finalVariations : undefined
      }

      const token = localStorage.getItem('token')
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ürün güncellenirken bir hata oluştu')
      }

      showNotification('success', 'Ürün başarıyla güncellendi')
      router.push('/admin/products')
    } catch (error) {
      console.error('Error updating product:', error)
      showNotification('error', error instanceof Error ? error.message : 'Ürün güncellenirken bir hata oluştu')
    } finally {
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
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
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
                      Varyasyonlu Ürün Bilgisi
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>Önce nitelikleri tanımlayın, sonra her varyasyon için fiyat ve stok bilgilerini girin.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Özellikler Bölümü - Yeni Mantık */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Özellikler</h3>
                  {availableAttributes.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          addSelectedAttribute(e.target.value)
                          e.target.value = ''
                        }
                      }}
                      className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors text-sm border-0 cursor-pointer"
                      defaultValue=""
                    >
                      <option value="">+ Özellik Ekle</option>
                      {availableAttributes
                        .filter(attr => !selectedAttributes.some(sa => sa.attributeId === attr.id))
                        .map(attr => (
                          <option key={attr.id} value={attr.id}>
                            {attr.name}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
                
                {selectedAttributes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="mb-2">Henüz özellik seçilmedi.</p>
                    <p className="text-sm">Yukarıdaki dropdown'dan özellik seçin.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedAttributes.map((selectedAttr) => {
                      const attributeData = availableAttributes.find(a => a.id === selectedAttr.attributeId)
                      return (
                        <div key={selectedAttr.attributeId} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-lg font-medium text-gray-900">
                              {selectedAttr.attributeName}
                            </h4>
                            <button
                              type="button"
                              onClick={() => removeSelectedAttribute(selectedAttr.attributeId)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Özelliği Kaldır
                            </button>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Değerleri Seçin (Birden fazla seçebilirsiniz)
                            </label>
                            
                            {/* Yeni Değer Ekleme */}
                            <div className="mb-3 flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Yeni değer ekle..."
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                id={`new-value-input-${selectedAttr.attributeId}`}
                              />
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Fiyat (₺)"
                                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                id={`new-price-input-${selectedAttr.attributeId}`}
                              />
                              <button
                                type="button"
                                onClick={async (e) => {
                                  const valueInput = document.getElementById(`new-value-input-${selectedAttr.attributeId}`) as HTMLInputElement
                                  const priceInput = document.getElementById(`new-price-input-${selectedAttr.attributeId}`) as HTMLInputElement
                                  const newValue = valueInput.value.trim()
                                  const newPrice = priceInput.value.trim()
                                  
                                  if (newValue) {
                                    try {
                                      const token = localStorage.getItem('token')
                                      const response = await fetch(`/api/attributes/${selectedAttr.attributeId}/values`, {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                          'Authorization': `Bearer ${token}`
                                        },
                                        body: JSON.stringify({ 
                                          value: newValue,
                                          price: newPrice || null
                                        })
                                      })
                                      
                                      if (response.ok) {
                                        const newAttributeValue = await response.json()
                                        // Yeni değeri seçili değerlere ekle
                                        updateSelectedAttributeValues(
                                          selectedAttr.attributeId,
                                          [...selectedAttr.selectedValues, newAttributeValue.id]
                                        )
                                        // Attribute listesini yenile
                                        const attributesRes = await fetch('/api/attributes', {
                                          headers: {
                                            'Authorization': `Bearer ${token}`
                                          }
                                        })
                                        if (attributesRes.ok) {
                                          const updatedAttributes = await attributesRes.json()
                                          setAvailableAttributes(updatedAttributes)
                                        }
                                        valueInput.value = ''
                                        priceInput.value = ''
                                        showNotification('success', `"${newValue}" değeri eklendi ve seçildi`)
                                      } else {
                                        const error = await response.json()
                                        showNotification('error', error.error || 'Değer eklenirken bir hata oluştu')
                                      }
                                    } catch (error) {
                                      console.error('Error adding value:', error)
                                      showNotification('error', 'Değer eklenirken bir hata oluştu')
                                    }
                                  }
                                }}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                              >
                                + Ekle
                              </button>
                            </div>
                            
                            <div className="space-y-2">
                              {attributeData?.values.map((value) => (
                                <div key={value.id} className="flex items-center space-x-2 hover:bg-gray-100 p-2 rounded">
                                  <label className="flex items-center space-x-2 cursor-pointer flex-1">
                                    <input
                                      type="checkbox"
                                      checked={selectedAttr.selectedValues.includes(value.id)}
                                      onChange={(e) => {
                                        const currentValues = selectedAttr.selectedValues
                                        const newValues = e.target.checked
                                          ? [...currentValues, value.id]
                                          : currentValues.filter(id => id !== value.id)
                                        updateSelectedAttributeValues(selectedAttr.attributeId, newValues)
                                      }}
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <span className="text-sm text-gray-700">{value.value}</span>
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="Fiyat (₺)"
                                    value={value.price ? value.price.toString() : ''}
                                    onChange={async (e) => {
                                      const newPrice = e.target.value.trim()
                                      try {
                                        const token = localStorage.getItem('token')
                                        const response = await fetch(`/api/attributes/${selectedAttr.attributeId}/values/${value.id}`, {
                                          method: 'PUT',
                                          headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${token}`
                                          },
                                          body: JSON.stringify({ price: newPrice || null })
                                        })
                                        
                                        if (response.ok) {
                                          // Attribute listesini yenile
                                          const attributesRes = await fetch('/api/attributes', {
                                            headers: {
                                              'Authorization': `Bearer ${token}`
                                            }
                                          })
                                          if (attributesRes.ok) {
                                            const updatedAttributes = await attributesRes.json()
                                            setAvailableAttributes(updatedAttributes)
                                          }
                                        }
                                      } catch (error) {
                                        console.error('Error updating price:', error)
                                      }
                                    }}
                                    className="w-28 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                  />
                                </div>
                              ))}
                            </div>
                            {selectedAttr.selectedValues.length === 0 && (
                              <p className="text-sm text-amber-600 mt-2">
                                ⚠ Lütfen en az bir değer seçin
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Hızlı Ekleme Modu - Tek Nitelikli Varyasyonlar */}
              {isQuickMode && selectedAttributes.length === 1 && (
                <div>
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">
                          Hızlı Ekleme Modu Aktif
                        </h3>
                        <p className="mt-1 text-sm text-green-700">
                          Tek özellikli varyasyonlar için hızlı ekleme modu. Her satıra {selectedAttributes[0]?.attributeName || 'özellik'} değeri ve fiyat girin.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">
                      {selectedAttributes[0]?.attributeName || 'Özellik'} Listesi ({quickVariations.length})
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowBulkImport(!showBulkImport)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Toplu Ekle
                      </button>
                      <button
                        type="button"
                        onClick={addQuickVariation}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <span>+</span>
                        Satır Ekle
                      </button>
                    </div>
                  </div>

                  {/* Toplu Ekleme Modal */}
                  {showBulkImport && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Öğrenci İsimlerini Toplu Ekle (| ile ayırın)
                        </label>
                        <textarea
                          value={bulkImportText}
                          onChange={(e) => setBulkImportText(e.target.value)}
                          placeholder="AS** S* AV** | ÖY** N** BE*** | OS*** KABA********* | ..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-32 text-sm font-mono"
                          rows={6}
                        />
                        <p className="mt-2 text-xs text-gray-600">
                          💡 Öğrenci isimlerini pipe (|) karakteri ile ayırarak yapıştırın. Örnek: <code className="bg-gray-100 px-1 rounded">İsim 1 | İsim 2 | İsim 3</code>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleBulkImport}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          Ekle
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowBulkImport(false)
                            setBulkImportText('')
                          }}
                          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                        >
                          İptal
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">{selectedAttributes[0]?.attributeName || 'Özellik'} Değeri *</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Fiyat (₺) *</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Stok</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">SKU</th>
                            <th className="px-4 py-3 text-center font-semibold text-gray-700 w-20">İşlem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {quickVariations.map((qv, index) => (
                            <tr key={qv.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <select
                                  value={qv.name}
                                  onChange={(e) => updateQuickVariation(index, 'name', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  required
                                >
                                  <option value="">Seçiniz</option>
                                  {(() => {
                                    const attributeData = availableAttributes.find(a => a.id === selectedAttributes[0]?.attributeId)
                                    return attributeData?.values
                                      .filter(v => selectedAttributes[0]?.selectedValues.includes(v.id))
                                      .map(value => (
                                        <option key={value.id} value={value.value}>
                                          {value.value}
                                        </option>
                                      ))
                                  })()}
                                </select>
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  value={qv.price}
                                  onChange={(e) => updateQuickVariation(index, 'price', e.target.value)}
                                  step="0.01"
                                  min="0"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="0.00"
                                  required
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  value={qv.stock}
                                  onChange={(e) => updateQuickVariation(index, 'stock', e.target.value)}
                                  min="0"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="1"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={qv.sku}
                                  onChange={(e) => updateQuickVariation(index, 'sku', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="Opsiyonel"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeQuickVariation(index)}
                                  className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                  title="Satırı Sil"
                                >
                                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Normal Varyasyonlar Bölümü - 2+ Nitelik */}
              {!isQuickMode && variations.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Varyasyonlar ({variations.length})</h3>
                  <div className="space-y-4">
                    {variations.map((variation, variationIndex) => (
                      <div key={variation.id} className="border rounded-lg p-4 bg-white">
                        <div className="mb-3">
                          <h4 className="font-medium text-gray-900">
                            {variation.attributes.map(attr => {
                              const attrData = availableAttributes.find(a => a.id === attr.attributeId)
                              const valueData = attrData?.values.find(v => v.id === attr.attributeValueId)
                              const attrName = selectedAttributes.find(sa => sa.attributeId === attr.attributeId)?.attributeName || 'Özellik'
                              return `${attrName}: ${valueData?.value || 'N/A'}`
                            }).join(' | ')}
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
                              onChange={(e) => updateVariation(variationIndex, 'sku', e.target.value)}
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
                              onChange={(e) => updateVariation(variationIndex, 'price', e.target.value)}
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
                              onChange={(e) => updateVariation(variationIndex, 'stock', e.target.value)}
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