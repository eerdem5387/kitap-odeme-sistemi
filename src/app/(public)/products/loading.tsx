export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="mt-2 h-4 w-56 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-64 space-y-3">
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 w-full bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border shadow-sm p-4">
                <div className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
                <div className="mt-4 h-5 w-3/4 bg-gray-200 rounded animate-pulse" />
                <div className="mt-2 h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
                <div className="mt-4 h-10 w-full bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
