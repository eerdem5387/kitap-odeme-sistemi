'use client'

// KALICI ÇÖZÜM: Static generation'ı kapat
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, Eye, Mail, Search, Copy, Check } from 'lucide-react'
import { safeLocalStorage, isClient } from '@/lib/browser-utils'

interface Customer {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  _count: {
    orders: number
    addresses: number
  }
  orders: Array<{
    createdAt: string
    finalAmount: number
  }>
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)

  useEffect(() => {
    const fetchCustomers = async () => {
      if (!isClient) {
        setIsLoading(false)
        return
      }

      try {
        const token = safeLocalStorage.getItem('token')
        if (!token) return

        const response = await fetch('/api/users?role=CUSTOMER', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.ok) {
          const data = await response.json()
          if (Array.isArray(data)) {
            setCustomers(data)
            setFilteredCustomers(data)
          }
        }
      } catch (error) {
        console.error('Error fetching customers:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCustomers()
  }, [])

  useEffect(() => {
    if (!searchTerm) {
      setFilteredCustomers(customers)
      return
    }
    const lowerTerm = searchTerm.toLowerCase()
    const result = customers.filter(
      (c) =>
        c.name.toLowerCase().includes(lowerTerm) ||
        c.email.toLowerCase().includes(lowerTerm),
    )
    setFilteredCustomers(result)
  }, [searchTerm, customers])

  const copyToClipboard = (email: string) => {
    navigator.clipboard.writeText(email)
    setCopiedEmail(email)
    setTimeout(() => setCopiedEmail(null), 2000)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Müşteri Yönetimi
          </h1>
          <p className="text-gray-500 mt-1">
            Toplam {filteredCustomers.length} kayıtlı müşteri
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="İsim veya e-posta ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Customers Table / Cards */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-600">Müşteri</th>
                <th className="px-6 py-4 font-semibold text-gray-600">İletişim</th>
                <th className="px-6 py-4 font-semibold text-gray-600 text-center">
                  Siparişler
                </th>
                <th className="px-6 py-4 font-semibold text-gray-600 text-right">
                  Toplam Harcama
                </th>
                <th className="px-6 py-4 font-semibold text-gray-600 text-right">
                  Kayıt Tarihi
                </th>
                <th className="px-6 py-4 font-semibold text-gray-600 text-right">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-blue-50/30 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium shadow-sm flex-shrink-0">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="font-medium text-gray-900">
                          {customer.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(customer.email)}
                        className="flex items-center gap-2 group/email cursor-pointer"
                      >
                        <span className="text-gray-600">{customer.email}</span>
                        {copiedEmail === customer.email ? (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-gray-400 opacity-0 group-hover/email:opacity-100 transition-opacity" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {customer._count.orders} sipariş
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      ₺
                      {customer.orders
                        .reduce(
                          (sum, order) => sum + Number(order.finalAmount),
                          0,
                        )
                        .toLocaleString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500">
                      {new Date(customer.createdAt).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`mailto:${customer.email}`}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="E-posta Gönder"
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                        <Link
                          href={`/admin/customers/${customer.id}`}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Profili Görüntüle"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <Users className="h-10 w-10 text-gray-300 mb-3" />
                      <p>Müşteri bulunamadı.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map((customer) => (
              <Link
                key={customer.id}
                href={`/admin/customers/${customer.id}`}
                className="block px-4 py-3 flex flex-col gap-2 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {customer.name}
                    </p>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(customer.email)}
                      className="flex items-center gap-1 text-xs text-gray-600 mt-0.5"
                    >
                      <span className="truncate">{customer.email}</span>
                      {copiedEmail === customer.email ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                  <span>{customer._count.orders} sipariş</span>
                  <span>
                    Toplam ₺
                    {customer.orders
                      .reduce(
                        (sum, order) => sum + Number(order.finalAmount),
                        0,
                      )
                      .toLocaleString('tr-TR')}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-400">
                    {new Date(customer.createdAt).toLocaleDateString('tr-TR')}
                  </span>
                  <div className="flex items-center gap-2">
                    <a
                      href={`mailto:${customer.email}`}
                      className="p-1.5 rounded-full bg-gray-50 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      title="E-posta Gönder"
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </a>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        window.location.href = `/admin/customers/${customer.id}`
                      }}
                      className="p-1.5 rounded-full bg-gray-50 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                      title="Profili Görüntüle"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-gray-500">
              <div className="flex flex-col items-center justify-center">
                <Users className="h-10 w-10 text-gray-300 mb-3" />
                <p>Müşteri bulunamadı.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
