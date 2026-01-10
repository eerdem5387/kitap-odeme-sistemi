'use client'

import { useState, useEffect } from 'react'
import Header from './Header'

export default function HeaderWrapper() {
  const [siteName, setSiteName] = useState('Levent Kolej Ürün Hizmeti')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchSettings = async () => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3000)
      try {
        const response = await fetch('/api/settings', { signal: controller.signal })
        if (response.ok) {
          const data = await response.json()
          const siteNameSetting = (data?.general && data.general.siteName) || null
          if (siteNameSetting) {
            setSiteName(siteNameSetting)
          }
        }
      } catch (error) {
        // silent fallback
      } finally {
        clearTimeout(timeout)
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [])

  if (isLoading) {
    return <Header siteName="Levent Kolej Ürün Hizmeti" />
  }
  
  return <Header siteName={siteName} />
} 