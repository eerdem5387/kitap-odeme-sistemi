import { prisma } from '@/lib/prisma'
import ProductCard from '@/components/products/ProductCard'
import ProductFilters from '@/components/products/ProductFilters'
import ProductsMobileFilters from '@/components/products/ProductsMobileFilters'

export const revalidate = 300 // ISR: Cache for 5 minutes

interface ProductsPageProps {
  searchParams: Promise<{
    category?: string
    search?: string
    page?: string
  }>
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  try {
  const params = await searchParams
    const page = parseInt(params.page || '1', 10)
  const limit = 8 // 8 products per page as requested
  const skip = (page - 1) * limit

  // Build filter conditions - simplified (no price range)
  const where: {
    isActive: boolean
    category?: { slug: string }
    OR?: Array<{
      name?: { contains: string; mode: 'insensitive' }
      description?: { contains: string; mode: 'insensitive' }
      sku?: { contains: string; mode: 'insensitive' }
    }>
  } = {
    isActive: true
  }

  if (params.category) {
    where.category = { slug: params.category }
  }

  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { description: { contains: params.search, mode: 'insensitive' } },
      { sku: { contains: params.search, mode: 'insensitive' } }
    ]
  }

  // CRITICAL OPTIMIZATION: Use select instead of include - only fetch what we need
  // Removed variations, attributes, _count - not needed for product listing
    
    // OPTIMIZATION: Fetch products first (critical path), then count and categories in parallel
    // This way users see products faster even if count is slow
    const productsPromise = prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        comparePrice: true,
        images: true,
        productType: true,
        stock: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        // REMOVED: variations, attributes - saves massive query time
      },
      skip,
      take: limit,
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    // Fetch products first (critical path)
    const productsResult = await Promise.allSettled([productsPromise]).then(results => results[0])
    
    // Then fetch count and categories in parallel (non-critical)
    const [totalResult, categoriesResult] = await Promise.allSettled([
      // Count query with timeout protection - if it's too slow, we'll use estimated count
      Promise.race([
        prisma.product.count({ where }),
        new Promise<number>((resolve) => {
          setTimeout(() => resolve(0), 5000) // 5 second timeout for count
        })
      ]) as Promise<number>,
      // Categories - cache this if possible
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true
        }
      })
    ])

    // Handle errors gracefully - don't throw, show empty state instead
    let productsData: any[] = []
    let total = 0
    let categories: any[] = []
    let hasDatabaseError = false
    let errorMessage = ''

    if (productsResult.status === 'rejected') {
      const error = productsResult.reason
      console.error('Error fetching products:', error)
      
      // Check for database quota errors
      if (error?.message?.includes('data transfer quota') || error?.message?.includes('quota')) {
        hasDatabaseError = true
        errorMessage = 'Veritabanı kotası aşıldı. Lütfen daha sonra tekrar deneyin.'
      } else if (error?.code === 'P1001' || error?.code === 'P1008') {
        hasDatabaseError = true
        errorMessage = 'Veritabanı bağlantı hatası. Lütfen daha sonra tekrar deneyin.'
      }
    } else {
      productsData = productsResult.value || []
    }

    if (totalResult.status === 'fulfilled') {
      total = totalResult.value || 0
      // If count timed out (0 returned), estimate based on products fetched
      if (total === 0 && productsData.length > 0) {
        // Estimate: if we got a full page, there are likely more
        total = productsData.length === limit ? (page * limit) + 1 : page * limit
      }
    } else {
      console.error('Error counting products:', totalResult.reason)
      // Fallback: estimate total based on current page
      if (productsData.length > 0) {
        total = productsData.length === limit ? (page * limit) + 1 : page * limit
      }
    }

    if (categoriesResult.status === 'fulfilled') {
      categories = categoriesResult.value || []
    } else {
      console.error('Error fetching categories:', categoriesResult.reason)
    }

  // Convert Decimal to Number for client compatibility
    const products = Array.isArray(productsData) ? productsData.map((product: any) => ({
    ...product,
      price: product.price ? Number(product.price) : 0,
      comparePrice: product.comparePrice ? Number(product.comparePrice) : undefined,
      category: product.category || null
    })) : []

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Page Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8 flex flex-col gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Ürünler</h1>
            {!hasDatabaseError && (
              <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
                {total} ürün bulundu
              </p>
            )}
          </div>

          {/* Mobile Filter Button + Drawer (client component) */}
          <ProductsMobileFilters
            categories={categories}
            currentCategory={params.category}
            currentSearch={params.search}
          />
        </div>

        {/* Database Error Banner */}
        {hasDatabaseError && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700 font-medium">{errorMessage || 'Veritabanı bağlantı sorunu'}</p>
                <p className="mt-1 text-xs text-yellow-600">Lütfen birkaç dakika sonra tekrar deneyin.</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
          {/* Filters Sidebar - Desktop */}
          <div className="lg:w-64 hidden lg:block">
            <ProductFilters 
              categories={categories}
              currentCategory={params.category}
              currentSearch={params.search}
            />
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {products.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                  {products.map((product: any) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* Enhanced Pagination */}
                <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
                  <div className="flex items-center space-x-2">
                    {page > 1 && (
                      <a
                        href={`/products?${new URLSearchParams({
                          ...(params.category ? { category: params.category } : {}),
                          ...(params.search ? { search: params.search } : {}),
                          page: (page - 1).toString()
                        })}`}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                      >
                        ← Önceki
                      </a>
                    )}
                    
                    {/* Page Numbers - Show max 5 pages around current */}
                    {totalPages > 1 && (
                      <div className="hidden sm:flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number
                          if (totalPages <= 5) {
                            pageNum = i + 1
                          } else if (page <= 3) {
                            pageNum = i + 1
                          } else if (page >= totalPages - 2) {
                            pageNum = totalPages - 4 + i
                          } else {
                            pageNum = page - 2 + i
                          }
                          
                          return (
                            <a
                              key={pageNum}
                              href={`/products?${new URLSearchParams({
                                ...(params.category ? { category: params.category } : {}),
                                ...(params.search ? { search: params.search } : {}),
                                page: pageNum.toString()
                              })}`}
                              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center ${
                                pageNum === page
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </a>
                          )
                        })}
                      </div>
                    )}
                    
                    {page < totalPages && (
                      <a
                        href={`/products?${new URLSearchParams({
                          ...(params.category ? { category: params.category } : {}),
                          ...(params.search ? { search: params.search } : {}),
                          page: (page + 1).toString()
                        })}`}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                      >
                        Sonraki →
                      </a>
                    )}
                  </div>
                  
                  <span className="text-sm text-gray-600">
                    Sayfa {page} / {totalPages > 0 ? totalPages : '?'}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-500">
                  {hasDatabaseError ? (
                    <>
                      <p className="text-lg font-medium">Ürünler şu anda yüklenemiyor</p>
                      <p className="mt-2">Lütfen birkaç dakika sonra tekrar deneyin.</p>
                    </>
                  ) : (
                    <>
                  <p className="text-lg font-medium">Ürün bulunamadı</p>
                  <p className="mt-2">Arama kriterlerinizi değiştirmeyi deneyin.</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
  } catch (error: any) {
    console.error('Products page error:', error)
    
    // Check for database quota errors
    if (error?.message?.includes('data transfer quota') || error?.message?.includes('quota')) {
      // Return error page instead of throwing
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-yellow-800">Veritabanı Kotası Aşıldı</h3>
                  <p className="mt-2 text-sm text-yellow-700">
                    Veritabanı transfer kotası aşıldı. Lütfen birkaç dakika sonra tekrar deneyin.
                  </p>
                </div>
          </div>
        </div>
      </div>
    </div>
  )
    }
    
    // For other errors, re-throw to let Next.js error boundary handle it
    throw error
  }
}
