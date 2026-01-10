import React from 'react';

export default function ReturnsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">İade ve Değişim Politikası</h1>
        
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">İade Koşulları</h2>
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">14 Gün İade Hakkı</h3>
                <p className="text-gray-600">Siparişinizi aldıktan sonra 14 gün içinde iade talebinde bulunabilirsiniz.</p>
              </div>
              
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">İade Koşulları</h3>
                <ul className="text-gray-600 space-y-2">
                  <li>• Ürün orijinal ambalajında olmalıdır</li>
                  <li>• Ürün kullanılmamış olmalıdır</li>
                  <li>• Etiketler çıkarılmamış olmalıdır</li>
                  <li>• Ürün hasar görmemiş olmalıdır</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">İade Süreci</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">1</span>
                </div>
                <h3 className="font-semibold mb-2">İade Talebi</h3>
                <p className="text-gray-600">Hesabınızdan iade talebinde bulunun</p>
              </div>
              
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">2</span>
                </div>
                <h3 className="font-semibold mb-2">Kargo Etiketi</h3>
                <p className="text-gray-600">Onay sonrası kargo etiketi alın</p>
              </div>
              
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">3</span>
                </div>
                <h3 className="font-semibold mb-2">İade İşlemi</h3>
                <p className="text-gray-600">Ürünü kargoya verin ve iade işlemini tamamlayın</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Değişim Politikası</h2>
            <div className="border rounded-lg p-6">
              <h3 className="font-semibold mb-3">Ürün Değişimi</h3>
              <p className="text-gray-600 mb-4">
                Aynı ürünün farklı beden, renk veya modeli ile değişim yapabilirsiniz. 
                Değişim işlemi için ürünün iade koşullarını sağlaması gerekir.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                  <strong>Not:</strong> Değişim işlemi için stok durumu kontrol edilir. 
                  İstediğiniz ürün stokta yoksa iade işlemi yapılır.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">İade Kargo Ücreti</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-green-600">Ücretsiz İade</h3>
                <p className="text-gray-600">Ürün hatası veya yanlış ürün gönderimi durumunda kargo ücreti bizim tarafımızdan karşılanır.</p>
              </div>
              
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-orange-600">Müşteri Sorumluluğu</h3>
                <p className="text-gray-600">Müşteri kaynaklı iadelerde kargo ücreti müşteri tarafından karşılanır.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">İletişim</h2>
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-gray-600 mb-4">
                İade ve değişim konularında sorularınız için bizimle iletişime geçebilirsiniz:
              </p>
              <div className="space-y-2">
                <p><strong>E-posta:</strong> iade@example.com</p>
                <p><strong>Telefon:</strong> +90 XXX XXX XX XX</p>
                <p><strong>Çalışma Saatleri:</strong> Pazartesi - Cuma, 09:00 - 18:00</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
