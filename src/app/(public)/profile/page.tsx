'use client'

import { useState, useEffect } from 'react'
import { User, Mail, Phone, MapPin, Edit, Save, X, LogOut, Package } from 'lucide-react'
import Link from 'next/link'
import { safeLocalStorage, safeWindow, isClient } from '@/lib/browser-utils'

interface UserData {
  id: string
  name: string
  email: string
  phone?: string
  addresses?: Address[]
  orderCount?: number
}

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

export default function ProfilePage() {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [editData, setEditData] = useState({
    name: '',
    phone: ''
  })
  
  // Adres yönetimi state'leri
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const [addressForm, setAddressForm] = useState({
    title: '',
    firstName: '',
    lastName: '',
    phone: '',
    city: '',
    district: '',
    fullAddress: '',
    isDefault: false
  })

  useEffect(() => {
    const fetchProfile = async () => {
      if (!isClient) {
        setIsLoading(false)
        return
      }
      
      const token = safeLocalStorage.getItem('token')
      if (!token) {
        setIsLoading(false)
        setUserData(null)
        // Token yoksa login sayfasına yönlendir
        safeWindow.location.href = '/login?redirect=/profile'
        return
      }
      
      try {
        const res = await fetch('/api/users/profile', {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        if (res.status === 401) {
          // Token geçersiz, localStorage'ı temizle ve login'e yönlendir
          safeLocalStorage.removeItem('token')
          safeLocalStorage.removeItem('user')
          setUserData(null)
          safeWindow.location.href = '/login?redirect=/profile'
          return
        }
        
        if (!res.ok) {
          throw new Error('Profil getirilemedi')
        }
        
        const user = await res.json()
        setUserData(user)
        setEditData({
          name: user.name || '',
          phone: user.phone || ''
        })
        safeLocalStorage.setItem('user', JSON.stringify(user))
      } catch (error) {
        console.error('Profile fetch error:', error)
        setUserData(null)
        // Hata durumunda da login'e yönlendir
        safeWindow.location.href = '/login?redirect=/profile'
      }
      setIsLoading(false)
    }
    
    fetchProfile()
  }, [])

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Token bulunamadı')
      }

      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Profil güncellenirken bir hata oluştu')
      }

      const updatedUser = await response.json()
      setUserData(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating profile:', error)
      alert(error instanceof Error ? error.message : 'Profil güncellenirken bir hata oluştu')
    }
  }

  const handleCancel = () => {
    setEditData({
      name: userData?.name || '',
      phone: userData?.phone || ''
    })
    setIsEditing(false)
  }

  // Adres yönetimi fonksiyonları
  const handleAddAddress = () => {
    setEditingAddress(null)
    setAddressForm({
      title: '',
      firstName: '',
      lastName: '',
      phone: '',
      city: '',
      district: '',
      fullAddress: '',
      isDefault: false
    })
    setShowAddressForm(true)
  }

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address)
    setAddressForm({
      title: address.title,
      firstName: address.firstName,
      lastName: address.lastName,
      phone: address.phone,
      city: address.city,
      district: address.district,
      fullAddress: address.fullAddress,
      isDefault: address.isDefault
    })
    setShowAddressForm(true)
  }

  const handleSaveAddress = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Token bulunamadı')
      }

      const response = await fetch('/api/users/addresses' + (editingAddress ? `/${editingAddress.id}` : ''), {
        method: editingAddress ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(addressForm)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Adres kaydedilirken bir hata oluştu')
      }

      // Profili yeniden yükle
      const profileResponse = await fetch('/api/users/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (profileResponse.ok) {
        const updatedUser = await profileResponse.json()
        setUserData(updatedUser)
      }

      setShowAddressForm(false)
      setEditingAddress(null)
      alert(editingAddress ? 'Adres güncellendi!' : 'Adres eklendi!')
    } catch (error) {
      console.error('Error saving address:', error)
      alert(error instanceof Error ? error.message : 'Adres kaydedilirken bir hata oluştu')
    }
  }

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('Bu adresi silmek istediğinizden emin misiniz?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Token bulunamadı')
      }

      const response = await fetch(`/api/users/addresses/${addressId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Adres silinirken bir hata oluştu')
      }

      // Profili yeniden yükle
      const profileResponse = await fetch('/api/users/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (profileResponse.ok) {
        const updatedUser = await profileResponse.json()
        setUserData(updatedUser)
      }

      alert('Adres silindi!')
    } catch (error) {
      console.error('Error deleting address:', error)
      alert(error instanceof Error ? error.message : 'Adres silinirken bir hata oluştu')
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

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yönlendiriliyor...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 pb-20 lg:pb-0">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
          <h1 className="text-3xl font-bold text-gray-900">Profil Bilgileri</h1>
              <p className="text-gray-600 mt-1">Kişisel bilgilerinizi ve adreslerinizi yönetin</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Profile Info */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Kişisel Bilgiler</h2>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center justify-center px-4 py-2.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 rounded-lg transition-colors touch-manipulation min-h-[44px] w-full sm:w-auto"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Düzenle
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSave}
                      className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 active:bg-green-800 rounded-lg transition-colors touch-manipulation min-h-[44px]"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Kaydet
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg transition-colors touch-manipulation min-h-[44px]"
                    >
                      <X className="h-4 w-4 mr-2" />
                      İptal
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-3">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Ad Soyad
                    </label>
                    {isEditing ? (
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-gray-400" />
                        </div>
                      <input
                        type="text"
                        value={editData.name}
                        onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                          className="block w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          placeholder="Adınız ve soyadınız"
                      />
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <p className="text-gray-900 font-medium">{userData.name}</p>
                  </div>
                    )}
                </div>

                  <div className="md:col-span-3">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      E-posta
                    </label>
                    <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                      <div className="bg-green-100 p-2 rounded-lg">
                        <Mail className="h-5 w-5 text-green-600" />
                  </div>
                      <p className="text-gray-900 font-medium">{userData.email}</p>
                      <span className="ml-auto text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">Değiştirilemez</span>
                </div>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Telefon
                    </label>
                    {isEditing ? (
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Phone className="h-5 w-5 text-gray-400" />
                        </div>
                      <input
                        type="tel"
                        value={editData.phone}
                        onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                          className="block w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          placeholder="5XX XXX XX XX"
                      />
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                        <div className="bg-yellow-100 p-2 rounded-lg">
                          <Phone className="h-5 w-5 text-yellow-600" />
                        </div>
                        <p className="text-gray-900 font-medium">{userData.phone || 'Belirtilmemiş'}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Address List */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Adreslerim</h2>
                  <p className="text-sm text-gray-500 mt-1">Teslimat ve fatura adreslerinizi yönetin</p>
                </div>
                <button 
                  onClick={handleAddAddress}
                  className="flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-all shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 touch-manipulation min-h-[44px] text-sm sm:text-base w-full sm:w-auto"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Yeni Adres Ekle
                </button>
              </div>

              {userData.addresses && userData.addresses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userData.addresses.map((address) => (
                    <div key={address.id} className="border-2 border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-5 w-5 text-blue-600" />
                          <h3 className="font-bold text-gray-900">{address.title}</h3>
                        </div>
                            {address.isDefault && (
                          <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
                                Varsayılan
                              </span>
                            )}
                          </div>
                      <div className="space-y-2 mb-4">
                        <p className="text-gray-700 font-medium">{address.firstName} {address.lastName}</p>
                        <p className="text-gray-600 text-sm">{address.phone}</p>
                        <p className="text-gray-600 text-sm">{address.fullAddress}</p>
                        <p className="text-gray-600 text-sm">{address.district}, {address.city}</p>
                        </div>
                      <div className="flex space-x-2 pt-3 border-t border-gray-200">
                          <button 
                            onClick={() => handleEditAddress(address)}
                          className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            Düzenle
                          </button>
                          <button 
                            onClick={() => handleDeleteAddress(address.id)}
                          className="flex-1 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            Sil
                          </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                    <MapPin className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-medium mb-2">Henüz adres eklenmemiş</p>
                  <p className="text-sm text-gray-500 mb-6">İlk adresinizi ekleyerek hızlı alışveriş yapmaya başlayın</p>
                  <button 
                    onClick={handleAddAddress}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    <MapPin className="h-5 w-5 mr-2" />
                    İlk Adresinizi Ekleyin
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-8">
              <h3 className="text-lg font-bold text-gray-900 mb-6 pb-4 border-b border-gray-200">Hızlı İşlemler</h3>
              
              <div className="space-y-3">
                <Link
                  href="/orders"
                  className="flex items-center p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all group"
                >
                  <div className="bg-blue-100 p-2 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="font-semibold text-gray-900">Siparişlerim</div>
                    <div className="text-xs text-gray-500">
                      {userData.orderCount || 0} sipariş
                    </div>
                  </div>
                </Link>

                <Link
                  href="/products"
                  className="flex items-center p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all group"
                >
                  <div className="bg-green-100 p-2 rounded-lg group-hover:bg-green-200 transition-colors">
                    <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="font-semibold text-gray-900">Ürünler</div>
                    <div className="text-xs text-gray-500">Alışverişe devam et</div>
                  </div>
                </Link>

                <button
                  onClick={() => {
                    if (isClient) {
                      safeLocalStorage.removeItem('token')
                      safeLocalStorage.removeItem('user')
                      safeWindow.dispatchEvent(new Event('userUpdated'))
                      safeWindow.location.href = '/'
                    }
                  }}
                  className="w-full flex items-center p-4 border-2 border-red-200 rounded-xl hover:border-red-300 hover:bg-red-50 transition-all group"
                >
                  <div className="bg-red-100 p-2 rounded-lg group-hover:bg-red-200 transition-colors">
                    <LogOut className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="ml-3 flex-1 text-left">
                    <div className="font-semibold text-red-600">Çıkış Yap</div>
                    <div className="text-xs text-red-500">Hesabınızdan güvenli çıkış</div>
                  </div>
                </button>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Adres Formu Modal */}
      {showAddressForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
              {editingAddress ? 'Adres Düzenle' : 'Yeni Adres Ekle'}
            </h3>
              </div>
              <button
                onClick={() => {
                  setShowAddressForm(false)
                  setEditingAddress(null)
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Adres Başlığı
                </label>
                <input
                  type="text"
                  value={addressForm.title}
                  onChange={(e) => setAddressForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ev, İş, Ofis vb."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Ad
                  </label>
                  <input
                    type="text"
                    value={addressForm.firstName}
                    onChange={(e) => setAddressForm(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Adınız"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Soyad
                  </label>
                  <input
                    type="text"
                    value={addressForm.lastName}
                    onChange={(e) => setAddressForm(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Soyadınız"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Telefon
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                <input
                  type="tel"
                  value={addressForm.phone}
                  onChange={(e) => setAddressForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="block w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="5XX XXX XX XX"
                />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Şehir
                  </label>
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="İstanbul"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    İlçe
                  </label>
                  <input
                    type="text"
                    value={addressForm.district}
                    onChange={(e) => setAddressForm(prev => ({ ...prev, district: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Kadıköy"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tam Adres
                </label>
                <textarea
                  value={addressForm.fullAddress}
                  onChange={(e) => setAddressForm(prev => ({ ...prev, fullAddress: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                  placeholder="Mahalle, sokak, bina no, daire no..."
                />
              </div>

              <div className="flex items-center p-4 bg-blue-50 rounded-xl border-2 border-blue-100">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={addressForm.isDefault}
                  onChange={(e) => setAddressForm(prev => ({ ...prev, isDefault: e.target.checked }))}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="isDefault" className="ml-3 text-sm font-medium text-gray-700 cursor-pointer">
                  Varsayılan adres olarak ayarla
                </label>
              </div>
            </div>

            <div className="flex space-x-3 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={handleSaveAddress}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg font-semibold"
              >
                {editingAddress ? 'Güncelle' : 'Adres Ekle'}
              </button>
              <button
                onClick={() => {
                  setShowAddressForm(false)
                  setEditingAddress(null)
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-200 transition-all font-semibold"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 