'use client'

// KALICI ÇÖZÜM: Static generation'ı kapat
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Edit, Trash2, Eye, Star, Search, Filter, ArrowUpDown, CheckCircle, XCircle } from 'lucide-react'

interface Product {
  id: string
  name: string
  sku: string
  slug: string
  price: number
  comparePrice?: number
  stock: number
  isActive: boolean
  isFeatured: boolean
  sortOrder: number
  createdAt?: string
  images?: string[]
  category?: {
    name: string
  }
  _count: {
    reviews: number
  }
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'createdAt' | 'stock'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Pagination state'leri
  const [currentPage, setCurrentPage] = useState(1)
  const [productsPerPage] = useState(10)
  
  // Arama ve filtreleme state'leri
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')

  // Toast notification gösterme fonksiyonu
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  // Ürün listesini yenileme fonksiyonu
  const refreshProducts = async () => {
    try {
      setError(null)
      setIsLoading(true)
      
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Yetkilendirme gerekli')
        setIsLoading(false)
        return
      }

      const response = await fetch('/api/products?admin=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data)) {
          setProducts(data)
        } else {
          setProducts([])
          setError('API\'den beklenmeyen veri formatı alındı')
        }
      } else {
        setProducts([])
        setError('Ürünler yüklenirken bir hata oluştu')
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      setProducts([])
      setError('Ürünler yüklenirken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshProducts()
    
    // Global erişim için
    ;(window as any).refreshAdminProducts = refreshProducts
  }, [])

