# Proje Analizi ve Teknik Dokümantasyon

Bu belge, `e-commerce-web-app` projesinin detaylı teknik analizini, mimari yapısını ve mevcut özellik setini içerir. Geliştirme süreçlerinde referans noktası olarak kullanılması amaçlanmıştır.

## 1. Proje Genel Bakış

**Proje Adı:** E-Commerce Web App
**Tür:** Full-Stack E-Ticaret Platformu
**Mimari:** Monolith (Next.js App Router)
**Dil:** TypeScript

Bu proje, modern web teknolojileri kullanılarak geliştirilmiş, hem son kullanıcı (Storefront) hem de yönetici (Admin Panel) arayüzlerini barındıran kapsamlı bir e-ticaret çözümüdür. Ziraat Bankası Sanal POS entegrasyonu, dinamik sayfa yönetimi ve hiyerarşik kategori yapısı gibi kurumsal ihtiyaçları karşılayacak özelliklere sahiptir.

## 2. Teknoloji Yığını (Tech Stack)

### Çekirdek
*   **Framework:** Next.js 15.3.5 (App Router, Turbopack)
*   **Dil:** TypeScript 5.x
*   **Runtime:** Node.js

### Veritabanı & ORM
*   **Veritabanı:** PostgreSQL
*   **ORM:** Prisma Client 6.12.0
*   **Migration:** Prisma Migrate

### Frontend & UI
*   **Styling:** Tailwind CSS 3.4
*   **Bileşenler:** Headless UI, Radix UI (tahmini), Lucide React (ikonlar)
*   **Form Yönetimi:** React Hook Form + Zod
*   **Bildirimler:** Custom Toast / Sonner (kod yapısından çıkarım)

### Backend & Servisler
*   **Auth:** Custom JWT Implementation (bcryptjs, jsonwebtoken)
*   **Ödeme:** Custom Ziraat Bankası Entegrasyonu (SHA-512 Hash)
*   **Mail:** Nodemailer
*   **Depolama:** Google Cloud Storage, Vercel Blob

## 3. Veritabanı Şeması Analizi

Veritabanı ilişkisel bir yapıda kurgulanmış olup, aşağıdaki ana modülleri kapsar:

### Kullanıcı ve Yetkilendirme
*   **User:** Kullanıcılar `ADMIN` ve `CUSTOMER` rollerine ayrılmıştır.
*   **Address:** Kullanıcıların birden fazla adresi olabilir (One-to-Many).

### Ürün Kataloğu (Gelişmiş Yapı)
*   **Category:** Hiyerarşik (Parent-Child) yapıdadır. Alt kategoriler desteklenir.
*   **Product:** Temel ürün bilgileri.
*   **ProductVariation:** Varyasyonlu ürünler (örn: Kırmızı M Beden) için alt tablo.
*   **ProductAttribute & Value:** Dinamik özellik tanımları (Renk, Beden vb.).

### Sipariş ve Ödeme
*   **Order:** Sipariş başlığı, durumu ve tutarları.
*   **OrderItem:** Sipariş satırları (Hangi ürün, kaç adet, o anki fiyat).
*   **Payment:** Ödeme kayıtları, işlem ID'leri ve gateway yanıtları.

### İçerik Yönetimi (CMS)
*   **Page & PageSection:** Admin panelinden yönetilebilir dinamik sayfa yapısı (Hero, Features vb. bloklar).
*   **Settings:** Uygulama ayarlarının (Ödeme anahtarları, site başlığı vb.) veritabanında tutulduğu Key-Value tablosu.

## 4. Mimari Yapı ve Klasör Düzeni

Proje `src/` klasörü altında modüler bir yapıda düzenlenmiştir:

*   `src/app/(public)`: Müşterilerin gördüğü sayfalar (Ürünler, Sepet, Ödeme).
*   `src/app/admin`: Sadece `ADMIN` rolüne sahip kullanıcıların erişebildiği yönetim paneli.
*   `src/app/api`: Backend API endpoint'leri (Next.js Route Handlers).
*   `src/lib`: İş mantığı katmanı (Business Logic Layer).
    *   `auth.ts`: JWT ve şifreleme işlemleri.
    *   `ziraat-payment.ts`: Banka entegrasyon mantığı.
    *   `prisma.ts`: Veritabanı bağlantı havuzu (Singleton).
*   `src/middleware.ts`: Güvenlik başlıkları (Security Headers) ve Rate Limiting mekanizması.

## 5. Kritik Özellik Analizi

### 5.1. Ödeme Sistemi (Ziraat Bankası)
Proje, `ZiraatPaymentService` sınıfı üzerinden 3D Secure destekli ödeme alır.
*   **Özellik:** Dinamik `storeKey` ve hash oluşturma.
*   **Ayarlar:** Ödeme ayarları `Settings` tablosundan dinamik olarak çekilir, kod içine gömülü değildir.
*   **Akış:** İstek oluşturma -> Bankaya Yönlendirme -> Callback İşleme -> Sipariş Güncelleme.

### 5.2. Güvenlik
*   **Middleware:** `X-Frame-Options`, `CSP` gibi güvenlik başlıkları otomatik eklenir.
*   **Rate Limiting:** In-memory bir rate limiter mevcuttur (`/api` istekleri için IP bazlı kısıtlama).
*   **Auth:** Token tabanlı (JWT) doğrulama.

### 5.3. Dinamik Sayfa Yönetimi
Basit bir CMS (İçerik Yönetim Sistemi) entegre edilmiştir. Admin panelinden "Hakkımızda", "İletişim" gibi sayfalar blok tabanlı olarak oluşturulabilir.

## 6. Tespitler ve Geliştirme Önerileri

Mevcut inceleme sonucunda aşağıdaki noktalar geliştirme potansiyeli taşımaktadır:

1.  **State Management:** Sepet yönetimi için muhtemelen Context API veya Zustand kullanılıyor. Global state yönetimi karmaşıklaşırsa Redux veya Zustand'ın optimize kullanımı incelenmeli.
2.  **Rate Limiting:** `src/middleware.ts` içerisindeki rate limiter "In-Memory" çalışıyor. Uygulama birden fazla instance (serverless function) üzerinde çalıştığında bu limitler tutarsız olabilir. **Redis (KV)** entegrasyonu önerilir.
3.  **Type Safety:** Prisma ile TypeScript entegrasyonu güçlü, ancak API yanıtlarında (DTO) Zod şemalarının kullanımı yaygınlaştırılmalı.
4.  **Resim Optimizasyonu:** `next/image` kullanılıyor ancak resim yükleme işlemleri için CDN entegrasyonu (Vercel Blob veya Cloudinary) performansı artırır.
5.  **Test:** Projede test dosyaları (Unit/Integration) eksik veya az görünüyor. Kritik ödeme ve sipariş akışları için test yazılması önerilir.

## 7. Sonuç

`e-commerce-web-app`, sağlam temeller üzerine kurulmuş, ölçeklenebilir bir altyapıya sahiptir. Veritabanı tasarımı, e-ticaretin karmaşık varyasyon ve kategori ihtiyaçlarını karşılayacak niteliktedir. Kod yapısı temiz ve modern Next.js pratiklerine uygundur.

