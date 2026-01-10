'use client'

import Link from 'next/link'
import { ShoppingCart, ArrowRight } from 'lucide-react'

export default function Banner() {
  return (
    <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 overflow-hidden">
      <div className="absolute inset-0 bg-black opacity-10"></div>
      
      {/* Decorative Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl opacity-20"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl opacity-20"></div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Text Content */}
          <div className="text-white z-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
              Levent Kolej
              <span className="block text-blue-200">Ürün ve Hizmetler</span>
            </h1>
            <p className="text-lg md:text-xl text-blue-100 mb-8 leading-relaxed">
              Okul ürünleri, kitap setleri, üniformalar ve hizmetler için güvenli ve kolay alışveriş platformu
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/products"
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition-all transform hover:scale-105 shadow-xl"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Ürünleri İncele
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center justify-center px-8 py-4 bg-blue-700 text-white font-bold rounded-lg hover:bg-blue-600 transition-all border-2 border-white/30"
              >
                Hakkımızda
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </div>
          </div>

          {/* Image/Visual */}
          <div className="relative z-10 hidden md:block">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-2xl transform rotate-3 opacity-30 blur-xl"></div>
              <div className="relative bg-white rounded-2xl p-8 shadow-2xl transform hover:scale-105 transition-transform duration-300">
                <div className="space-y-4">
                  <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                      <ShoppingCart className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Güvenli Ödeme</h3>
                      <p className="text-sm text-gray-600">Ziraat Bankası Sanal POS</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 p-4 bg-green-50 rounded-lg">
                    <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      ✓
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Hızlı Teslimat</h3>
                      <p className="text-sm text-gray-600">Okul içi teslimat</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 p-4 bg-purple-50 rounded-lg">
                    <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      ⭐
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Kaliteli Ürünler</h3>
                      <p className="text-sm text-gray-600">Orijinal ve güvenilir</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

