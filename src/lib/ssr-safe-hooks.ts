// SSR-safe hooks for common patterns
import { useEffect, useState } from 'react'
import { safeLocalStorage, safeSessionStorage, isClient } from './browser-utils'

// Hook for localStorage with SSR safety
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (!isClient) return

    try {
      const item = safeLocalStorage.getItem(key)
      if (item) {
        setStoredValue(JSON.parse(item))
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
    } finally {
      setIsLoaded(true)
    }
  }, [key])

  const setValue = (value: T | ((val: T) => T)) => {
    if (!isClient) return

    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      safeLocalStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }

  return [storedValue, setValue, isLoaded] as const
}

// Hook for sessionStorage with SSR safety
export function useSessionStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (!isClient) return

    try {
      const item = safeSessionStorage.getItem(key)
      if (item) {
        setStoredValue(JSON.parse(item))
      }
    } catch (error) {
      console.error(`Error reading sessionStorage key "${key}":`, error)
    } finally {
      setIsLoaded(true)
    }
  }, [key])

  const setValue = (value: T | ((val: T) => T)) => {
    if (!isClient) return

    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      safeSessionStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.error(`Error setting sessionStorage key "${key}":`, error)
    }
  }

  return [storedValue, setValue, isLoaded] as const
}

// Hook for authentication state
export function useAuth() {
  const [user, setUser] = useState<any>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isClient) return

    try {
      const userStr = safeLocalStorage.getItem('user')
      const tokenStr = safeLocalStorage.getItem('token')
      
      if (userStr) {
        setUser(JSON.parse(userStr))
      }
      if (tokenStr) {
        setToken(tokenStr)
      }
    } catch (error) {
      console.error('Error reading auth data:', error)
      safeLocalStorage.removeItem('user')
      safeLocalStorage.removeItem('token')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = (userData: any, tokenData: string) => {
    if (!isClient) return

    setUser(userData)
    setToken(tokenData)
    safeLocalStorage.setItem('user', JSON.stringify(userData))
    safeLocalStorage.setItem('token', tokenData)
  }

  const logout = () => {
    if (!isClient) return

    setUser(null)
    setToken(null)
    safeLocalStorage.removeItem('user')
    safeLocalStorage.removeItem('token')
  }

  return { user, token, isLoading, login, logout }
}
