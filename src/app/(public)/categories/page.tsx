import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Package, ArrowRight } from 'lucide-react'

// Bu sayfayı dinamik yap
export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    include: {
      _count: {
        select: { products: true }
      }
    },
    orderBy: { name: 'asc' }
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Kategoriler</h1>
          <p className="text-gray-600 mt-2">
            {categories.length} kategori bulundu
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Package className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {category.description}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 mt-2">
                      {category._count.products} ürün
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {categories.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">Henüz kategori bulunmuyor.</p>
              <p className="mt-2">Yakında yeni kategoriler eklenecek.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 