'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastMessage {
  id: string
  type: ToastType
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastProps {
  toasts: ToastMessage[]
  onRemove: (id: string) => void
}

export default function Toast({ toasts, onRemove }: ToastProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: string) => void }) {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const duration = toast.duration || 3000
    const timer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(() => onRemove(toast.id), 300) // Animation duration
    }, duration)

    return () => clearTimeout(timer)
  }, [toast, onRemove])

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-600" />,
    error: <XCircle className="h-5 w-5 text-red-600" />,
    warning: <AlertCircle className="h-5 w-5 text-yellow-600" />,
    info: <AlertCircle className="h-5 w-5 text-blue-600" />
  }

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200'
  }

  const textColors = {
    success: 'text-green-800',
    error: 'text-red-800',
    warning: 'text-yellow-800',
    info: 'text-blue-800'
  }

  return (
    <div
      className={`
        flex items-start p-4 rounded-lg border shadow-lg
        ${bgColors[toast.type]}
        ${isExiting ? 'animate-slide-out' : 'animate-slide-in'}
        transition-all duration-300
      `}
    >
      <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
      <div className="ml-3 flex-1 min-w-0">
        <p className={`text-sm font-medium ${textColors[toast.type]}`}>
          {toast.message}
        </p>
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick()
              setIsExiting(true)
              setTimeout(() => onRemove(toast.id), 300)
            }}
            className={`mt-2 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
              toast.type === 'success'
                ? 'bg-green-600 text-white hover:bg-green-700'
                : toast.type === 'error'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : toast.type === 'warning'
                ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => {
          setIsExiting(true)
          setTimeout(() => onRemove(toast.id), 300)
        }}
        className="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

