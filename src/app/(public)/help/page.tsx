import React from 'react';

export default function HelpPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Yardım Merkezi</h1>
        
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Sık Sorulan Sorular</h2>
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Siparişimi nasıl takip edebilirim?</h3>
                <p className="text-gray-600">Hesabınıza giriş yaparak "Siparişlerim" bölümünden sipariş durumunuzu takip edebilirsiniz.</p>
              </div>
              
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">İade işlemi nasıl yapılır?</h3>
                <p className="text-gray-600">Ürün tesliminden itibaren 14 gün içinde iade talebinde bulunabilirsiniz. Müşteri hizmetlerimizle iletişime geçin.</p>
              </div>
              
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Kargo ücreti ne kadar?</h3>
                <p className="text-gray-600">150 TL üzeri alışverişlerde kargo ücretsizdir. 150 TL altı siparişlerde 15 TL kargo ücreti alınır.</p>
              </div>
            </div>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">İletişim</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Müşteri Hizmetleri</h3>
                <p className="text-gray-600">Telefon: 0850 123 45 67</p>
                <p className="text-gray-600">E-posta: destek@ecommerce.com</p>
                <p className="text-gray-600">Çalışma Saatleri: 09:00 - 18:00</p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Teknik Destek</h3>
                <p className="text-gray-600">E-posta: teknik@ecommerce.com</p>
                <p className="text-gray-600">Canlı Destek: Sitede sağ alt köşede</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
