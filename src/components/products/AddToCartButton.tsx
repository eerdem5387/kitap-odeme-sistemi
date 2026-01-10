'use client'

import { useState } from 'react'
import { isClient } from '@/lib/browser-utils'
import { useToast } from '@/hooks/useToast'
import Toast from '@/components/ui/Toast'
import { cartService } from '@/lib/cart-service'

interface AddToCartButtonProps {
  product: {
    id: string
    name: string
    slug: string
    price: number
    stock: number
    images?: string[]
  }
  variation?: {
    id: string
    price: number
    stock: number
    images?: string[]
    attributes?: any[]
  }
  className?: string
  quantity?: number
  disabled?: boolean
}

export default function AddToCartButton({ product, variation, className, quantity = 1, disabled }: AddToCartButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toasts, removeToast, success, error } = useToast()

  const addToCart = () => {
    if (!isClient) return
    if (disabled) return
    
    setIsLoading(true)
    
    try {
      cartService.addItem(product, quantity, variation)
      success(
        'Sepete ekleme işlemi başarılı!',
        5000,
        {
          label: 'Sepete Git',
          onClick: () => {
            window.location.href = '/cart'
          }
        }
      )
    } catch (err) {
      console.error('Sepete ekleme hatası:', err)
      error('Sepete eklenirken bir hata oluştu.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <button 
        onClick={addToCart}
        disabled={isLoading || disabled}
        className={className || "bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"}
      >
        {isLoading ? 'Ekleniyor...' : 'Sepete Ekle'}
      </button>
      <Toast toasts={toasts} onRemove={removeToast} />
    </>
  )
}
