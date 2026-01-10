'use client'

import { useState, useCallback } from 'react'
import { ToastMessage, ToastType } from '@/components/ui/Toast'

let toastIdCounter = 0

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = useCallback((type: ToastType, message: string, duration?: number, action?: { label: string; onClick: () => void }) => {
    const id = `toast-${++toastIdCounter}`
    const newToast: ToastMessage = { id, type, message, duration, action }
    
    setToasts((prev) => [...prev, newToast])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const success = useCallback((message: string, duration?: number, action?: { label: string; onClick: () => void }) => {
    showToast('success', message, duration, action)
  }, [showToast])

  const error = useCallback((message: string, duration?: number, action?: { label: string; onClick: () => void }) => {
    showToast('error', message, duration, action)
  }, [showToast])

  const warning = useCallback((message: string, duration?: number, action?: { label: string; onClick: () => void }) => {
    showToast('warning', message, duration, action)
  }, [showToast])

  const info = useCallback((message: string, duration?: number, action?: { label: string; onClick: () => void }) => {
    showToast('info', message, duration, action)
  }, [showToast])

  return {
    toasts,
    removeToast,
    success,
    error,
    warning,
    info
  }
}