  // Filtreleme ve arama fonksiyonu
  useEffect(() => {
    let filtered = [...products]

    // Arama filtresi
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Kategori filtresi
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(product => product.category?.name === categoryFilter)
    }

    // Durum filtresi
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(product => product.isActive)
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(product => !product.isActive)
      } else if (statusFilter === 'featured') {
        filtered = filtered.filter(product => product.isFeatured)
      }
    }

    // Stok filtresi
    if (stockFilter !== 'all') {
      if (stockFilter === 'inStock') {
        filtered = filtered.filter(product => product.stock > 0)
      } else if (stockFilter === 'outOfStock') {
        filtered = filtered.filter(product => product.stock === 0)
      } else if (stockFilter === 'lowStock') {
        filtered = filtered.filter(product => product.stock > 0 && product.stock < 10)
      }
    }

    // Sıralama
    filtered.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'price':
          aValue = a.price
          bValue = b.price
          break
        case 'stock':
          aValue = a.stock
          bValue = b.stock
          break
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt || '').getTime()
          bValue = new Date(b.createdAt || '').getTime()
          break
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredProducts(filtered)
    setCurrentPage(1)
  }, [products, searchTerm, categoryFilter, statusFilter, stockFilter, sortBy, sortOrder])

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage)
  const indexOfLastProduct = currentPage * productsPerPage
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct)

  // Benzersiz kategorileri al
  const uniqueCategories = Array.from(new Set(products.map(p => p.category?.name).filter(Boolean)))

  // Ürün Silme
  const handleDeleteProduct = async (productId: string) => {
    if (confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
      try {
        const token = localStorage.getItem('token')
        if (!token) return

        const response = await fetch(`/api/products/${productId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })

        if (response.ok) {
          const data = await response.json().catch(() => ({}))

          if (data.softDeleted) {
            // Ürünü listede de gizle
            setProducts(products.filter(p => p.id !== productId))
            showNotification(
              'success',
              'Ürün geçmiş siparişlerde kullanıldığı için tamamen silinemedi, ancak katalogdan kaldırıldı.'
            )
          } else {
            setProducts(products.filter(p => p.id !== productId))
            showNotification('success', 'Ürün başarıyla silindi')
          }
        } else {
          // API'den dönen hata mesajını göster
          let errorMessage = 'Ürün silinirken bir hata oluştu'
          try {
            const data = await response.json()
            if (data?.error) {
              errorMessage = data.error
            }
          } catch {
            // JSON parse edilemezse varsayılan mesajı kullan
          }

          // Siparişlere bağlı ürünler için özel durum
          if (response.status === 409 && errorMessage === 'Ürün silinirken bir hata oluştu') {
            errorMessage = 'Bu ürün daha önce verilen siparişlerde kullanıldığı için silinemez. Bunun yerine ürünü pasif hale getirebilirsiniz.'
          }

          showNotification('error', errorMessage)
        }
      } catch (error) {
        showNotification('error', 'Ürün silinirken bir hata oluştu')
      }
    }
  }

  // Toggle İşlemleri (Aktif/Pasif, Featured)
  const handleToggle = async (productId: string, field: 'isActive' | 'isFeatured', currentValue: boolean) => {
    // Optimistic update
    const originalProducts = [...products]
    setProducts(products.map(p => p.id === productId ? { ...p, [field]: !currentValue } : p))

    try {
        const token = localStorage.getItem('token')
        if (!token) throw new Error('Auth error')

        // API Endpoint belirle
        const endpoint = field === 'isActive' 
            ? `/api/products/${productId}/active` 
            : `/api/products/${productId}/feature`
        
        const bodyKey = field === 'isActive' ? 'isActive' : 'isFeatured'

        const response = await fetch(endpoint, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ [bodyKey]: !currentValue })
        })

        if (!response.ok) throw new Error('Update failed')
        
        const message = field === 'isActive' 
            ? (!currentValue ? 'Ürün aktif edildi' : 'Ürün pasif yapıldı')
            : (!currentValue ? 'Ürün öne çıkarıldı' : 'Öne çıkarma kaldırıldı')
            
        showNotification('success', message)

    } catch (error) {
        // Revert on error
        setProducts(originalProducts)
        showNotification('error', 'Güncelleme başarısız oldu')
    }
  }

  // Sıralama güncelleme
  const handleSortOrderChange = async (productId: string, newSortOrder: number) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`/api/products/${productId}/sort-order`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sortOrder: newSortOrder })
      })

      if (response.ok) {
        setProducts(products.map(p => p.id === productId ? { ...p, sortOrder: newSortOrder } : p))
      }
    } catch (error) {
      console.error('Error updating sort order', error)
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
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg text-white transition-all duration-300 transform translate-y-0 ${
          notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Ürün Yönetimi</h1>
          <p className="text-gray-500 mt-1">Toplam {products.length} ürün listeleniyor</p>
        </div>
        <Link
          href="/admin/products/new"
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-sm hover:shadow flex items-center gap-2 font-medium"
        >
          <Plus className="h-5 w-5" />
          Yeni Ürün Ekle
        </Link>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Ürün ara (isim, SKU, kategori)..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
            </div>
            
            {/* Filters Group */}
            <div className="flex flex-wrap gap-3">
                <select 
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 hover:bg-white transition-colors focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                    <option value="all">Tüm Kategoriler</option>
                    {uniqueCategories.map(c => <option key={c} value={c as string}>{c}</option>)}
                </select>

                <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 hover:bg-white transition-colors focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                    <option value="all">Tüm Durumlar</option>
                    <option value="active">Aktif</option>
                    <option value="inactive">Pasif</option>
                    <option value="featured">Öne Çıkan</option>
                </select>

                <select 
                    value={stockFilter}
                    onChange={(e) => setStockFilter(e.target.value)}
                    className="px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 hover:bg-white transition-colors focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                    <option value="all">Tüm Stoklar</option>
                    <option value="inStock">Stokta Var</option>
                    <option value="lowStock">Kritik Stok (&lt;10)</option>
                    <option value="outOfStock">Tükendi</option>
                </select>
            </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                        <th className="px-6 py-4 font-semibold text-gray-600 w-20">Sıra</th>
                        <th className="px-6 py-4 font-semibold text-gray-600">Ürün</th>
                        <th className="px-6 py-4 font-semibold text-gray-600">Kategori</th>
                        <th className="px-6 py-4 font-semibold text-gray-600 cursor-pointer hover:text-blue-600" onClick={() => { setSortBy('price'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc') }}>
                            <div className="flex items-center gap-1">Fiyat <ArrowUpDown className="h-3 w-3" /></div>
                        </th>
                        <th className="px-6 py-4 font-semibold text-gray-600 cursor-pointer hover:text-blue-600" onClick={() => { setSortBy('stock'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc') }}>
                            <div className="flex items-center gap-1">Stok <ArrowUpDown className="h-3 w-3" /></div>
                        </th>
                        <th className="px-6 py-4 font-semibold text-gray-600 text-center">Durum</th>
                        <th className="px-6 py-4 font-semibold text-gray-600 text-center">Öne Çıkan</th>
                        <th className="px-6 py-4 font-semibold text-gray-600 text-right">İşlemler</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {currentProducts.length > 0 ? (
                        currentProducts.map((product) => (
                            <tr key={product.id} className="hover:bg-blue-50/30 transition-colors group">
                                <td className="px-6 py-4">
                                    <input 
                                        type="number" 
                                        value={product.sortOrder}
                                        onChange={(e) => handleSortOrderChange(product.id, parseInt(e.target.value) || 0)}
                                        className="w-12 px-1 py-1 border rounded text-center text-xs text-gray-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200">
                                            {product.images && product.images[0] ? (
                                                <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs">No Img</div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900">{product.name}</div>
                                            <div className="text-xs text-gray-500 font-mono">{product.sku || '-'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-600">
                                    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                        {product.category?.name || 'Genel'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-medium text-gray-900">
                                    ₺{product.price.toLocaleString('tr-TR')}
                                </td>
                                <td className="px-6 py-4">
                                    {product.stock === -1 ? (
                                        <span className="text-green-600 text-xs font-medium bg-green-50 px-2 py-1 rounded-full">Sınırsız</span>
                                    ) : (
                                        <span className={`font-medium ${product.stock === 0 ? 'text-red-600' : product.stock < 10 ? 'text-orange-600' : 'text-gray-700'}`}>
                                            {product.stock}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button 
                                        onClick={() => handleToggle(product.id, 'isActive', product.isActive)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                            product.isActive ? 'bg-green-500' : 'bg-gray-200'
                                        }`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                                            product.isActive ? 'translate-x-6' : 'translate-x-1'
                                        }`} />
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button 
                                        onClick={() => handleToggle(product.id, 'isFeatured', product.isFeatured)}
                                        className={`p-1.5 rounded-full transition-all ${
                                            product.isFeatured ? 'bg-yellow-100 text-yellow-600' : 'text-gray-300 hover:bg-gray-100'
                                        }`}
                                    >
                                        <Star className={`h-5 w-5 ${product.isFeatured ? 'fill-current' : ''}`} />
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Link href={`/products/${product.slug}`} target="_blank" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Görüntüle">
                                            <Eye className="h-4 w-4" />
                                        </Link>
                                        <Link href={`/admin/products/${product.id}/edit`} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Düzenle">
                                            <Edit className="h-4 w-4" />
                                        </Link>
                                        <button 
                                            onClick={() => handleDeleteProduct(product.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                                            title="Sil"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                <div className="flex flex-col items-center justify-center">
                                    <Search className="h-10 w-10 text-gray-300 mb-3" />
                                    <p>Aradığınız kriterlere uygun ürün bulunamadı.</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>

        {/* Footer / Pagination */}
        {totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                    Sayfa <span className="font-medium text-gray-900">{currentPage}</span> / {totalPages}
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Önceki
                    </button>
                    <button 
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Sonraki
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  )
}
