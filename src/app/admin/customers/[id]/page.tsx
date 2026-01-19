'use client'

// KALICI ÇÖZÜM: Static generation'ı kapat
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  ShoppingCart, 
  DollarSign, 
  Calendar,
  ArrowLeft,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  Eye
} from 'lucide-react'

interface Address {
  id: string
  title: string
  firstName: string
  lastName: string
  phone: string
  city: string
  district: string
  fullAddress: string
  isDefault: boolean
}

interface OrderItem {
  id: string
  product: {
    id: string
    name: string
    images: string[]
  }
  variation?: {
    attributes: Array<{
      attributeValue: {
        value: string
        price?: number | null
        attribute: {
          name: string
        }
      }
    }>
  }
}

interface Order {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  finalAmount: number
  createdAt: string
  items: OrderItem[]
  shippingAddress: {
    firstName: string
    lastName: string
    city: string
    district: string
  }
  _count: {
    items: number
  }
}

interface Customer {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  createdAt: string
  addresses: Address[]
  orders: Order[]
  _count: {
    orders: number
    addresses: number
  }
  totalSpent: number
}

export default function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchCustomerData = async () => {
      const resolvedParams = await params
      fetchCustomer(resolvedParams.id)
    }
    fetchCustomerData()
  }, [params])

  const fetchCustomer = async (customerId: string) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Yetkilendirme gerekli')
      }

      const response = await fetch(`/api/admin/customers/${customerId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Müşteri bulunamadı')
      }
      const data = await response.json()
      setCustomer(data)
    } catch (error) {
      console.error('Error fetching customer:', error)
      alert('Müşteri yüklenirken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800'
      case 'SHIPPED':
        return 'bg-purple-100 text-purple-800'
      case 'DELIVERED':
        return 'bg-green-100 text-green-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Beklemede'
      case 'CONFIRMED':
        return 'Onaylandı'
      case 'SHIPPED':
        return 'Kargoda'
      case 'DELIVERED':
        return 'Teslim Edildi'
      case 'CANCELLED':
        return 'İptal Edildi'
      default:
        return status
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4" />
      case 'CONFIRMED':
        return <CheckCircle2 className="h-4 w-4" />
      case 'SHIPPED':
        return <Truck className="h-4 w-4" />
      case 'DELIVERED':
        return <Package className="h-4 w-4" />
      case 'CANCELLED':
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Ödendi'
      case 'PENDING':
        return 'Beklemede'
      case 'FAILED':
        return 'Başarısız'
      default:
        return status
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Müşteri Bulunamadı</h1>
          <button
            onClick={() => router.push('/admin/customers')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Müşterilere Dön
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin/customers')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Müşterilere Dön
          </button>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {customer.name}
              </h1>
              <p className="text-gray-600 mt-1">
                {customer.email}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Info */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2" />
                Müşteri Bilgileri
              </h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">E-posta</p>
                    <p className="font-medium text-gray-900">{customer.email}</p>
                  </div>
                </div>
                {customer.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Telefon</p>
                      <p className="font-medium text-gray-900">{customer.phone}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Kayıt Tarihi</p>
                    <p className="font-medium text-gray-900">
                      {new Date(customer.createdAt).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Addresses */}
            {customer.addresses.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Adresler ({customer.addresses.length})
                </h2>
                <div className="space-y-4">
                  {customer.addresses.map((address) => (
                    <div key={address.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-gray-900">{address.title}</span>
                            {address.isDefault && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                Varsayılan
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {address.firstName} {address.lastName}
                          </p>
                          <p className="text-sm text-gray-600">{address.phone}</p>
                          <p className="text-sm text-gray-600 mt-1">{address.fullAddress}</p>
                          <p className="text-sm text-gray-600">
                            {address.district}, {address.city}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Orders */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Siparişler ({customer.orders.length})
              </h2>
              {customer.orders.length > 0 ? (
                <div className="space-y-4">
                  {customer.orders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/admin/orders/${order.id}`}
                      className="block border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-gray-900">
                              #{order.orderNumber}
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                              {getStatusIcon(order.status)}
                              <span className="ml-1">{getStatusText(order.status)}</span>
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(order.paymentStatus)}`}>
                              {getPaymentStatusText(order.paymentStatus)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {order.items?.length || order._count?.items || 0} ürün • {order.shippingAddress.city}, {order.shippingAddress.district}
                          </p>
                          {order.items && order.items.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {order.items.slice(0, 3).map((item, idx) => (
                                <span key={idx} className="text-xs text-gray-500">
                                  {item.product.name}
                                  {item.variation && item.variation.attributes && item.variation.attributes.length > 0 && (
                                    <span className="text-gray-400">
                                      {' '}({item.variation.attributes.map(attr => {
                                        const optionPrice = attr?.attributeValue?.price ? Number(attr.attributeValue.price) : null
                                        const attributeName = attr?.attributeValue?.attribute?.name || ''
                                        const attributeValue = attr?.attributeValue?.value || ''
                                        const priceText = optionPrice !== null && optionPrice !== 0 && !isNaN(optionPrice)
                                          ? ` ${optionPrice > 0 ? '+' : ''}₺${Math.abs(optionPrice).toFixed(2)}`
                                          : ''
                                        return `${attributeName}: ${attributeValue}${priceText}`
                                      }).join(', ')})
                                    </span>
                                  )}
                                  {idx < Math.min(order.items.length, 3) - 1 && ','}
                                </span>
                              ))}
                              {order.items.length > 3 && (
                                <span className="text-xs text-gray-400">
                                  +{order.items.length - 3} daha
                                </span>
                              )}
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(order.createdAt).toLocaleDateString('tr-TR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-semibold text-gray-900">
                            ₺{Number(order.finalAmount).toLocaleString('tr-TR')}
                          </p>
                          <Eye className="h-4 w-4 text-gray-400 mt-2 mx-auto" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p>Henüz sipariş bulunmuyor.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Özet</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-blue-600" />
                    <span className="text-gray-600">Toplam Sipariş</span>
                  </div>
                  <span className="font-semibold text-gray-900">{customer._count.orders}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <span className="text-gray-600">Toplam Harcama</span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    ₺{customer.totalSpent.toLocaleString('tr-TR')}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-purple-600" />
                    <span className="text-gray-600">Kayıtlı Adres</span>
                  </div>
                  <span className="font-semibold text-gray-900">{customer._count.addresses}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

