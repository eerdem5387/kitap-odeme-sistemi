'use client'

// KALICI ÇÖZÜM: Static generation'ı kapat
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Settings, Save, Globe, Mail, Shield, CreditCard, Truck } from 'lucide-react'

interface SettingsData {
  general?: {
    siteName?: string
    siteDescription?: string
    contactEmail?: string
    contactPhone?: string
    address?: string
  }
  email?: {
    smtpHost?: string
    smtpPort?: string
    smtpUser?: string
    smtpPassword?: string
    fromName?: string
    fromEmail?: string
  }
  payment?: {
    stripeEnabled?: boolean
    stripePublishableKey?: string
    stripeSecretKey?: string
    paypalEnabled?: boolean
    paypalClientId?: string
    paypalSecret?: string
    ziraatEnabled?: boolean
    ziraatClientId?: string
    ziraat3dUrl?: string
    ziraatProvUsername?: string
    ziraatStoreKey?: string
    ziraatStoreType?: string
    ziraatTerminalId?: string
    ziraatApiUrl?: string
    ziraatProvPassword?: string
    ziraatTestMode?: boolean
  }
  shipping?: {
    freeShippingThreshold?: number | undefined
    defaultShippingCost?: number | undefined
    maxShippingDays?: number | undefined
    allowPickup?: boolean
  }
  security?: {
    sessionTimeout?: number
    maxLoginAttempts?: number
    requireTwoFactor?: boolean
  }
}

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('general')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<SettingsData>({})

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setError(null)
      setIsLoading(true)
      
      // Cache bypass için timestamp ekle
      const response = await fetch(`/api/settings?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      if (!response.ok) {
        throw new Error('Ayarlar yüklenirken bir hata oluştu')
      }
      
      const data = await response.json()
      setSettings(data)
    } catch (error) {
      console.error('Error fetching settings:', error)
      setError(error instanceof Error ? error.message : 'Ayarlar yüklenirken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestZiraat = async () => {
    try {
      setIsSaving(true)
      setError(null)

      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/test-ziraat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: 1.00, // 1 TL test ödemesi
          orderId: `TEST-${Date.now()}`
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ziraat test edilemedi')
      }

      const result = await response.json()
      alert(`Ziraat test başarılı! Redirect URL: ${result.redirectUrl}`)
    } catch (error) {
      console.error('Error testing Ziraat:', error)
      setError(error instanceof Error ? error.message : 'Ziraat test edilemedi')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestMock = async () => {
    try {
      setIsSaving(true)
      setError(null)

      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/test-mock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: 1.00, // 1 TL test ödemesi
          orderId: `TEST-${Date.now()}`
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Mock test edilemedi')
      }

      const result = await response.json()
      alert(`Mock test başarılı! Redirect URL: ${result.redirectUrl}`)
      // Mock ödeme sayfasını aç
      window.open(result.redirectUrl, '_blank')
    } catch (error) {
      console.error('Error testing Mock:', error)
      setError(error instanceof Error ? error.message : 'Mock test edilemedi')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestEmail = async () => {
    try {
      setIsSaving(true)
      setError(null)

      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          to: settings.general?.contactEmail || ''
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'E-posta test edilemedi')
      }

      alert('Test e-postası başarıyla gönderildi!')
    } catch (error) {
      console.error('Error testing email:', error)
      setError(error instanceof Error ? error.message : 'E-posta test edilemedi')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)

      // Tüm ayarları düzleştir
      const flatSettings: Array<{
        key: string
        value: string
        type: string
        category: string
      }> = []
      
      // Genel ayarlar
      if (settings.general) {
        Object.entries(settings.general).forEach(([key, value]) => {
          flatSettings.push({
            key: `general.${key}`,
            value: String(value),
            type: 'string',
            category: 'general'
          })
        })
      }

      // E-posta ayarları
      if (settings.email) {
        Object.entries(settings.email).forEach(([key, value]) => {
          flatSettings.push({
            key: `email.${key}`,
            value: String(value),
            type: 'string',
            category: 'email'
          })
        })
      }

      // Ödeme ayarları
      if (settings.payment) {
        Object.entries(settings.payment).forEach(([key, value]) => {
          flatSettings.push({
            key: `payment.${key}`,
            value: String(value),
            type: typeof value === 'boolean' ? 'boolean' : 'string',
            category: 'payment'
          })
        })
      }

      // Kargo ayarları
      if (settings.shipping) {
        Object.entries(settings.shipping).forEach(([key, value]) => {
          // undefined veya null değerleri atla
          if (value !== undefined && value !== null) {
            flatSettings.push({
              key: `shipping.${key}`,
              value: String(value),
              type: typeof value === 'boolean' ? 'boolean' : 'number',
              category: 'shipping'
            })
          }
        })
      }

      // Güvenlik ayarları
      if (settings.security) {
        Object.entries(settings.security).forEach(([key, value]) => {
          // undefined veya null değerleri atla
          if (value !== undefined && value !== null) {
            flatSettings.push({
              key: `security.${key}`,
              value: String(value),
              type: typeof value === 'boolean' ? 'boolean' : 'number',
              category: 'security'
            })
          }
        })
      }

      const token = localStorage.getItem('token')
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ settings: flatSettings })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ayarlar kaydedilirken bir hata oluştu')
      }

      // Ayarları yeniden yükle
      await fetchSettings()
      alert('Ayarlar başarıyla kaydedildi!')
    } catch (error) {
      console.error('Error saving settings:', error)
      setError(error instanceof Error ? error.message : 'Ayarlar kaydedilirken bir hata oluştu')
    } finally {
      setIsSaving(false)
    }
  }

  const updateSetting = (category: keyof SettingsData, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }))
  }

  const tabs = [
    { id: 'general', name: 'Genel', icon: Settings },
    { id: 'email', name: 'E-posta', icon: Mail },
    { id: 'payment', name: 'Ödeme', icon: CreditCard },
    { id: 'shipping', name: 'Kargo', icon: Truck },
    { id: 'security', name: 'Güvenlik', icon: Shield }
  ]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ayarlar</h1>
          <p className="text-gray-600">Mağaza ayarlarını yapılandırın</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ayarlar</h1>
          <p className="text-gray-600">Mağaza ayarlarını yapılandırın</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Hata</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Ayarlar</h1>
        <p className="text-sm sm:text-base text-gray-600">Mağaza ayarlarını yapılandırın</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-max sm:min-w-0">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center touch-manipulation min-h-[44px] whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="hidden sm:inline">{tab.name}</span>
                <span className="sm:hidden">{tab.name.split(' ')[0]}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border">
        {activeTab === 'general' && (
          <div className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Genel Ayarlar</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Site Adı
                </label>
                <input
                  type="text"
                  value={settings.general?.siteName || ''}
                  onChange={(e) => updateSetting('general', 'siteName', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Site Açıklaması
                </label>
                <input
                  type="text"
                  value={settings.general?.siteDescription || ''}
                  onChange={(e) => updateSetting('general', 'siteDescription', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  İletişim E-posta
                </label>
                <input
                  type="email"
                  value={settings.general?.contactEmail || ''}
                  onChange={(e) => updateSetting('general', 'contactEmail', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  İletişim Telefon
                </label>
                <input
                  type="tel"
                  value={settings.general?.contactPhone || ''}
                  onChange={(e) => updateSetting('general', 'contactPhone', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adres
                </label>
                <textarea
                  value={settings.general?.address || ''}
                  onChange={(e) => updateSetting('general', 'address', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'email' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">E-posta Ayarları</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Host
                </label>
                <input
                  type="text"
                  value={settings.email?.smtpHost || ''}
                  onChange={(e) => updateSetting('email', 'smtpHost', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Port
                </label>
                <input
                  type="number"
                  value={settings.email?.smtpPort || ''}
                  onChange={(e) => updateSetting('email', 'smtpPort', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Kullanıcı
                </label>
                <input
                  type="text"
                  value={settings.email?.smtpUser || ''}
                  onChange={(e) => updateSetting('email', 'smtpUser', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Şifre
                </label>
                <input
                  type="password"
                  value={settings.email?.smtpPassword || ''}
                  onChange={(e) => updateSetting('email', 'smtpPassword', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gönderen Adı
                </label>
                <input
                  type="text"
                  value={settings.email?.fromName || ''}
                  onChange={(e) => updateSetting('email', 'fromName', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gönderen E-posta
                </label>
                <input
                  type="email"
                  value={settings.email?.fromEmail || ''}
                  onChange={(e) => updateSetting('email', 'fromEmail', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                />
              </div>
            </div>
            <div className="mt-6">
              <button
                onClick={handleTestEmail}
                disabled={isSaving}
                className="w-full sm:w-auto bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px]"
              >
                E-posta Ayarlarını Test Et
              </button>
            </div>
          </div>
        )}

        {activeTab === 'payment' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ödeme Ayarları</h3>
            <div className="space-y-6">
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900">Stripe</h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.payment?.stripeEnabled || false}
                      onChange={(e) => updateSetting('payment', 'stripeEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Publishable Key
                    </label>
                    <input
                      type="text"
                      value={settings.payment?.stripePublishableKey || ''}
                      onChange={(e) => updateSetting('payment', 'stripePublishableKey', e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secret Key
                    </label>
                    <input
                      type="password"
                      value={settings.payment?.stripeSecretKey || ''}
                      onChange={(e) => updateSetting('payment', 'stripeSecretKey', e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                    />
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900">PayPal</h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.payment?.paypalEnabled || false}
                      onChange={(e) => updateSetting('payment', 'paypalEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client ID
                    </label>
                    <input
                      type="text"
                      value={settings.payment?.paypalClientId || ''}
                      onChange={(e) => updateSetting('payment', 'paypalClientId', e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secret
                    </label>
                    <input
                      type="password"
                      value={settings.payment?.paypalSecret || ''}
                      onChange={(e) => updateSetting('payment', 'paypalSecret', e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                    />
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h4 className="text-base sm:text-lg font-medium text-gray-900">Ziraat POS (3D Pay Hosting)</h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.payment?.ziraatEnabled || false}
                      onChange={(e) => updateSetting('payment', 'ziraatEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {/* Sol Sütun */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Merchant ID (ClientId)
                    </label>
                    <input
                      type="text"
                      value={settings.payment?.ziraatClientId || ''}
                      onChange={(e) => updateSetting('payment', 'ziraatClientId', e.target.value)}
                      placeholder="Merchant ID (ClientId)"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                    />
                  </div>
                  {/* Sağ Sütun */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Terminal ID
                    </label>
                    <input
                      type="text"
                      value={settings.payment?.ziraatTerminalId || ''}
                      onChange={(e) => updateSetting('payment', 'ziraatTerminalId', e.target.value)}
                      placeholder="Terminal ID"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                    />
                  </div>
                  {/* Sol Sütun */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      3D URL (est3Dgate)
                    </label>
                    <input
                      type="text"
                      value={settings.payment?.ziraat3dUrl || ''}
                      onChange={(e) => updateSetting('payment', 'ziraat3dUrl', e.target.value)}
                      placeholder="3D URL (est3Dgate)"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                    />
                  </div>
                  {/* Sağ Sütun */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API URL (/fim/api)
                    </label>
                    <input
                      type="text"
                      value={settings.payment?.ziraatApiUrl || ''}
                      onChange={(e) => updateSetting('payment', 'ziraatApiUrl', e.target.value)}
                      placeholder="API URL (/fim/api)"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                    />
                  </div>
                  {/* Sol Sütun */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prov Kullanıcı Adı
                    </label>
                    <input
                      type="text"
                      value={settings.payment?.ziraatProvUsername || ''}
                      onChange={(e) => updateSetting('payment', 'ziraatProvUsername', e.target.value)}
                      placeholder="Prov Kullanıcı Adı"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                    />
                  </div>
                  {/* Sağ Sütun */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prov Şifre
                    </label>
                    <input
                      type="password"
                      value={settings.payment?.ziraatProvPassword || ''}
                      onChange={(e) => updateSetting('payment', 'ziraatProvPassword', e.target.value)}
                      placeholder="Prov Şifre"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                    />
                  </div>
                  {/* Sol Sütun */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Store Key (Mağaza Anahtarı)
                    </label>
                    <input
                      type="password"
                      value={settings.payment?.ziraatStoreKey || ''}
                      onChange={(e) => updateSetting('payment', 'ziraatStoreKey', e.target.value)}
                      placeholder="Store Key (Mağaza Anahtarı)"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                    />
                  </div>
                  {/* Sol Sütun */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Store Type (örn: 3d_pay_hosting)
                    </label>
                    <input
                      type="text"
                      value={settings.payment?.ziraatStoreType || ''}
                      onChange={(e) => updateSetting('payment', 'ziraatStoreType', e.target.value)}
                      placeholder="Store Type (örn: 3d_pay_hosting)"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.payment?.ziraatTestMode || false}
                      onChange={(e) => updateSetting('payment', 'ziraatTestMode', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Test Modu (Test ortamı için)</span>
                  </label>
                </div>
                <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-0 sm:flex sm:gap-2">
                  <button
                    onClick={handleTestZiraat}
                    disabled={isSaving}
                    className="w-full sm:w-auto bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px]"
                  >
                    Ziraat Ayarlarını Test Et
                  </button>
                  <button
                    onClick={handleTestMock}
                    disabled={isSaving}
                    className="w-full sm:w-auto bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px]"
                  >
                    Mock Ödeme Test Et
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'shipping' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Kargo Ayarları</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ücretsiz Kargo Limiti (₺)
                </label>
                <input
                  type="number"
                  value={settings.shipping?.freeShippingThreshold ?? ''}
                  onChange={(e) => updateSetting('shipping', 'freeShippingThreshold', e.target.value === '' ? undefined : Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Varsayılan Kargo Ücreti (₺)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.shipping?.defaultShippingCost ?? ''}
                  onChange={(e) => updateSetting('shipping', 'defaultShippingCost', e.target.value === '' ? undefined : Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maksimum Teslimat Süresi (Gün)
                </label>
                <input
                  type="number"
                  value={settings.shipping?.maxShippingDays ?? ''}
                  onChange={(e) => updateSetting('shipping', 'maxShippingDays', e.target.value === '' ? undefined : Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation text-base"
                />
              </div>
              <div className="flex items-center">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.shipping?.allowPickup || false}
                    onChange={(e) => updateSetting('shipping', 'allowPickup', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
                <span className="ml-3 text-sm font-medium text-gray-700">Mağazadan Teslim Alma</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Güvenlik Ayarları</h3>
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <Shield className="h-5 w-5 text-yellow-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Güvenlik Uyarısı
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>Güvenlik ayarları sistem yöneticisi tarafından yapılandırılmıştır.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="px-4 sm:px-6 py-4 border-t bg-gray-50">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full sm:w-auto bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center touch-manipulation min-h-[44px]"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
} 