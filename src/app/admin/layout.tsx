'use client'

// KALICI ÇÖZÜM: Static generation'ı kapat
export const dynamic = 'force-dynamic'

import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminHeader from '@/components/admin/AdminHeader'
import { safeLocalStorage, safeWindow, isClient } from '@/lib/browser-utils'

interface AdminLayoutProps {
  children: ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = () => {
      if (!isClient) return
      
      const token = safeLocalStorage.getItem('token')
      const userStr = safeLocalStorage.getItem('user')
      
      if (!token || !userStr) {
        router.push('/login?redirect=/admin')
        return
      }

      try {
        const user = JSON.parse(userStr)
        if (user.role !== 'ADMIN') {
          router.push('/')
          return
        }

        setIsAuthorized(true)
      } catch (error) {
        console.error('Auth error:', error)
        safeLocalStorage.removeItem('token')
        safeLocalStorage.removeItem('user')
        router.push('/login?redirect=/admin')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yönlendiriliyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-3 sm:p-4 lg:p-8 ml-0 lg:ml-64 mt-16 pb-20 lg:pb-8 w-0 min-w-0">
          <div className="max-w-full overflow-x-hidden">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
} 