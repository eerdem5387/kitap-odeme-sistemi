'use client'

// KALICI ÇÖZÜM: Static generation'ı kapat
export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { CreditCard, DollarSign, TrendingUp, AlertCircle, Search, Filter } from 'lucide-react'

interface Payment {
  id: string
  orderId: string
  amount: number
  method: string
  status: string
  createdAt: string
  order: {
    orderNumber: string
    studentName?: string | null
    user: {
      name: string
      email: string
    }
    items: Array<{
      id: string
      product: {
        name: string
      }
      variation?: {
        attributes: Array<{
          attributeValue: {
            value: string
            attribute: {
              name: string
            }
          }
        }>
      } | null
    }>
  }
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchPayments = async () => {
    try {
      setFetchError(null)
      const token = localStorage.getItem('token')
      if (!token) {
        setFetchError('Oturum bulunamadı. Lütfen tekrar giriş yapın.')
        setPayments([])
        return
      }

      const response = await fetch('/api/payments', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setPayments([])
        setFetchError(typeof data?.error === 'string' ? data.error : 'Ödemeler yüklenemedi.')
        return
      }

      if (Array.isArray(data)) {
        setPayments(data)
      } else {
        setPayments([])
        setFetchError('Geçersiz yanıt formatı.')
      }
    } catch (error) {
      console.error('Error fetching payments:', error)
      setPayments([])
      setFetchError('Ödemeler yüklenirken bir hata oluştu.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  const filteredPayments = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const start = startDate ? new Date(`${startDate}T00:00:00`) : null
    const end = endDate ? new Date(`${endDate}T23:59:59.999`) : null

    return payments.filter((payment) => {
      if (statusFilter !== 'all' && payment.status !== statusFilter) return false
      if (methodFilter !== 'all' && payment.method !== methodFilter) return false

      const created = new Date(payment.createdAt)
      if (start && created < start) return false
      if (end && created > end) return false

      if (!term) return true

      const productNames = payment.order.items
        .map((item) => item.product.name)
        .join(' ')
        .toLowerCase()
      const customerName = (payment.order.user?.name || '').toLowerCase()
      const customerEmail = (payment.order.user?.email || '').toLowerCase()
      const orderNumber = (payment.order.orderNumber || '').toLowerCase()
      const studentName = (payment.order.studentName || '').toLowerCase()

      return (
        productNames.includes(term) ||
        customerName.includes(term) ||
        customerEmail.includes(term) ||
        orderNumber.includes(term) ||
        studentName.includes(term)
      )
    })
  }, [payments, searchTerm, statusFilter, methodFilter, startDate, endDate])

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setMethodFilter('all')
    setStartDate('')
    setEndDate('')
  }

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    statusFilter !== 'all' ||
    methodFilter !== 'all' ||
    startDate !== '' ||
    endDate !== ''

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'PENDING':
        return 'bg-red-100 text-red-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Tamamlandı'
      case 'PENDING':
        return 'Başarısız'
      case 'FAILED':
        return 'Başarısız'
      default:
        return status
    }
  }

  const getMethodText = (method: string) => {
    switch (method) {
      case 'CREDIT_CARD':
        return 'Kredi Kartı'
      case 'BANK_TRANSFER':
        return 'Banka Transferi'
      case 'CASH_ON_DELIVERY':
        return 'Kapıda Ödeme'
      default:
        return method
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
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Ödemeler</h1>
        <p className="text-sm sm:text-base text-gray-600">Tüm ödeme işlemlerini görüntüleyin ve yönetin</p>
      </div>

      {fetchError && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{fetchError}</span>
          <button type="button" onClick={() => { setIsLoading(true); fetchPayments(); }} className="ml-auto text-sm font-medium underline">Tekrar dene</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-lg shadow-sm border">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left">
            <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg flex-shrink-0 mb-2 sm:mb-0">
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-blue-600" />
            </div>
            <div className="sm:ml-3 lg:ml-4 flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Toplam</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{payments.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-lg shadow-sm border">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left">
            <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg flex-shrink-0 mb-2 sm:mb-0">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-green-600" />
            </div>
            <div className="sm:ml-3 lg:ml-4 flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Gelir</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                ₺{payments
                  .filter(p => p.status === 'COMPLETED')
                  .reduce((sum, p) => sum + p.amount, 0)
                  .toLocaleString('tr-TR')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-lg shadow-sm border">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left">
            <div className="p-1.5 sm:p-2 bg-red-100 rounded-lg flex-shrink-0 mb-2 sm:mb-0">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-red-600" />
            </div>
            <div className="sm:ml-3 lg:ml-4 flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Başarısız</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                {payments.filter(p => p.status === 'PENDING').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-lg shadow-sm border">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left">
            <div className="p-1.5 sm:p-2 bg-red-100 rounded-lg flex-shrink-0 mb-2 sm:mb-0">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-red-600" />
            </div>
            <div className="sm:ml-3 lg:ml-4 flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Başarısız</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                {payments.filter(p => p.status === 'FAILED').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-gray-700 font-medium">
            <Filter className="h-4 w-4" />
            Filtreler
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Temizle
            </button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Öğrenci, müşteri, e-posta, ürün veya sipariş no ara..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-sm text-gray-600 block mb-1">Durum</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tümü</option>
              <option value="COMPLETED">Tamamlandı</option>
              <option value="PENDING">Başarısız (Bekleyen)</option>
              <option value="FAILED">Başarısız</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">Yöntem</label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tümü</option>
              <option value="CREDIT_CARD">Kredi Kartı</option>
              <option value="BANK_TRANSFER">Banka Transferi</option>
              <option value="CASH_ON_DELIVERY">Kapıda Ödeme</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">Başlangıç</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">Bitiş</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <p className="text-sm text-gray-500">
          {filteredPayments.length} / {payments.length} ödeme gösteriliyor
        </p>
      </div>

      {/* Payments Table - Desktop */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ürün
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Öğrenci Adı Soyadı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Müşteri
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tutar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Yöntem
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tarih
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-xs">
                          {payment.order.items.length > 0 ? (
                            <div className="space-y-1">
                              {payment.order.items.slice(0, 2).map((item) => (
                                <div key={item.id}>
                                  <span className="font-medium">{item.product.name}</span>
                                  {item.variation && item.variation.attributes.length > 0 && (
                                    <span className="text-gray-600 ml-1">
                                      ({item.variation.attributes
                                        .map(attr => `${attr.attributeValue.attribute.name}: ${attr.attributeValue.value}`)
                                        .join(', ')})
                                    </span>
                                  )}
                                </div>
                              ))}
                              {payment.order.items.length > 2 && (
                                <div className="text-gray-500 text-xs">
                                  +{payment.order.items.length - 2} ürün daha
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500">Ürün bulunamadı</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.order.studentName?.trim() || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {payment.order.user.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {payment.order.user.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ₺{payment.amount.toLocaleString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getMethodText(payment.method)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                          {getStatusText(payment.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(payment.createdAt).toLocaleDateString('tr-TR')}
                      </td>
                    </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    {hasActiveFilters ? 'Filtrelere uygun ödeme bulunamadı.' : 'Henüz ödeme bulunmuyor.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payments Card View - Mobile */}
      <div className="lg:hidden space-y-3">
        {filteredPayments.length > 0 ? (
          filteredPayments.map((payment) => (
            <div key={payment.id} className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="mb-2">
                    {payment.order.items.length > 0 ? (
                      <div className="space-y-1">
                        {payment.order.items.slice(0, 2).map((item) => (
                          <div key={item.id}>
                            <h3 className="text-sm font-semibold text-gray-900">
                              {item.product.name}
                            </h3>
                            {item.variation && item.variation.attributes.length > 0 && (
                              <p className="text-xs text-gray-600 ml-1">
                                {item.variation.attributes
                                  .map(attr => `${attr.attributeValue.attribute.name}: ${attr.attributeValue.value}`)
                                  .join(', ')}
                              </p>
                            )}
                          </div>
                        ))}
                        {payment.order.items.length > 2 && (
                          <p className="text-xs text-gray-500">
                            +{payment.order.items.length - 2} ürün daha
                          </p>
                        )}
                      </div>
                    ) : (
                      <h3 className="text-sm font-semibold text-gray-500">
                        Ürün bulunamadı
                      </h3>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    Öğrenci: {payment.order.studentName?.trim() || '—'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{payment.order.user.name}</p>
                  <p className="text-xs text-gray-500 truncate">{payment.order.user.email}</p>
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ml-2 flex-shrink-0 ${getStatusColor(payment.status)}`}>
                  {getStatusText(payment.status)}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Tutar</p>
                  <p className="text-sm font-semibold text-gray-900">₺{payment.amount.toLocaleString('tr-TR')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Yöntem</p>
                  <p className="text-sm text-gray-900">{getMethodText(payment.method)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 mb-1">Tarih</p>
                  <p className="text-sm text-gray-900">{new Date(payment.createdAt).toLocaleDateString('tr-TR')}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-lg shadow-sm border p-6 text-center text-gray-500">
            {hasActiveFilters ? 'Filtrelere uygun ödeme bulunamadı.' : 'Henüz ödeme bulunmuyor.'}
          </div>
        )}
      </div>
    </div>
  )
}
