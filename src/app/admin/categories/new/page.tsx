'use client'

// KALICI ÇÖZÜM: Static generation'ı kapat
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'

export default function NewCategoryPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    isActive: true,
    isPopular: false
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    setFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        router.push('/admin/categories')
      } else {
        const error = await response.json()
        alert(error.message || 'Kategori oluşturulurken bir hata oluştu')
      }
    } catch (error) {
      console.error('Error creating category:', error)
      alert('Kategori oluşturulurken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <Link
            href="/admin/categories"
            className="text-gray-600 hover:text-gray-900 transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Yeni Kategori</h1>
            <p className="text-sm sm:text-base text-gray-600">Yeni bir kategori oluşturun</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Kategori Adı *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleNameChange}
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation text-base"
              placeholder="Kategori adını girin"
            />
          </div>

          {/* Slug */}
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
              Slug
            </label>
            <input
              type="text"
              id="slug"
              name="slug"
              value={formData.slug}
              onChange={handleInputChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation text-base"
              placeholder="kategori-adi"
            />
            <p className="text-sm text-gray-500 mt-1">
              URL'de kullanılacak kısa isim. Boş bırakırsanız otomatik oluşturulur.
            </p>
          </div>

          {/* Status Checkboxes */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded touch-manipulation"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900 touch-manipulation cursor-pointer">
                Kategori aktif
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPopular"
                name="isPopular"
                checked={formData.isPopular}
                onChange={handleInputChange}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded touch-manipulation"
              />
              <label htmlFor="isPopular" className="ml-2 block text-sm text-gray-900 touch-manipulation cursor-pointer">
                Popüler kategori
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 pt-4 border-t border-gray-200">
            <Link
              href="/admin/categories"
              className="w-full sm:w-auto px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors touch-manipulation min-h-[44px] flex items-center justify-center"
            >
              İptal
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center touch-manipulation min-h-[44px]"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 