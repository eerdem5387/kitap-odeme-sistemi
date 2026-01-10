'use client'

import { useState } from 'react'
import { Filter } from 'lucide-react'
import ProductFilters from './ProductFilters'

interface ProductsMobileFiltersProps {
  categories: {
    id: string
    name: string
    slug: string
  }[]
  currentCategory?: string
  currentSearch?: string
}

export default function ProductsMobileFilters({
  categories,
  currentCategory,
  currentSearch,
}: ProductsMobileFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Trigger Button */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center px-4 py-2.5 rounded-lg bg-white border border-gray-200 shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 touch-manipulation min-h-[44px]"
        >
          <Filter className="h-4 w-4 mr-2 text-gray-500" />
          Filtreleri Göster
        </button>
      </div>

      {/* Drawer */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl z-50 lg:hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Filtreler</h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg touch-manipulation"
              >
                Kapat
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <ProductFilters
                categories={categories}
                currentCategory={currentCategory}
                currentSearch={currentSearch}
              />
            </div>
          </div>
        </>
      )}
    </>
  )
}


