'use client'

import { useState } from 'react'
import { Search, Filter } from 'lucide-react'

interface ProductFiltersProps {
  categories: {
    id: string
    name: string
    slug: string
  }[]
  currentCategory?: string
  currentSearch?: string
}

export default function ProductFilters({
  categories,
  currentCategory,
  currentSearch
}: ProductFiltersProps) {
  const [search, setSearch] = useState(currentSearch || '')

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (currentCategory) params.set('category', currentCategory)
    window.location.href = `/products?${params.toString()}`
  }

  const handleCategoryChange = (categorySlug: string) => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (categorySlug) params.set('category', categorySlug)
    window.location.href = `/products?${params.toString()}`
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Filtreler</h3>
        <Filter className="h-5 w-5 text-gray-400" />
      </div>

      {/* Search */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Arama
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Ürün ara..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={handleSearch}
          className="w-full mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Ara
        </button>
      </div>

      {/* Categories */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Kategoriler
        </label>
        <div className="space-y-2">
          <button
            onClick={() => handleCategoryChange('')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              !currentCategory
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Tüm Kategoriler
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryChange(category.slug)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                currentCategory === category.slug
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
