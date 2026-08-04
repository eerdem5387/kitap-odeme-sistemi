'use client'

// KALICI ÇÖZÜM: Static generation'ı kapat
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, TrendingDown, ShoppingCart, Users, Download, Filter, DollarSign } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Category {
  id: string
  name: string
}

interface ReportData {
  summary: {
    sales: { current: number; previous: number; change: string }
    orders: { current: number; previous: number; change: string }
    customers: { current: number; previous: number; change: string }
    averageOrder: { current: number; previous: number; change: string }
  }
  topProducts: Array<{
    id: string
    name: string
    sales: number
    revenue: number
    category: string
  }>
  topCategories: Array<{
    name: string
    sales: number
    revenue: number
  }>
  monthlyData: Array<{
    month: string
    sales: number
    orders: number
  }>
  studentOrders: Array<{
    id: string
    orderNumber: string
    studentName: string
    parentName: string
    products: string
    finalAmount: number
    createdAt: string
  }>
}

export default function AdminReportsPage() {
  const router = useRouter()
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [exportingProductId, setExportingProductId] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [reportData, setReportData] = useState<ReportData | null>(null)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories')
        if (res.ok) {
          const data = await res.json()
          setCategories(data)
        }
      } catch (error) {
        console.error('Kategoriler yüklenemedi', error)
      }
    }
    fetchCategories()
  }, [])

  useEffect(() => {
    const fetchReport = async () => {
      setIsLoading(true)
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          router.push('/login?redirect=/admin/reports')
          return
        }

        const params = new URLSearchParams()
        params.append('period', selectedPeriod)
        if (selectedCategory !== 'all') params.append('categoryId', selectedCategory)
        if (startDate) params.append('startDate', startDate)
        if (endDate) params.append('endDate', endDate)

        const res = await fetch(`/api/admin/reports?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            router.push('/login?redirect=/admin/reports')
            return
          }
          throw new Error('Rapor yüklenemedi')
        }

        const data = await res.json()
        setReportData(data)
      } catch (error) {
        console.error('Rapor hatası:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchReport()
  }, [selectedPeriod, selectedCategory, startDate, endDate, router])

  const downloadExport = async (productId?: string, productName?: string) => {
    try {
      if (productId) setExportingProductId(productId)
      else setIsExporting(true)

      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login?redirect=/admin/reports')
        return
      }

      const params = new URLSearchParams()
      params.append('period', selectedPeriod)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      if (productId) params.append('productId', productId)

      const res = await fetch(`/api/admin/reports/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!res.ok) {
        throw new Error('İndirme başarısız')
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      const datePart = startDate && endDate
        ? `${startDate}_${endDate}`
        : new Date().toISOString().slice(0, 10)
      const safeName = (productName || 'tum-urunler')
        .toLocaleLowerCase('tr-TR')
        .replace(/[^a-z0-9ğüşıöç\s-]/gi, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 40) || 'rapor'

      link.href = url
      link.download = `rapor_${safeName}_${datePart}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
      alert('Rapor indirilirken hata oluştu')
    } finally {
      setIsExporting(false)
      setExportingProductId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!reportData) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Raporlar</h1>
          <p className="text-gray-600">Satış ve performans analizleri</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="week">Bu Hafta</option>
            <option value="month">Bu Ay</option>
            <option value="quarter">Bu Çeyrek</option>
            <option value="year">Bu Yıl</option>
          </select>
          
          <button 
            onClick={() => downloadExport()}
            disabled={isExporting}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">{isExporting ? 'İndiriliyor...' : 'Excel İndir'}</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center gap-2 mb-4 text-gray-700 font-medium">
            <Filter className="h-4 w-4" />
            Filtreler
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
                <label className="text-sm text-gray-600 block mb-1">Kategori</label>
                <select 
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full border rounded-md p-2"
                >
                    <option value="all">Tüm Kategoriler</option>
                    {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="text-sm text-gray-600 block mb-1">Başlangıç</label>
                <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border rounded-md p-2"
                />
            </div>
            <div>
                <label className="text-sm text-gray-600 block mb-1">Bitiş</label>
                <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border rounded-md p-2"
                />
            </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Excel indirme seçili tarih aralığına göre hazırlanır. Tarih boşsa üstteki dönem filtresi kullanılır.
          Dosyada yalnızca öğrenci adı, ürün, işlem tarihi ve ürün bazlı satış adedi yer alır.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
            title="Toplam Satış" 
            value={`₺${reportData.summary.sales.current.toLocaleString('tr-TR')}`}
            change={reportData.summary.sales.change}
            icon={<DollarSign className="h-6 w-6 text-green-600" />}
            color="bg-green-50"
        />
        <MetricCard 
            title="Siparişler" 
            value={reportData.summary.orders.current.toString()}
            change={reportData.summary.orders.change}
            icon={<ShoppingCart className="h-6 w-6 text-blue-600" />}
            color="bg-blue-50"
        />
        <MetricCard 
            title="Yeni Müşteriler" 
            value={reportData.summary.customers.current.toString()}
            change={reportData.summary.customers.change}
            icon={<Users className="h-6 w-6 text-purple-600" />}
            color="bg-purple-50"
        />
        <MetricCard 
            title="Ortalama Sepet" 
            value={`₺${reportData.summary.averageOrder.current.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`}
            change={reportData.summary.averageOrder.change}
            icon={<BarChart3 className="h-6 w-6 text-orange-600" />}
            color="bg-orange-50"
        />
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Satılan Ürünler</h3>
            <p className="text-sm text-gray-500 mt-0.5">Her ürün için özel Excel indirebilirsiniz</p>
          </div>
          <span className="text-sm text-gray-500">{reportData.topProducts.length} ürün</span>
        </div>
        <div className="overflow-x-auto max-h-[32rem] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Ürün</th>
                <th className="px-4 py-2 text-left">Kategori</th>
                <th className="px-4 py-2 text-right">Adet</th>
                <th className="px-4 py-2 text-right">Gelir</th>
                <th className="px-4 py-2 text-right">Excel</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reportData.topProducts.map((product, idx) => (
                <tr key={product.id || idx}>
                  <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{product.name}</td>
                  <td className="px-4 py-3 text-gray-600">{product.category}</td>
                  <td className="px-4 py-3 text-right">{product.sales}</td>
                  <td className="px-4 py-3 text-right">₺{product.revenue.toLocaleString('tr-TR')}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => downloadExport(product.id, product.name)}
                      disabled={!product.id || exportingProductId === product.id}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                      title={`${product.name} için Excel indir`}
                    >
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">
                        {exportingProductId === product.id ? '...' : 'İndir'}
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
              {reportData.topProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-gray-500">Veri bulunamadı</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Öğrenci Bazlı Siparişler</h3>
            <p className="text-sm text-gray-500 mt-0.5">Hangi öğrenci için alındığına göre liste</p>
          </div>
          <span className="text-sm text-gray-500">{(reportData.studentOrders || []).length} sipariş</span>
        </div>
        <div className="overflow-x-auto max-h-[32rem] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left">Sipariş</th>
                <th className="px-4 py-2 text-left">Öğrenci Adı</th>
                <th className="px-4 py-2 text-left">Veli / Müşteri</th>
                <th className="px-4 py-2 text-left">Ürünler</th>
                <th className="px-4 py-2 text-right">Tutar</th>
                <th className="px-4 py-2 text-right">Tarih</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(reportData.studentOrders || []).map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <a href={`/admin/orders/${row.id}`} className="text-blue-600 hover:underline">
                      #{row.orderNumber}
                    </a>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{row.studentName}</td>
                  <td className="px-4 py-3 text-gray-600">{row.parentName}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={row.products}>{row.products}</td>
                  <td className="px-4 py-3 text-right">₺{row.finalAmount.toLocaleString('tr-TR')}</td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {new Date(row.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                </tr>
              ))}
              {(reportData.studentOrders || []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-gray-500">Veri bulunamadı</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="font-semibold text-gray-900 mb-4">En İyi Kategoriler</h3>
        <div className="space-y-4">
          {reportData.topCategories.map((cat, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="bg-white text-gray-900 font-bold w-8 h-8 flex items-center justify-center rounded-full border text-xs">
                  {idx + 1}
                </div>
                <span className="font-medium text-gray-900">{cat.name}</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-gray-900">₺{cat.revenue.toLocaleString('tr-TR')}</div>
                <div className="text-xs text-gray-500">{cat.sales} satış</div>
              </div>
            </div>
          ))}
          {reportData.topCategories.length === 0 && (
            <div className="text-center text-gray-500 py-4">Veri bulunamadı</div>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ title, value, change, icon, color }: any) {
    const isPositive = change.startsWith('+')
    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm text-gray-500">{title}</p>
                    <h3 className="text-xl font-bold text-gray-900 mt-1">{value}</h3>
                </div>
                <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
            </div>
            <div className={`mt-2 text-xs font-medium flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {change}
                <span className="text-gray-400 ml-1 font-normal">geçen döneme göre</span>
            </div>
        </div>
    )
}
