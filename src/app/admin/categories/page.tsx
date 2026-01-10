'use client'

// KALICI ÇÖZÜM: Static generation'ı kapat
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Edit, Trash2, Eye, LayoutGrid, List, Search, Star, Check } from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
  isActive: boolean
  isPopular: boolean
  createdAt: string
  _count: {
    products: number
  }
  image?: string
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) return

        const response = await fetch('/api/categories', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        
        if (response.ok) {
          const data = await response.json()
          if (Array.isArray(data)) {
            setCategories(data)
            setFilteredCategories(data)
          }
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategories()
  }, [])

  // Filter
  useEffect(() => {
    if (!searchTerm) {
        setFilteredCategories(categories)
        return
    }
    const lowerTerm = searchTerm.toLowerCase()
    const result = categories.filter(c => 
        c.name.toLowerCase().includes(lowerTerm) ||
        c.slug.toLowerCase().includes(lowerTerm)
    )
    setFilteredCategories(result)
  }, [searchTerm, categories])

  const handleDeleteCategory = async (categoryId: string) => {
    if (confirm('Bu kategoriyi silmek istediğinizden emin misiniz?')) {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`/api/categories/${categoryId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })

        if (response.ok) {
          setCategories(categories.filter(c => c.id !== categoryId))
        }
      } catch (error) {
        console.error('Error:', error)
      }
    }
  }

  const handleTogglePopular = async (categoryId: string, currentPopular: boolean) => {
    // Optimistic Update
    const originalCategories = [...categories]
    setCategories(categories.map(c => c.id === categoryId ? { ...c, isPopular: !currentPopular } : c))

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/categories/${categoryId}/popular`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isPopular: !currentPopular })
      })

      if (!response.ok) throw new Error('Failed')
    } catch (error) {
        setCategories(originalCategories)
        alert('İşlem başarısız')
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Kategori Yönetimi</h1>
          <p className="text-gray-500 mt-1">Toplam {filteredCategories.length} kategori</p>
        </div>
        <Link
          href="/admin/categories/new"
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-sm hover:shadow flex items-center gap-2 font-medium"
        >
          <Plus className="h-5 w-5" />
          Yeni Kategori
        </Link>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input 
                type="text" 
                placeholder="Kategori ara..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
        </div>

        {/* View Toggle */}
        <div className="flex bg-gray-100 p-1 rounded-lg self-start">
            <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <LayoutGrid className="h-5 w-5" />
            </button>
            <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <List className="h-5 w-5" />
            </button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCategories.map((category) => (
                <div key={category.id} className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
                    {/* Image Area */}
                    <div className="h-32 bg-gray-100 relative flex items-center justify-center">
                        {category.image ? (
                            <img src={category.image} alt={category.name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-4xl font-bold text-gray-300 select-none">{category.name.charAt(0)}</span>
                        )}
                        {/* Floating Action Buttons */}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={`/admin/categories/${category.id}/edit`} className="p-1.5 bg-white/90 backdrop-blur rounded-lg hover:text-blue-600 shadow-sm">
                                <Edit className="h-4 w-4" />
                            </Link>
                            <button onClick={() => handleDeleteCategory(category.id)} className="p-1.5 bg-white/90 backdrop-blur rounded-lg hover:text-red-600 shadow-sm">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-gray-900 truncate pr-2" title={category.name}>{category.name}</h3>
                            {category.isPopular && <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-500 mb-4 font-mono truncate">/{category.slug}</p>
                        
                        <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-50">
                            <span className="text-xs font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded-md">
                                {category._count.products} ürün
                            </span>
                            <button 
                                onClick={() => handleTogglePopular(category.id, category.isPopular)}
                                className={`text-xs font-medium px-2 py-1 rounded-md transition-colors ${
                                    category.isPopular 
                                        ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' 
                                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                {category.isPopular ? 'Popüler' : 'Popüler Yap'}
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-gray-600">Kategori</th>
                            <th className="px-6 py-4 font-semibold text-gray-600">Slug</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-center">Ürünler</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-center">Popüler</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-right">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredCategories.map((category) => (
                            <tr key={category.id} className="hover:bg-blue-50/30 transition-colors group">
                                <td className="px-6 py-4">
                                    <span className="font-medium text-gray-900">{category.name}</span>
                                </td>
                                <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                                    {category.slug}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                        {category._count.products}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button 
                                        onClick={() => handleTogglePopular(category.id, category.isPopular)}
                                        className={`p-1.5 rounded-full transition-colors ${category.isPopular ? 'bg-yellow-100 text-yellow-600' : 'text-gray-300 hover:bg-gray-100'}`}
                                    >
                                        <Star className={`h-4 w-4 ${category.isPopular ? 'fill-current' : ''}`} />
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Link href={`/admin/categories/${category.id}/edit`} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                            <Edit className="h-4 w-4" />
                                        </Link>
                                        <button onClick={() => handleDeleteCategory(category.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  )
}
