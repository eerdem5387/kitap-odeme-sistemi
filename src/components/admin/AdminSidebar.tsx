'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  Package, 
  Users, 
  ShoppingCart, 
  BarChart3, 
  Settings,
  Tag,
  CreditCard,
  ExternalLink,
  Menu,
  X,
  LayoutDashboard,
  ChevronRight
} from 'lucide-react'

const menuItems = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard
  },
  {
    name: 'Ürünler',
    href: '/admin/products',
    icon: Package
  },
  {
    name: 'Kategoriler',
    href: '/admin/categories',
    icon: Tag
  },
  {
    name: 'Müşteriler',
    href: '/admin/customers',
    icon: Users
  },
  {
    name: 'Siparişler',
    href: '/admin/orders',
    icon: ShoppingCart
  },
  {
    name: 'Ödemeler',
    href: '/admin/payments',
    icon: CreditCard
  },
  {
    name: 'Raporlar',
    href: '/admin/reports',
    icon: BarChart3
  },
  {
    name: 'Ayarlar',
    href: '/admin/settings',
    icon: Settings
  }
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Mobile menu'yu kapat (sayfa değiştiğinde)
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Body scroll lock (mobile menu açıkken)
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      {/* Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-gray-100">
        <Link href="/admin" className="flex items-center gap-2 group">
          <div className="bg-blue-600 p-1.5 rounded-lg group-hover:bg-blue-700 transition-colors">
            <LayoutDashboard className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">Admin Panel</span>
        </Link>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                {item.name}
              </div>
              {isActive && <ChevronRight className="h-4 w-4 text-blue-600" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-100 space-y-2">
        <Link
          href="/"
          target="_blank"
          className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          Siteyi Görüntüle
        </Link>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-3 left-4 z-40 p-2 bg-white rounded-lg shadow-md border border-gray-200 text-gray-600"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed left-0 top-0 w-64 h-full border-r border-gray-200 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 w-72 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="absolute top-0 right-0 -mr-12 pt-4">
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
          >
            <X className="h-6 w-6 text-white" />
          </button>
        </div>
        <SidebarContent />
      </aside>
    </>
  )
}
