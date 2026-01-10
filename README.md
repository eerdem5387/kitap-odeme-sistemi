## Sayfa Düzenleyici (MVP)

Yeni modül ile yönetici panelinden sayfalar oluşturabilir/düzenleyebilir ve bölüm (section) bazlı içerik yönetebilirsiniz.

### Kurulum

1) .env içine veritabanı bilgilerinizi ekleyin:

```
DATABASE_PROVIDER=postgresql
DATABASE_URL="postgresql://user:pass@localhost:5432/dbname?schema=public"
```

2) Prisma migrate ve seed:

```
npx prisma migrate dev
npm run seed
```

3) Geliştirme

```
npm run dev
```

### Kullanım

- Admin: /admin/pages → sayfaları listeleyin, "Yeni Sayfa" ile oluşturun.
- Düzenleme: /admin/pages/:id → başlık/slug/durum ve bölümleri (hero, rich_text) ekleyin/düzenleyin/sıralayın, Kaydet.
- Public: /home, /about gibi slug’a göre yayınlanır. Root / → /home’a yönlenir.

### Güvenlik (Admin)

`/admin` altı Basic Auth ile korunur. .env içine ekleyin:

```
ADMIN_USER=admin
ADMIN_PASS=strong-password
```

# E-Ticaret Web Uygulaması

Modern bir e-ticaret sitesi ve admin paneli ile kapsamlı bir online alışveriş deneyimi.

## 🚀 Özellikler

### Müşteri Tarafı
- **Modern UI/UX**: Tailwind CSS ile responsive tasarım
- **Ürün Kategorileri**: Hiyerarşik kategori sistemi
- **İki Ürün Tipi**: 
  - Normal ürünler (basit ürünler)
  - Varyasyonlu ürünler (renk, beden, malzeme vb.)
- **Gelişmiş Arama**: Ürün arama ve filtreleme
- **Sepet Yönetimi**: Ürün ekleme, çıkarma, miktar güncelleme
- **Kullanıcı Hesabı**: Kayıt, giriş, profil yönetimi
- **Adres Yönetimi**: Çoklu adres kaydetme
- **Sipariş Takibi**: Sipariş durumu ve geçmişi
- **Güvenli Ödeme**: Ziraat Bankası sanal pos entegrasyonu
- **Ürün Değerlendirmeleri**: Müşteri yorumları ve puanlama

### Admin Paneli
- **Dashboard**: Satış istatistikleri ve performans metrikleri
- **Ürün Yönetimi**: Ürün ekleme, düzenleme, silme
- **Kategori Yönetimi**: Kategori oluşturma ve düzenleme
- **Sipariş Yönetimi**: Sipariş durumu güncelleme
- **Müşteri Yönetimi**: Müşteri bilgileri ve sipariş geçmişi
- **Stok Yönetimi**: Ürün stok takibi
- **Raporlama**: Satış ve performans raporları

## 🛠️ Teknolojiler

### Frontend
- **Next.js 14**: React framework (App Router)
- **TypeScript**: Tip güvenliği
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Modern icon set
- **React Hook Form**: Form yönetimi
- **Zod**: Schema validation

### Backend
- **Next.js API Routes**: Serverless API endpoints
- **Prisma ORM**: Veritabanı ORM
- **PostgreSQL**: Ana veritabanı
- **JWT**: Authentication
- **bcryptjs**: Şifre hashleme

### Ödeme Sistemi
- **Ziraat Bankası Sanal POS**: Türkiye'de güvenli ödeme
- **3D Secure**: Güvenli ödeme doğrulama

## 📦 Kurulum

### Gereksinimler
- Node.js 18+ 
- PostgreSQL 12+
- npm veya yarn

### Adımlar

1. **Projeyi klonlayın**
```bash
git clone <repository-url>
cd e-commerce-web-app
```

2. **Bağımlılıkları yükleyin**
```bash
npm install
```

