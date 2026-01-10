# Hata Yönetimi Dokümantasyonu

Bu dokümantasyon, e-ticaret uygulamasındaki hata yönetimi sistemini açıklar.

## 🔧 Hata Yönetimi Sistemi

### 1. Global Error Handler (`src/lib/error-handler.ts`)

Merkezi hata yönetimi sistemi aşağıdaki özellikleri sağlar:

#### Hata Sınıfları:
- `AppError`: Temel hata sınıfı
- `ValidationError`: 400 Bad Request hataları
- `NotFoundError`: 404 Not Found hataları
- `UnauthorizedError`: 401 Unauthorized hataları
- `ForbiddenError`: 403 Forbidden hataları
- `ConflictError`: 409 Conflict hataları
- `RateLimitError`: 429 Too Many Requests hataları
- `DatabaseError`: 500 Internal Server Error hataları

#### Kullanım:
```typescript
import { handleApiError, NotFoundError, ValidationError } from '@/lib/error-handler'

// Hata fırlatma
throw new NotFoundError('Ürün bulunamadı')
throw new ValidationError('Geçersiz veri formatı')

// Hata yakalama
try {
  // API logic
} catch (error) {
  return handleApiError(error)
}
```

### 2. Middleware (`src/middleware.ts`)

#### Güvenlik Headers:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: origin-when-cross-origin
- Strict-Transport-Security
- Content-Security-Policy

#### Rate Limiting:
- 100 istek / 15 dakika
- IP bazlı takip
- 429 status code ile rate limit aşımı

#### Admin Route Protection:
- Basic Authentication
- Environment variables ile yapılandırma

### 3. API Endpoint Hata Yönetimi

#### 400 Bad Request Hataları:
```typescript
// Geçersiz veri formatı
throw new ValidationError('Geçersiz veri formatı', validationDetails)

// Eksik gerekli alanlar
throw new ValidationError('Ürün ID gerekli')

// Stok yetersizliği
throw new ValidationError('Yeterli stok bulunmuyor')
```

#### 401 Unauthorized Hataları:
```typescript
// Token eksik
throw new UnauthorizedError('Yetkilendirme token\'ı gerekli')

// Geçersiz token
throw new UnauthorizedError('Geçersiz token')

// Kullanıcı bulunamadı
throw new UnauthorizedError('Geçersiz email veya şifre')
```

#### 403 Forbidden Hataları:
```typescript
// Admin yetkisi gerekli
throw new ForbiddenError('Admin yetkisi gerekli')

// Yetki yetersizliği
throw new ForbiddenError('Bu işlem için yetkiniz yok')
```

#### 404 Not Found Hataları:
```typescript
// Ürün bulunamadı
throw new NotFoundError('Ürün bulunamadı')

// Kullanıcı bulunamadı
throw new NotFoundError('Kullanıcı bulunamadı')

// Sipariş bulunamadı
throw new NotFoundError('Sipariş bulunamadı')
```

#### 409 Conflict Hataları:
```typescript
// Ürün siparişlerde kullanılıyor
throw new ConflictError('Bu ürün siparişlerde kullanıldığı için silinemez')

// Duplicate entry
throw new ConflictError('Bu kayıt zaten mevcut')
```

#### 500 Internal Server Error Hataları:
```typescript
// Veritabanı hatası
throw new DatabaseError('Veritabanı hatası')

// Genel sunucu hatası
throw new AppError('Sunucu hatası', 500)
```

### 4. Prisma Hata Yönetimi

#### Prisma Error Codes:
- `P2002`: Duplicate entry (409)
- `P2025`: Record not found (404)
- `P2003`: Invalid reference (400)
- `P2014`: Relation violation (400)

#### Kullanım:
```typescript
try {
  await prisma.product.create(data)
} catch (error) {
  if (error.code === 'P2002') {
    throw new ConflictError('Bu ürün zaten mevcut')
  }
  throw new DatabaseError('Veritabanı hatası')
}
```

### 5. Frontend Error Pages

#### Global Error Page (`src/app/error.tsx`):
- Kullanıcı dostu hata mesajları
- Development mode'da detaylı hata bilgisi
- Retry ve ana sayfaya dönüş butonları

#### Not Found Page (`src/app/not-found.tsx`):
- 404 hata sayfası
- Ana sayfaya ve ürünlere yönlendirme
- İletişim linki

### 6. Test Sistemi

#### API Test Utility (`src/lib/api-test.ts`):
- Otomatik hata senaryoları testi
- Rate limiting testi
- Başarılı senaryolar testi

#### Test Senaryoları:
```typescript
// 400 Bad Request tests
- Invalid product ID format
- Invalid cart item data
- Invalid login data

// 401 Unauthorized tests
- Missing authorization header
- Invalid token

// 404 Not Found tests
- Non-existent product
- Non-existent order

// 403 Forbidden tests
- Admin access without admin role
```

### 7. Hata Loglama

#### Console Logging:
```typescript
console.error('API Error:', error)
console.error('Error details:', {
  name: error.name,
  message: error.message,
  stack: error.stack
})
```

#### Production Logging:
- Error tracking service entegrasyonu
- Structured logging
- Error metrics

### 8. Best Practices

#### 1. Tutarlı Hata Mesajları:
- Türkçe hata mesajları
- Kullanıcı dostu açıklamalar
- Teknik detayları gizleme

#### 2. Güvenlik:
- Hassas bilgi sızıntısını önleme
- SQL injection koruması
- XSS koruması

#### 3. Performance:
- Rate limiting
- Request validation
- Database query optimization

#### 4. Monitoring:
- Error tracking
- Performance monitoring
- Uptime monitoring

### 9. Environment Variables

```env
# Admin Authentication
ADMIN_USER=admin
ADMIN_PASS=strong-password

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000
```

### 10. Deployment Considerations

#### Production Settings:
- Environment variables yapılandırması
- Error tracking service entegrasyonu
- Log aggregation
- Monitoring alerts

#### Security Headers:
- HTTPS enforcement
- CSP policy
- HSTS headers
- X-Frame-Options

Bu hata yönetimi sistemi, uygulamanın güvenli, kararlı ve kullanıcı dostu olmasını sağlar.
