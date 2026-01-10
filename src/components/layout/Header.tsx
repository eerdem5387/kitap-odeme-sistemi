'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Menu, X, ShoppingCart, User, LogIn, LogOut, Package } from 'lucide-react'
import { safeLocalStorage, safeWindow } from '@/lib/browser-utils'
import { cartService } from '@/lib/cart-service'

interface HeaderProps {
  siteName?: string
}

export default function Header({ siteName = 'Levent Kolej Ürün Hizmeti' }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [cartItemCount, setCartItemCount] = useState(0)
  const [user, setUser] = useState<any>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  useEffect(() => {
    setIsClient(true)
    
    // Kullanıcı bilgisini yükle
    const loadUser = () => {
      const userStr = safeLocalStorage.getItem('user')
      if (userStr) {
        try {
          setUser(JSON.parse(userStr))
        } catch (error) {
          console.error('User parse error:', error)
          setUser(null)
        }
      } else {
        setUser(null)
      }
    }
    
    // Sepet sayısını güncelle
    const updateCartCount = () => {
      setCartItemCount(cartService.getItemCount())
    }

    if (typeof window !== 'undefined') {
        loadUser()
        updateCartCount()

        // Storage değişikliklerini dinle
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'cart') {
                updateCartCount()
            } else if (e.key === 'user' || e.key === 'token') {
                loadUser()
            }
        }

        window.addEventListener('storage', handleStorageChange)
        
        // Custom event dinle (aynı tab içinde)
        window.addEventListener('cartUpdated', updateCartCount)
        window.addEventListener('userUpdated', loadUser)

        return () => {
            window.removeEventListener('storage', handleStorageChange)
            window.removeEventListener('cartUpdated', updateCartCount)
            window.removeEventListener('userUpdated', loadUser)
        }
    }
  }, [])

  const handleLogout = () => {
    safeLocalStorage.removeItem('token')
    safeLocalStorage.removeItem('user')
    setUser(null)
    setUserMenuOpen(false)
    safeWindow.location.href = '/'
  }

  return (
    <>
    <header className="tg-header__style-three sticky top-0 z-50 bg-white shadow-sm">
      {/* Main Header */}
      <div id="sticky-default" className="tg-header__area bg-white">
        <div className="container custom-container max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="row">
            <div className="col-12">
              {/* Mobile Nav Toggler */}
              <div className="mobile-nav-toggler d-xl-none">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                  aria-label="Menüyü Aç"
                >
                  <Menu className="h-6 w-6" />
                </button>
              </div>

              {/* Main Navigation */}
              <div className="tgmenu__wrap">
                <nav className="tgmenu__nav flex items-center justify-between h-30">
                  {/* Logo */}
                  <div className="logo flex-shrink-0">
                    <Link href="/" className="main-logo block">
                      <img 
                        src="/uploads/levent-akademik-logo.png" 
                        alt={siteName}
                        className="h-12 sm:h-16 lg:h-20 w-auto max-w-[120px] sm:max-w-[140px] object-contain"
                      />
                    </Link>
                  </div>

                  {/* Desktop Navigation - Center */}
                  <div className="tgmenu__navbar-wrap tgmenu__main-menu flex-1 flex justify-center d-none d-xl-flex">
                    <ul className="navigation flex space-x-6">
                      <li><Link href="/products" className="text-gray-700 hover:text-gray-900">Ürünler</Link></li>
                      <li><Link href="/about" className="text-gray-700 hover:text-gray-900">Hakkımızda</Link></li>
                      <li><Link href="/contact" className="text-gray-700 hover:text-gray-900">İletişim</Link></li>
                    </ul>
                  </div>

                  {/* Action Buttons - Right side */}
                  <div className="tgmenu__action flex-shrink-0">
                    <ul className="flex items-center space-x-2 sm:space-x-4">
                      {/* Cart Icon */}
                      <li>
                        <Link 
                          href="/cart" 
                          className="relative p-2.5 sm:p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                          aria-label={`Sepetim ${cartItemCount > 0 ? `(${cartItemCount} ürün)` : ''}`}
                        >
                          <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
                          {cartItemCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                              {cartItemCount > 99 ? '99+' : cartItemCount}
                            </span>
                          )}
                        </Link>
                      </li>

                      {/* User Menu */}
                      {user ? (
                        <li className="relative">
                          <button
                            onClick={() => setUserMenuOpen(!userMenuOpen)}
                            className="relative p-2.5 sm:p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center touch-manipulation min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0"
                            aria-label="Kullanıcı Menüsü"
                          >
                            <User className="h-5 w-5 sm:h-6 sm:w-6" />
                            <span className="ml-2 text-sm font-medium hidden lg:inline">{user.name}</span>
                          </button>
                          
                          {/* Dropdown Menu */}
                          {userMenuOpen && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setUserMenuOpen(false)}
                              />
                              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                                <div className="px-4 py-3 border-b border-gray-200">
                                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                </div>
                                
                                <Link
                                  href="/profile"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                  <User className="h-4 w-4 mr-3" />
                                  Profilim
                                </Link>
                                
                                <Link
                                  href="/orders"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                  <Package className="h-4 w-4 mr-3" />
                                  Siparişlerim
                                </Link>

                                {/* Admin Panel butonu - sadece admin kullanıcılar için */}
                                {user?.role === 'ADMIN' && (
                                  <Link
                                    href="/admin"
                                    onClick={() => setUserMenuOpen(false)}
                                    className="flex items-center px-4 py-2 text-sm text-indigo-700 hover:bg-indigo-50 transition-colors"
                                  >
                                    <User className="h-4 w-4 mr-3" />
                                    Admin Paneli
                                  </Link>
                                )}
                                
                                <div className="border-t border-gray-200 my-1" />
                                
                                <button
                                  onClick={handleLogout}
                                  className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <LogOut className="h-4 w-4 mr-3" />
                                  Çıkış Yap
                                </button>
                              </div>
                            </>
                          )}
                        </li>
                      ) : (
                        <li>
                          <Link
                            href="/login"
                            className="flex items-center px-3 sm:px-4 py-2.5 sm:py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation min-h-[44px]"
                          >
                            <LogIn className="h-5 w-5 mr-1 sm:mr-2" />
                            <span className="hidden lg:inline">Giriş Yap</span>
                          </Link>
                        </li>
                      )}
                    </ul>
                  </div>
                </nav>
              </div>

              {/* Mobile Menu */}
              <div className={`tgmobile__menu ${mobileMenuOpen ? 'active' : ''}`}>
                <nav className="tgmobile__menu-box">
                  <div className="close-btn">
                    <button
                      onClick={() => setMobileMenuOpen(false)}
                      className="p-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  
                  <div className="nav-logo text-center mb-8">
                    <Link href="/" className="main-logo">
                      <img 
                        src="/uploads/levent-akademik-logo.png" 
                        alt={siteName}
                        className="h-25 w-auto mx-auto max-w-[120px] object-contain"
                      />
                    </Link>
                  </div>

                  <div className="tgmobile__search mb-6">
                    <form method="get" action="/products" className="relative">
                      <input 
                        type="text" 
                        name="search" 
                        className="w-full pl-4 pr-12 py-3 border border-gray-200 rounded-full focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors" 
                        placeholder="Kurs Ara..." 
                      />
                      <button type="submit" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        <Search className="h-5 w-5" />
                      </button>
                    </form>
                  </div>

                  <div className="tgmobile__menu-outer">
                    <ul className="navigation space-y-4">
                      <li><Link href="/products" onClick={() => setMobileMenuOpen(false)} className="block text-gray-700 hover:text-gray-900">Ürünler</Link></li>
                      <li><Link href="/about" onClick={() => setMobileMenuOpen(false)} className="block text-gray-700 hover:text-gray-900">Hakkımızda</Link></li>
                      <li><Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="block text-gray-700 hover:text-gray-900">İletişim</Link></li>
                    </ul>
                  </div>

                  <div className="tgmenu__action mt-8">
                    <ul className="space-y-4">
                      {/* Mobile Cart */}
                      <li>
                        <Link href="/cart" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <span className="flex items-center text-gray-700">
                            <ShoppingCart className="h-5 w-5 mr-3" />
                            Sepetim
                          </span>
                          {cartItemCount > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                              {cartItemCount}
                            </span>
                          )}
                        </Link>
                      </li>

                      {/* Mobile User Menu */}
                      {user ? (
                        <>
                          <li>
                            <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                              <User className="h-5 w-5 mr-3 text-gray-700" />
                              <div className="flex-1">
                                <p className="text-gray-900 font-medium">{user.name}</p>
                                <p className="text-xs text-gray-500">Profilim</p>
                              </div>
                            </Link>
                          </li>
                          <li>
                            <Link href="/orders" onClick={() => setMobileMenuOpen(false)} className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                              <Package className="h-5 w-5 mr-3 text-gray-700" />
                              <span className="text-gray-700">Siparişlerim</span>
                            </Link>
                          </li>
                          <li>
                            <button
                              onClick={() => {
                                handleLogout()
                                setMobileMenuOpen(false)
                              }}
                              className="w-full flex items-center p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-red-600"
                            >
                              <LogOut className="h-5 w-5 mr-3" />
                              Çıkış Yap
                            </button>
                          </li>
                        </>
                      ) : (
                        <li>
                          <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            <LogIn className="h-5 w-5 mr-2" />
                            Giriş Yap
                          </Link>
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="social-links mt-8 flex justify-center space-x-6">
                    <a 
                      href="https://instagram.com/rizelevent" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title="Instagram"
                    >
                      <i className="fab fa-instagram text-xl"></i>
                    </a>
                  </div>
                </nav>
              </div>
              
              <div className={`tgmobile__menu-backdrop ${mobileMenuOpen ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}></div>
            </div>
          </div>
        </div>
      </div>
    </header>

    {/* Mobile Bottom Navigation */}
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 lg:hidden safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        <Link
          href="/products"
          className="flex flex-col items-center justify-center flex-1 min-h-[44px] touch-manipulation active:bg-gray-50 rounded-lg transition-colors"
          aria-label="Ürünler"
        >
          <svg className="h-6 w-6 text-gray-600 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <span className="text-xs font-medium text-gray-600">Ürünler</span>
        </Link>

        <Link
          href="/cart"
          className="relative flex flex-col items-center justify-center flex-1 min-h-[44px] touch-manipulation active:bg-gray-50 rounded-lg transition-colors"
          aria-label={`Sepetim ${cartItemCount > 0 ? `(${cartItemCount} ürün)` : ''}`}
        >
          <ShoppingCart className="h-6 w-6 text-gray-600 mb-1" />
          {cartItemCount > 0 && (
            <span className="absolute top-0 right-1/4 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
              {cartItemCount > 99 ? '99+' : cartItemCount}
            </span>
          )}
          <span className="text-xs font-medium text-gray-600">Sepetim</span>
        </Link>

        {user ? (
          <Link
            href="/profile"
            className="flex flex-col items-center justify-center flex-1 min-h-[44px] touch-manipulation active:bg-gray-50 rounded-lg transition-colors"
            aria-label="Profilim"
          >
            <User className="h-6 w-6 text-gray-600 mb-1" />
            <span className="text-xs font-medium text-gray-600">Profilim</span>
          </Link>
        ) : (
          <Link
            href="/login"
            className="flex flex-col items-center justify-center flex-1 min-h-[44px] touch-manipulation active:bg-gray-50 rounded-lg transition-colors"
            aria-label="Giriş Yap"
          >
            <LogIn className="h-6 w-6 text-gray-600 mb-1" />
            <span className="text-xs font-medium text-gray-600">Giriş</span>
          </Link>
        )}

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex flex-col items-center justify-center flex-1 min-h-[44px] touch-manipulation active:bg-gray-50 rounded-lg transition-colors"
          aria-label="Menü"
        >
          <Menu className="h-6 w-6 text-gray-600 mb-1" />
          <span className="text-xs font-medium text-gray-600">Menü</span>
        </button>
      </div>
    </nav>
    </>
  )
}
