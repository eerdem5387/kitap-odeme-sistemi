import { safeLocalStorage, safeWindow } from '@/lib/browser-utils'

export interface CartItem {
  id: string // Product ID
  variationId?: string // Optional Variation ID
  name: string
  price: number
  image?: string
  quantity: number
  stock: number
  slug: string
  variationOptions?: string // Renk: Kırmızı, Beden: XL gibi
}

export interface Cart {
  items: CartItem[]
}

const CART_STORAGE_KEY = 'cart'

class CartService {
  // Cookie yardımcı fonksiyonları (Manuel implementasyon)
  private setCookie(name: string, value: string, days: number) {
    if (typeof document === 'undefined') return
    let expires = ""
    if (days) {
      const date = new Date()
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000))
      expires = "; expires=" + date.toUTCString()
    }
    document.cookie = name + "=" + (encodeURIComponent(value) || "") + expires + "; path=/"
  }

  private getCookie(name: string) {
    if (typeof document === 'undefined') return null
    const nameEQ = name + "="
    const ca = document.cookie.split(';')
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i]
      while (c.charAt(0) == ' ') c = c.substring(1, c.length)
      if (c.indexOf(nameEQ) == 0) return decodeURIComponent(c.substring(nameEQ.length, c.length))
    }
    return null
  }

  getCart(): Cart {
    try {
      // Önce localStorage dene
      let cartData = safeLocalStorage.getItem(CART_STORAGE_KEY)
      
      // Yoksa Cookie dene (Fallback)
      if (!cartData) {
        cartData = this.getCookie(CART_STORAGE_KEY)
      }

      if (cartData) {
        const parsed = JSON.parse(cartData)
        // Format migration (eski array formatını yeni obje formatına çevir)
        if (Array.isArray(parsed)) {
          return { items: parsed }
        }
        // Geçerli yapı kontrolü
        if (!parsed.items) {
            return { items: [] }
        }
        return parsed
      }
    } catch (error) {
      console.error('Cart parsing error:', error)
    }
    return { items: [] }
  }

  saveCart(cart: Cart) {
    try {
      const cartString = JSON.stringify(cart)
      
      // LocalStorage kaydet
      safeLocalStorage.setItem(CART_STORAGE_KEY, cartString)
      
      // Cookie kaydet (Yedek olarak, 7 gün)
      this.setCookie(CART_STORAGE_KEY, cartString, 7)

      // Event fırlat
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('cartUpdated'))
        // Storage event'ini manuel tetikle (bazı frameworkler için)
        window.dispatchEvent(new StorageEvent('storage', {
            key: CART_STORAGE_KEY,
            newValue: cartString
        }))
      }
    } catch (error) {
      console.error('Cart saving error:', error)
    }
  }

  addItem(product: any, quantity: number = 1, variation?: any) {
    const cart = this.getCart()
    
    const uniqueId = variation ? `${product.id}-${variation.id}` : product.id
    
    const existingItemIndex = cart.items.findIndex(item => {
        const itemId = item.variationId ? `${item.id}-${item.variationId}` : item.id
        return itemId === uniqueId
    })

    if (existingItemIndex > -1) {
      // Update existing item
      const newQuantity = cart.items[existingItemIndex].quantity + quantity
      // Stok kontrolü (Basit)
      const maxStock = variation ? variation.stock : product.stock
      if (newQuantity <= maxStock) {
          cart.items[existingItemIndex].quantity = newQuantity
      } else {
          cart.items[existingItemIndex].quantity = maxStock
      }
    } else {
      // Add new item
      const cartItem: CartItem = {
        id: product.id,
        variationId: variation?.id,
        name: product.name,
        slug: product.slug,
        price: variation ? Number(variation.price) : Number(product.price),
        image: (variation?.images && variation.images[0]) || (product.images && product.images[0]) || '',
        quantity: quantity,
        stock: variation ? variation.stock : product.stock,
        variationOptions: variation ? this.formatVariationOptions(variation) : undefined
      }
      cart.items.push(cartItem)
    }

    this.saveCart(cart)
  }

  removeItem(itemId: string, variationId?: string) {
    const cart = this.getCart()
    cart.items = cart.items.filter(item => {
        if (variationId) {
            return !(item.id === itemId && item.variationId === variationId)
        }
        return item.id !== itemId
    })
    this.saveCart(cart)
  }

  updateQuantity(itemId: string, quantity: number, variationId?: string) {
    const cart = this.getCart()
    const itemIndex = cart.items.findIndex(item => {
        if (variationId) {
            return item.id === itemId && item.variationId === variationId
        }
        return item.id === itemId
    })

    if (itemIndex > -1) {
      if (quantity > 0) {
        // Stok kontrolü
        if (quantity <= cart.items[itemIndex].stock) {
            cart.items[itemIndex].quantity = quantity
        }
      } else {
        // Remove if quantity is 0 or less
        cart.items.splice(itemIndex, 1)
      }
      this.saveCart(cart)
    }
  }

  clearCart() {
    this.saveCart({ items: [] })
  }

  getItemCount(): number {
    const cart = this.getCart()
    return cart.items.reduce((sum, item) => sum + item.quantity, 0)
  }

  getTotalPrice(): number {
    const cart = this.getCart()
    return cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }

  private formatVariationOptions(variation: any): string {
    if (!variation.attributes) return ''
    return variation.attributes.map((attr: any) => 
      `${attr.attributeValue.attribute?.name || ''}: ${attr.attributeValue.value}`
    ).join(', ')
  }
}

export const cartService = new CartService()
