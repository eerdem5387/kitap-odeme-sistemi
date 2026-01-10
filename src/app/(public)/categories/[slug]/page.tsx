import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import ProductCard from '@/components/products/ProductCard'
import Link from 'next/link'

export const revalidate = 120

interface CategoryPageProps {
  params: Promise<{
    slug: string
  }>
  searchParams: Promise<{
    page?: string
    minPrice?: string
    maxPrice?: string
    search?: string
  }>
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params
  const resolvedSearchParams = await searchParams
  const page = parseInt(resolvedSearchParams.page || '1')
  const limit = 12
  const skip = (page - 1) * limit

  // Find category with server-side optimization
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      _count: {
        select: { products: true }
      }
    }
  })

  if (!category || !category.isActive) {
    notFound()
  }

  // Build filter conditions
  const where: {
    categoryId: string
    isActive: boolean
    OR?: Array<{
      name?: { contains: string; mode: 'insensitive' }
      description?: { contains: string; mode: 'insensitive' }
    }>
    price?: { gte?: number; lte?: number }
  } = {
    categoryId: category.id,
    isActive: true
  }

  if (resolvedSearchParams.search) {
    where.OR = [
      { name: { contains: resolvedSearchParams.search, mode: 'insensitive' } },
      { description: { contains: resolvedSearchParams.search, mode: 'insensitive' } }
    ]
  }

  if (resolvedSearchParams.minPrice || resolvedSearchParams.maxPrice) {
    where.price = {}
    if (resolvedSearchParams.minPrice) where.price.gte = parseFloat(resolvedSearchParams.minPrice)
    if (resolvedSearchParams.maxPrice) where.price.lte = parseFloat(resolvedSearchParams.maxPrice)
  }

  // Fetch products and total count in parallel
  const [productsData, total] = await Promise.all([
    (prisma.product as any).findMany({
      where,
      include: {
        category: true,
        _count: {
          select: { reviews: true }
        }
      },
      skip,
      take: limit,
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' }
      ]
    }),
    prisma.product.count({ where })
  ])

  // Convert Decimal to Number for client compatibility
  const products = productsData.map((product: any) => ({
    ...product,
    price: Number(product.price),
    comparePrice: product.comparePrice ? Number(product.comparePrice) : undefined
  }))

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-8">
          <ol className="flex items-center space-x-2">
            <li><Link href="/" className="hover:text-gray-700">Ana Sayfa</Link></li>
            <li>/</li>
            <li><Link href="/categories" className="hover:text-gray-700">Kategoriler</Link></li>
            <li>/</li>
            <li className="text-gray-900">{category.name}</li>
          </ol>
        </nav>

        {/* Category Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{category.name}</h1>
          {category.description && (
            <p className="text-gray-600 mb-4">{category.description}</p>
          )}
          <p className="text-sm text-gray-500">
            {total} ürün bulundu
          </p>
        </div>

        {/* Products Grid */}
        {products.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {products.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center">
                <nav className="flex items-center space-x-2">
                  {page > 1 && (
                    <a
                      href={`/categories/${slug}?${new URLSearchParams({
                        ...resolvedSearchParams,
                        page: (page - 1).toString()
                      })}`}
                      className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Önceki
                    </a>
                  )}
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <a
                      key={pageNum}
                      href={`/categories/${slug}?${new URLSearchParams({
                        ...resolvedSearchParams,
                        page: pageNum.toString()
                      })}`}
                      className={`px-3 py-2 text-sm font-medium rounded-lg ${
                        pageNum === page
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </a>
                  ))}
                  
                  {page < totalPages && (
                    <a
                      href={`/categories/${slug}?${new URLSearchParams({
                        ...resolvedSearchParams,
                        page: (page + 1).toString()
                      })}`}
                      className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Sonraki
                    </a>
                  )}
                </nav>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <p className="text-lg font-medium">Bu kategoride henüz ürün bulunmuyor.</p>
              <p className="mt-2">Diğer kategorilerimizi keşfedin.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 