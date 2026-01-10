// Browser utilities with SSR safety
// This file provides safe access to browser APIs with SSR fallbacks

export const isClient = typeof window !== 'undefined'

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (!isClient) return null
    try {
      return localStorage.getItem(key)
    } catch (error) {
      console.error('localStorage.getItem error:', error)
      return null
    }
  },
  setItem: (key: string, value: string): void => {
    if (!isClient) return
    try {
      localStorage.setItem(key, value)
    } catch (error) {
      console.error('localStorage.setItem error:', error)
    }
  },
  removeItem: (key: string): void => {
    if (!isClient) return
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('localStorage.removeItem error:', error)
    }
  },
  clear: (): void => {
    if (!isClient) return
    try {
      localStorage.clear()
    } catch (error) {
      console.error('localStorage.clear error:', error)
    }
  }
}

export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    if (!isClient) return null
    try {
      return sessionStorage.getItem(key)
    } catch (error) {
      console.error('sessionStorage.getItem error:', error)
      return null
    }
  },
  setItem: (key: string, value: string): void => {
    if (!isClient) return
    try {
      sessionStorage.setItem(key, value)
    } catch (error) {
      console.error('sessionStorage.setItem error:', error)
    }
  },
  removeItem: (key: string): void => {
    if (!isClient) return
    try {
      sessionStorage.removeItem(key)
    } catch (error) {
      console.error('sessionStorage.removeItem error:', error)
    }
  },
  clear: (): void => {
    if (!isClient) return
    try {
      sessionStorage.clear()
    } catch (error) {
      console.error('sessionStorage.clear error:', error)
    }
  }
}

export const safeWindow = {
  location: {
    href: isClient ? window.location.href : '',
    assign: (url: string) => {
      if (!isClient) return
      window.location.assign(url)
    },
    replace: (url: string) => {
      if (!isClient) return
      window.location.replace(url)
    }
  },
  addEventListener: (event: string, handler: EventListener) => {
    if (!isClient) return
    window.addEventListener(event, handler)
  },
  removeEventListener: (event: string, handler: EventListener) => {
    if (!isClient) return
    window.removeEventListener(event, handler)
  },
  dispatchEvent: (event: Event) => {
    if (!isClient) return
    window.dispatchEvent(event)
  }
}

export const safeDocument = {
  addEventListener: (event: string, handler: EventListener) => {
    if (!isClient) return
    document.addEventListener(event, handler)
  },
  removeEventListener: (event: string, handler: EventListener) => {
    if (!isClient) return
    document.removeEventListener(event, handler)
  }
}