3. **Environment dosyasını oluşturun**
```bash
cp .env.example .env
```

4. **Environment değişkenlerini düzenleyin**
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/ecommerce_db"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Ziraat Bank Payment Gateway
ZIRAAT_MERCHANT_ID="your-merchant-id"
ZIRAAT_PASSWORD="your-password"

# App
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

5. **Veritabanını oluşturun**
```bash
npx prisma db push
```

6. **Seed verilerini yükleyin (opsiyonel)**
```bash
npx prisma db seed
```

7. **Geliştirme sunucusunu başlatın**
```bash
npm run dev
```

## 🗄️ Veritabanı Şeması

### Ana Modeller
- **User**: Kullanıcı bilgileri ve rolleri
- **Product**: Ürün bilgileri (normal ve varyasyonlu)
- **Category**: Hiyerarşik kategori sistemi
- **Order**: Sipariş bilgileri ve durumu
- **Payment**: Ödeme kayıtları
- **Review**: Ürün değerlendirmeleri

### Varyasyonlu Ürünler
- **ProductVariation**: Ürün varyasyonları
- **ProductAttribute**: Ürün özellikleri (renk, beden vb.)
- **ProductAttributeValue**: Özellik değerleri
- **ProductVariationAttribute**: Varyasyon-özellik ilişkisi

## 🔐 Güvenlik

- **JWT Authentication**: Güvenli token tabanlı kimlik doğrulama
- **Password Hashing**: bcrypt ile şifre hashleme
- **Input Validation**: Zod ile veri doğrulama
- **SQL Injection Protection**: Prisma ORM ile güvenli sorgular
- **HTTPS**: Production'da SSL/TLS şifreleme

## 💳 Ödeme Entegrasyonu

### Ziraat Bankası Sanal POS
- **3D Secure**: Güvenli ödeme doğrulama
- **Taksit Seçenekleri**: 1-12 taksit
- **Hash Doğrulama**: Güvenli işlem doğrulama
- **Hata Yönetimi**: Kapsamlı hata yakalama

### Ödeme Akışı
1. Kullanıcı ödeme bilgilerini girer
2. Ziraat API'sine istek gönderilir
3. 3D Secure doğrulaması yapılır
4. Başarılı ödeme veritabanına kaydedilir
5. Sipariş durumu güncellenir

## 🚀 Deployment

### Vercel (Önerilen)
```bash
npm run build
vercel --prod
```

### Docker
```bash
docker build -t ecommerce-app .
docker run -p 3000:3000 ecommerce-app
```

## 📱 Responsive Tasarım

- **Mobile First**: Mobil öncelikli tasarım
- **Tablet**: Tablet uyumlu layout
- **Desktop**: Tam ekran deneyimi
- **Touch Friendly**: Dokunmatik cihaz uyumlu

## 🔧 Geliştirme

### Kod Yapısı
```
src/
├── app/                 # Next.js App Router
│   ├── api/            # API endpoints
│   ├── admin/          # Admin paneli
│   └── globals.css     # Global stiller
├── components/         # React bileşenleri
│   ├── layout/         # Layout bileşenleri
│   ├── admin/          # Admin bileşenleri
│   └── ui/             # UI bileşenleri
├── lib/               # Utility fonksiyonları
└── types/             # TypeScript tipleri
```

### Scripts
```bash
npm run dev          # Geliştirme sunucusu
npm run build        # Production build
npm run start        # Production sunucusu
npm run lint         # ESLint kontrolü
npm run type-check   # TypeScript kontrolü
```

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 📞 İletişim

- **Email**: info@example.com
- **Website**: https://example.com
- **Telefon**: +90 (XXX) XXX XX XX

## 🙏 Teşekkürler

- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Prisma](https://prisma.io/) - Database ORM
- [Ziraat Bankası](https://www.ziraatbank.com.tr/) - Ödeme altyapısı
