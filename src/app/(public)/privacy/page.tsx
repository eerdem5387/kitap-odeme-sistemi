import React from 'react';

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Gizlilik Politikası</h1>
        
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Kişisel Verilerin Korunması</h2>
            <p className="text-gray-600 mb-4">
              Bu gizlilik politikası, web sitemizi ziyaret ettiğinizde veya hizmetlerimizi kullandığınızda 
              toplanan kişisel bilgilerinizin nasıl kullanıldığını ve korunduğunu açıklar.
            </p>
            <p className="text-gray-600">
              Kişisel verilerinizin güvenliği bizim için çok önemlidir ve bu politikayı 
              uygulayarak verilerinizi korumaya kararlıyız.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Topladığımız Bilgiler</h2>
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Kişisel Bilgiler</h3>
                <ul className="text-gray-600 space-y-1">
                  <li>• Ad ve soyad</li>
                  <li>• E-posta adresi</li>
                  <li>• Telefon numarası</li>
                  <li>• Adres bilgileri</li>
                  <li>• Doğum tarihi</li>
                </ul>
              </div>
              
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Teknik Bilgiler</h3>
                <ul className="text-gray-600 space-y-1">
                  <li>• IP adresi</li>
                  <li>• Tarayıcı bilgileri</li>
                  <li>• Cihaz bilgileri</li>
                  <li>• Çerezler</li>
                  <li>• Kullanım istatistikleri</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Bilgilerin Kullanım Amacı</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Hizmet Sağlama</h3>
                <ul className="text-gray-600 space-y-1 text-sm">
                  <li>• Sipariş işleme</li>
                  <li>• Müşteri hizmetleri</li>
                  <li>• Hesap yönetimi</li>
                  <li>• Ödeme işlemleri</li>
                </ul>
              </div>
              
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">İyileştirme</h3>
                <ul className="text-gray-600 space-y-1 text-sm">
                  <li>• Hizmet kalitesi</li>
                  <li>• Kullanıcı deneyimi</li>
                  <li>• Güvenlik önlemleri</li>
                  <li>• Analiz ve raporlama</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Bilgi Paylaşımı</h2>
            <div className="border rounded-lg p-6">
              <p className="text-gray-600 mb-4">
                Kişisel bilgilerinizi üçüncü taraflarla paylaşmıyoruz, ancak aşağıdaki durumlarda 
                paylaşım gerekebilir:
              </p>
              <ul className="text-gray-600 space-y-2">
                <li>• Yasal zorunluluk durumunda</li>
                <li>• Hizmet sağlayıcılarımızla (kargo, ödeme vb.)</li>
                <li>• Açık rızanız olduğunda</li>
                <li>• Güvenlik tehdidi durumunda</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Çerezler (Cookies)</h2>
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Çerez Türleri</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-blue-600">Gerekli Çerezler</h4>
                    <p className="text-sm text-gray-600">Sitenin temel işlevleri için gerekli</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-green-600">Analitik Çerezler</h4>
                    <p className="text-sm text-gray-600">Kullanım istatistikleri için</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-orange-600">Fonksiyonel Çerezler</h4>
                    <p className="text-sm text-gray-600">Kullanıcı tercihleri için</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-red-600">Pazarlama Çerezleri</h4>
                    <p className="text-sm text-gray-600">Reklam ve pazarlama için</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Veri Güvenliği</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔒</span>
                </div>
                <h3 className="font-semibold mb-2">Şifreleme</h3>
                <p className="text-gray-600 text-sm">SSL/TLS şifreleme ile veri koruması</p>
              </div>
              
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🛡️</span>
                </div>
                <h3 className="font-semibold mb-2">Güvenlik Önlemleri</h3>
                <p className="text-gray-600 text-sm">Güvenlik duvarları ve erişim kontrolü</p>
              </div>
              
              <div className="text-center">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="font-semibold mb-2">Düzenli Denetim</h3>
                <p className="text-gray-600 text-sm">Güvenlik denetimleri ve güncellemeler</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Haklarınız</h2>
            <div className="border rounded-lg p-6">
              <p className="text-gray-600 mb-4">
                Kişisel verilerinizle ilgili aşağıdaki haklara sahipsiniz:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <ul className="text-gray-600 space-y-2">
                  <li>• Bilgi alma hakkı</li>
                  <li>• Erişim hakkı</li>
                  <li>• Düzeltme hakkı</li>
                  <li>• Silme hakkı</li>
                </ul>
                <ul className="text-gray-600 space-y-2">
                  <li>• İşlemeyi sınırlama hakkı</li>
                  <li>• Veri taşınabilirliği hakkı</li>
                  <li>• İtiraz hakkı</li>
                  <li>• Şikayet hakkı</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">İletişim</h2>
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-gray-600 mb-4">
                Gizlilik politikamızla ilgili sorularınız için bizimle iletişime geçebilirsiniz:
              </p>
              <div className="space-y-2">
                <p><strong>E-posta:</strong> gizlilik@example.com</p>
                <p><strong>Telefon:</strong> +90 XXX XXX XX XX</p>
                <p><strong>Adres:</strong> Örnek Mahallesi, Örnek Sokak No:1, İstanbul</p>
                <p><strong>Çalışma Saatleri:</strong> Pazartesi - Cuma, 09:00 - 18:00</p>
              </div>
            </div>
          </section>

          <section>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                <strong>Son Güncelleme:</strong> Bu gizlilik politikası 1 Ocak 2024 tarihinde güncellenmiştir. 
                Önemli değişiklikler olduğunda sizi bilgilendireceğiz.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
