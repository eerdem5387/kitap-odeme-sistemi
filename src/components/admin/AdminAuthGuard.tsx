'use client'

import { ReactNode, useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { safeLocalStorage, isClient } from '@/lib/browser-utils'

interface AdminAuthGuardProps {
  children: ReactNode
}

export default function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const hasChecked = useRef(false)
  const router = useRouter()

  useEffect(() => {
    // Eğer daha önce kontrol edildiyse tekrar etme
    if (hasChecked.current) {
      setIsLoading(false)
      return
    }

    const checkAuth = () => {
      if (!isClient) return
      
      console.log('AdminAuthGuard: Token kontrolü başlıyor...')
      
      const token = safeLocalStorage.getItem('token')
      const userStr = safeLocalStorage.getItem('user')
      
      console.log('Token:', token ? 'Var' : 'Yok')
      console.log('User:', userStr ? 'Var' : 'Yok')
      
      if (!token || !userStr) {
        console.log('Token veya user yok, login sayfasına yönlendiriliyor...')
        hasChecked.current = true
        router.push('/login?redirect=/admin')
        return
      }

      try {
        const user = JSON.parse(userStr)
        console.log('User role:', user.role)
        
        if (user.role !== 'ADMIN') {
          console.log('Admin değil, ana sayfaya yönlendiriliyor...')
          hasChecked.current = true
          router.push('/')
          return
        }

        console.log('Token ve role geçerli, yetkilendirme başarılı')
        setIsAuthorized(true)
        hasChecked.current = true
      } catch (error) {
        console.error('Admin auth error:', error)
        safeLocalStorage.removeItem('token')
        safeLocalStorage.removeItem('user')
        hasChecked.current = true
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

  return <>{children}</>
} 