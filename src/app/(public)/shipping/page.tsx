import React from 'react';

export default function ShippingPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Kargo ve Teslimat</h1>
        
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Kargo Seçenekleri</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="border rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-3">Standart Kargo</h3>
                <p className="text-gray-600 mb-3">3-5 iş günü içinde teslimat</p>
                <p className="text-2xl font-bold text-blue-600">15 TL</p>
                <p className="text-sm text-gray-500 mt-2">150 TL altı siparişler için</p>
              </div>
              
              <div className="border rounded-lg p-6 bg-blue-50">
                <h3 className="text-xl font-semibold mb-3">Ücretsiz Kargo</h3>
                <p className="text-gray-600 mb-3">3-5 iş günü içinde teslimat</p>
                <p className="text-2xl font-bold text-green-600">ÜCRETSİZ</p>
                <p className="text-sm text-gray-500 mt-2">150 TL üzeri siparişler için</p>
              </div>
            </div>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">Teslimat Bölgeleri</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">İstanbul</h3>
                <p className="text-gray-600">1-2 iş günü</p>
              </div>
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Ankara, İzmir</h3>
                <p className="text-gray-600">2-3 iş günü</p>
              </div>
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Diğer Şehirler</h3>
                <p className="text-gray-600">3-5 iş günü</p>
              </div>
            </div>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">Kargo Takibi</h2>
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-gray-600 mb-4">
                Siparişiniz kargoya verildikten sonra size SMS ve e-posta ile kargo takip numarası gönderilir. 
                Bu numara ile kargo firmasının web sitesinden siparişinizi takip edebilirsiniz.
              </p>
              <div className="space-y-2">
                <p className="text-sm text-gray-500">• Kargo firması: Yurtiçi Kargo</p>
                <p className="text-sm text-gray-500">• Takip: www.yurticikargo.com</p>
                <p className="text-sm text-gray-500">• Müşteri hizmetleri: 0850 123 45 67</p>
              </div>
            </div>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">Teslimat Koşulları</h2>
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold mb-2">Teslimat Saatleri</h3>
                <p className="text-gray-600">Pazartesi - Cumartesi: 09:00 - 18:00</p>
              </div>
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-semibold mb-2">Teslimat Adresi</h3>
                <p className="text-gray-600">Sipariş verirken belirttiğiniz adrese teslimat yapılır.</p>
              </div>
              <div className="border-l-4 border-orange-500 pl-4">
                <h3 className="font-semibold mb-2">İmza Gerekliliği</h3>
                <p className="text-gray-600">Teslimat sırasında alıcının imzası gereklidir.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
