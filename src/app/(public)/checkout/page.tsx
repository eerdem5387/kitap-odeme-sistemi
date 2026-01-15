'use client'

// KALICI ÇÖZÜM: Static generation'ı kapat
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard, Truck, CheckCircle, AlertCircle, ArrowLeft, Mail, User, Phone, MapPin, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { safeSessionStorage, safeLocalStorage, safeWindow, isClient } from '@/lib/browser-utils'

interface CartItem {
  id: string
  name: string
  price: number
  image?: string
  quantity: number
  stock: number
  variationId?: string
  variationKey?: string
}

interface Address {
  id?: string
  title: string
  firstName: string
  lastName: string
  phone: string
  city: string
  district: string
  fullAddress: string
  isDefault?: boolean
}

export default function CheckoutPage() {
  const router = useRouter()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState(1)
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string>('')
  const [customerEmail, setCustomerEmail] = useState('')
  
  // Form state
  const [shippingAddress, setShippingAddress] = useState<Address>({
    title: 'Ev',
    firstName: '',
    lastName: '',
    phone: '',
    city: '',
    district: '',
    fullAddress: ''
  })
  const [useSameAddress, setUseSameAddress] = useState(true)
  const [billingAddress, setBillingAddress] = useState<Address>({
    title: 'Ev',
    firstName: '',
    lastName: '',
    phone: '',
    city: '',
    district: '',
    fullAddress: ''
  })
  const [paymentMethod, setPaymentMethod] = useState('CREDIT_CARD')
  const [notes, setNotes] = useState('')
  const [shippingCost, setShippingCost] = useState<number>(29.99)
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number>(500)

  useEffect(() => {
    const fetchData = async () => {
      if (!isClient) {
        setIsLoading(false)
        return
      }
      
      // SessionStorage'dan sepet verilerini al
      const savedCartSession = safeSessionStorage.getItem('cart')
      const savedCartLocal = safeLocalStorage.getItem('cart')
      if (savedCartLocal) {
        try {
          const parsed = JSON.parse(savedCartLocal)
          const items = Array.isArray(parsed) ? parsed : (parsed.items || [])
          setCartItems(items)
        } catch {
          // fallback to session
          if (savedCartSession) setCartItems(JSON.parse(savedCartSession))
        }
      } else if (savedCartSession) {
        setCartItems(JSON.parse(savedCartSession))
      }

      // Kargo ayarlarını yükle
      try {
        const res = await fetch('/api/settings?category=shipping')
        if (res.ok) {
          const data = await res.json()
          const shippingSettings = data?.shipping || {}
          if (typeof shippingSettings.defaultShippingCost === 'number') {
            setShippingCost(shippingSettings.defaultShippingCost)
          }
          if (typeof shippingSettings.freeShippingThreshold === 'number') {
            setFreeShippingThreshold(shippingSettings.freeShippingThreshold)
          }
        }
      } catch (e) {
        // Sessizce varsayılana düş
        console.error('Shipping settings load error:', e)
      }

      // Kullanıcının kayıtlı adreslerini getir
      const token = safeLocalStorage.getItem('token')
      if (token) {
        try {
          const response = await fetch('/api/users/addresses', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          
          if (response.ok) {
            const addresses = await response.json()
            setSavedAddresses(addresses)
            const defaultAddress = addresses.find((addr: Address) => addr.isDefault)
            if (defaultAddress) {
              setSelectedAddressId(defaultAddress.id || '')
              setShippingAddress({
                title: defaultAddress.title,
                firstName: defaultAddress.firstName,
                lastName: defaultAddress.lastName,
                phone: defaultAddress.phone,
                city: defaultAddress.city,
                district: defaultAddress.district,
                fullAddress: defaultAddress.fullAddress
              })
            }
          } else if (response.status === 401) {
            // Geçersiz/expire olmuş token: temizle ve misafir akışına geç
            safeLocalStorage.removeItem('token')
            safeLocalStorage.removeItem('user')
          }
        } catch (error) {
          // sessiz geç
        }
      }
      
      setIsLoading(false)
    }

    fetchData()
    
    // Sayfa görünür olduğunda kargo ayarlarını yenile
    const loadShippingSettings = async () => {
      try {
        const res = await fetch('/api/settings?category=shipping')
        if (res.ok) {
          const data = await res.json()
          const shippingSettings = data?.shipping || {}
          if (typeof shippingSettings.defaultShippingCost === 'number') {
            setShippingCost(shippingSettings.defaultShippingCost)
          }
          if (typeof shippingSettings.freeShippingThreshold === 'number') {
            setFreeShippingThreshold(shippingSettings.freeShippingThreshold)
          }
        }
      } catch (e) {
        console.error('Shipping settings load error:', e)
      }
    }
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadShippingSettings()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    const handleFocus = () => {
      loadShippingSettings()
    }
    window.addEventListener('focus', handleFocus)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, []) // Boş dependency array - sadece component mount olduğunda çalışır

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const shipping = (() => {
    // Eğer eşik 0 veya geçersizse, her zaman shippingCost kullan
    if (!isFinite(freeShippingThreshold) || freeShippingThreshold <= 0) {
      return shippingCost
    }
    return subtotal >= freeShippingThreshold ? 0 : shippingCost
  })()
  const total = subtotal + shipping

  const handleAddressSelect = (address: Address) => {
    setSelectedAddressId(address.id || '')
    setShippingAddress({
      title: address.title,
      firstName: address.firstName,
      lastName: address.lastName,
      phone: address.phone,
      city: address.city,
      district: address.district,
      fullAddress: address.fullAddress
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const token = localStorage.getItem('token')

      const orderData: any = {
        items: cartItems.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price,
          variationId: item.variationId
        })),
        shippingAddress,
        billingAddress: useSameAddress ? undefined : billingAddress,
        notes
      }

      if (!token) {
        // guest checkout requires email
        if (!customerEmail) {
          alert('Lütfen e-posta adresinizi giriniz')
          setIsSubmitting(false)
          return
        }
        orderData.customerEmail = customerEmail
        orderData.customerName = `${shippingAddress.firstName} ${shippingAddress.lastName}`.trim()
        orderData.customerPhone = shippingAddress.phone
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(orderData)
      })

      if (!response.ok) {
        let message = 'Sipariş oluşturulurken bir hata oluştu'
        try {
          const errorData = await response.json()
          message = errorData.error || message
        } catch {}
        throw new Error(message)
      }

      const order = await response.json()

      // Persist guest identity for payment page if not logged in
      if (!token) {
        try {
          localStorage.setItem('userEmail', customerEmail)
          localStorage.setItem('userName', `${shippingAddress.firstName} ${shippingAddress.lastName}`.trim())
          localStorage.setItem('userPhone', shippingAddress.phone || '')
        } catch {}
      }
      
      router.push(`/payment/${order.id}`)
    } catch (error: any) {
      console.error('Error creating order:', error)
      alert(error?.message || 'Sipariş oluşturulurken bir hata oluştu')
    } finally {
      setIsSubmitting(false)
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

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Sepetiniz Boş</h1>
            <p className="text-gray-600 mb-8">
              Ödeme yapmak için sepetinizde ürün bulunması gerekiyor.
            </p>
            <button
              onClick={() => router.push('/products')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Alışverişe Başla
            </button>
          </div>
        </div>
      </div>
    )
  }

  const isLoggedIn = safeLocalStorage.getItem('token')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 pb-20 lg:pb-0">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => router.push('/cart')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors font-medium"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Sepete Geri Dön
            </button>
            {!isLoggedIn && (
              <Link
                href="/login?redirect=/checkout"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Giriş Yap
              </Link>
            )}
          </div>
          
          {/* Progress Bar - Mobile Optimized */}
          <div className="relative">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              {/* Step 1 */}
              <div className="flex flex-col items-center flex-1">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center border-2 transition-all mb-1 sm:mb-2 ${
                  step >= 1 ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-gray-300 text-gray-400'
                }`}>
                  {step > 1 ? <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" /> : <span className="text-xs sm:text-sm lg:text-base">1</span>}
                </div>
                <span className={`text-xs sm:text-sm font-medium ${step >= 1 ? 'text-blue-600' : 'text-gray-400'} hidden sm:inline`}>
                  Teslimat
                </span>
              </div>
              
              {/* Connector */}
              <div className={`flex-1 h-0.5 sm:h-1 mx-1 sm:mx-2 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'} transition-colors`} />
              
              {/* Step 2 */}
              <div className="flex flex-col items-center flex-1">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center border-2 transition-all mb-1 sm:mb-2 ${
                  step >= 2 ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-gray-300 text-gray-400'
                }`}>
                  {step > 2 ? <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" /> : <span className="text-xs sm:text-sm lg:text-base">2</span>}
                </div>
                <span className={`text-xs sm:text-sm font-medium ${step >= 2 ? 'text-blue-600' : 'text-gray-400'} hidden sm:inline`}>
                  Ödeme
                </span>
              </div>
              
              {/* Connector */}
              <div className={`flex-1 h-0.5 sm:h-1 mx-1 sm:mx-2 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-300'} transition-colors`} />
              
              {/* Step 3 */}
              <div className="flex flex-col items-center flex-1">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center border-2 transition-all mb-1 sm:mb-2 ${
                  step >= 3 ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-gray-300 text-gray-400'
                }`}>
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                </div>
                <span className={`text-xs sm:text-sm font-medium ${step >= 3 ? 'text-blue-600' : 'text-gray-400'} hidden sm:inline`}>
                  Onay
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* Guest Checkout Notice */}
              {!isLoggedIn && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-yellow-800 mb-1">Misafir Olarak Devam Ediyorsunuz</h3>
                      <p className="text-sm text-yellow-700">
                        Sipariş takibi için e-posta adresiniz gereklidir. 
                        <Link href="/login?redirect=/checkout" className="ml-1 font-semibold underline">
                          Giriş yaparak
                        </Link>
                        {' '}kayıtlı adreslerinizi kullanabilirsiniz.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Shipping Address */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center mb-6 pb-4 border-b border-gray-200">
                  <div className="bg-blue-100 p-2 rounded-lg mr-3">
                    <Truck className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Teslimat Adresi</h2>
                    <p className="text-sm text-gray-500 mt-1">Ürünlerinizin teslim edileceği adres</p>
                  </div>
                </div>

                {/* Email (guest checkout) */}
                {!isLoggedIn && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-xl border-2 border-blue-100">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-blue-600" />
                      E-posta Adresi <span className="text-red-500 ml-1">*</span>
                  </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="ornek@domain.com"
                        required
                        className="block w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Sipariş onayı ve takip bilgileri bu adrese gönderilecektir.
                  </p>
                </div>
                )}

                {/* Kayıtlı Adresler */}
                {savedAddresses.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-blue-600" />
                      Kayıtlı Adresleriniz
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {savedAddresses.map((address) => (
                        <div
                          key={address.id}
                          className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                            selectedAddressId === address.id
                              ? 'border-blue-500 bg-blue-50 shadow-md'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                          }`}
                          onClick={() => handleAddressSelect(address)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <MapPin className={`h-4 w-4 ${selectedAddressId === address.id ? 'text-blue-600' : 'text-gray-400'}`} />
                              <p className="font-bold text-gray-900">{address.title}</p>
                            </div>
                            {address.isDefault && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-semibold">
                                Varsayılan
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-700 mb-1">
                            {address.firstName} {address.lastName}
                          </p>
                          <p className="text-sm text-gray-600 mb-1">{address.phone}</p>
                          <p className="text-sm text-gray-600">
                            {address.fullAddress}, {address.district}, {address.city}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Adres Başlığı <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.title}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Ev, İş, Ofis vb."
                        required
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>
                    
                    <div className="md:col-span-1">
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <Phone className="h-4 w-4 mr-1 text-gray-500" />
                        Telefon <span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Phone className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="tel"
                          value={shippingAddress.phone}
                          onChange={(e) => setShippingAddress(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="5XX XXX XX XX"
                      required
                          className="block w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <User className="h-4 w-4 mr-1 text-gray-500" />
                        Ad <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.firstName}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="Adınız"
                      required
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                  
                  <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Soyad <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.lastName}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Soyadınız"
                      required
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Şehir <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.city}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="İstanbul"
                      required
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                  
                  <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        İlçe <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.district}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, district: e.target.value }))}
                        placeholder="Kadıköy"
                      required
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <MapPin className="h-4 w-4 mr-1 text-gray-500" />
                      Tam Adres <span className="text-red-500 ml-1">*</span>
                    </label>
                    <textarea
                      value={shippingAddress.fullAddress}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, fullAddress: e.target.value }))}
                      placeholder="Mahalle, sokak, bina no, daire no..."
                      required
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Billing Address */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                  <div className="flex items-center">
                    <div className="bg-green-100 p-2 rounded-lg mr-3">
                      <CreditCard className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Fatura Adresi</h2>
                      <p className="text-sm text-gray-500 mt-1">Fatura için kullanılacak adres</p>
                    </div>
                  </div>
                  <label className="flex items-center p-3 bg-blue-50 rounded-xl cursor-pointer hover:bg-blue-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={useSameAddress}
                      onChange={(e) => setUseSameAddress(e.target.checked)}
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">Teslimat adresi ile aynı</span>
                  </label>
                </div>
                
                {!useSameAddress && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Billing address fields - same as shipping */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Adres Başlığı
                      </label>
                      <input
                        type="text"
                        value={billingAddress.title}
                        onChange={(e) => setBillingAddress(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ad
                      </label>
                      <input
                        type="text"
                        value={billingAddress.firstName}
                        onChange={(e) => setBillingAddress(prev => ({ ...prev, firstName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Soyad
                      </label>
                      <input
                        type="text"
                        value={billingAddress.lastName}
                        onChange={(e) => setBillingAddress(prev => ({ ...prev, lastName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Telefon
                      </label>
                      <input
                        type="tel"
                        value={billingAddress.phone}
                        onChange={(e) => setBillingAddress(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Şehir
                      </label>
                      <input
                        type="text"
                        value={billingAddress.city}
                        onChange={(e) => setBillingAddress(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        İlçe
                      </label>
                      <input
                        type="text"
                        value={billingAddress.district}
                        onChange={(e) => setBillingAddress(prev => ({ ...prev, district: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tam Adres
                      </label>
                      <textarea
                        value={billingAddress.fullAddress}
                        onChange={(e) => setBillingAddress(prev => ({ ...prev, fullAddress: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Sipariş Notları</h2>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Siparişinizle ilgili özel notlarınızı buraya yazabilirsiniz (opsiyonel)..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                />
              </div>
            </form>
          </div>

          {/* Order Summary - Mobile: Sticky bottom, Desktop: Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl border border-gray-100 p-4 sm:p-6 sticky bottom-20 lg:bottom-auto lg:top-8 z-40 lg:z-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-200">Sipariş Özeti</h2>
              
              {/* Cart Items */}
              <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                    <div className="flex-shrink-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center border-2 border-gray-200">
                          <ShoppingCart className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 truncate">{item.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">Adet: {item.quantity} x {item.price.toFixed(2)} ₺</p>
                    </div>
                    <div className="text-sm font-bold text-blue-600">
                      ₺{(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Totals */}
              <div className="border-t-2 border-gray-200 pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Ara Toplam</span>
                  <span className="font-semibold text-gray-900">₺{subtotal.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Kargo</span>
                  <span className="font-semibold text-green-600 flex items-center">
                    {shipping === 0 ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Ücretsiz
                      </>
                    ) : (
                      `₺${shipping.toFixed(2)}`
                    )}
                  </span>
                </div>
                
                <div className="border-t-2 border-gray-200 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Toplam</span>
                    <span className="text-xl font-bold text-blue-600">
                      ₺{total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full mt-4 sm:mt-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 sm:py-4 px-4 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center touch-manipulation min-h-[52px] text-sm sm:text-base"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                    <span className="truncate">Sipariş Oluşturuluyor...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" />
                    <span className="truncate">Siparişi Tamamla</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 