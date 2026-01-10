# Neon Launch Plan Optimizasyonları

## Sorun

Neon Launch Plan'ın **"Scale to Zero"** özelliği performans sorunlarına neden olabilir:
- Database 5 dakika inaktif kalırsa otomatik olarak kapanır
- Sonraki ilk istekte **cold start** olur (5-10 saniye gecikme)
- Bu özellikle admin dashboard ve ürün sayfalarında yavaşlık yaratır

## Çözümler

### 1. Pooled Connection Optimizasyonu

**Dosya:** `src/lib/prisma.ts`

- Neon database URL'i otomatik olarak **pooled connection**'a çevrilir
- `pgbouncer=true` parametresi ile transaction pooling aktif edilir
- Connection timeout'ları optimize edilir (10 saniye)

**Avantajlar:**
- Daha hızlı connection kurulumu
- Daha az connection overhead
- Scale to zero sorununu azaltır

### 2. Keep-Alive Mekanizması

**Dosya:** `src/lib/neon-keepalive.ts`

- Her 4 dakikada bir basit bir `SELECT 1` query çalıştırır
- Database'in aktif kalmasını sağlar
- Cold start'ı önler

**Nasıl Çalışır:**
- Production ortamında otomatik başlar
- Sadece Neon database kullanıldığında aktif olur
- Minimal resource kullanımı (sadece 4 dakikada bir basit query)

**Avantajlar:**
- Cold start sorununu tamamen önler
- İlk istek gecikmesi olmaz
- Kullanıcı deneyimi iyileşir

## Plan Karşılaştırması

### Launch Plan (Mevcut)
- ✅ Autoscale to 16 CU
- ⚠️ Scale to zero after 5 minutes (cold start sorunu)
- ✅ 100 GB public network transfer
- ✅ Instant Read Replicas

### Scale Plan (Önerilen - Gelecekte)
- ✅ Autoscale to 16 CU
- ✅ **No scale to zero** (sürekli aktif)
- ✅ 100 GB public network transfer
- ✅ Instant Read Replicas
- ✅ Daha yüksek connection limit

## Performans İyileştirmeleri

### Yapılan Optimizasyonlar

1. **Connection Pooling**
   - Pooled connection kullanımı
   - PgBouncer transaction pooling
   - Optimize edilmiş timeout'lar

2. **Keep-Alive**
   - Otomatik database aktivasyonu
   - Cold start önleme

3. **Query Optimizasyonu**
   - Index'ler eklendi (products, orders)
   - Select-only queries (gereksiz data çekilmiyor)
   - Promise.allSettled ile paralel query'ler

4. **API Optimizasyonu**
   - Dashboard için tek endpoint (çoklu query yerine)
   - Timeout mekanizması (8 saniye)
   - Error handling iyileştirildi

## Monitoring

### Keep-Alive Logları

Production'da keep-alive çalıştığında şu log'lar görünecek:
```
[Neon Keep-Alive] Started - Database will stay active
[Neon Keep-Alive] Database connection maintained
```

### Connection String Kontrolü

DATABASE_URL'iniz şu formatta olmalı:
```
postgresql://user:password@ep-xxx.pooler.neon.tech/db?pgbouncer=true&connect_timeout=10&pool_timeout=10
```

Eğer `pooler` yoksa, kod otomatik olarak ekleyecektir.

## Gelecek İyileştirmeler

1. **Plan Yükseltme**: Scale Plan'a geçiş (scale to zero olmaz)
2. **Prisma Accelerate**: Query caching ve connection pooling
3. **Read Replicas**: Read-heavy query'ler için
4. **Query Monitoring**: Yavaş query'leri tespit etme

## Sorun Giderme

### Hala Yavaşlık Varsa

1. **Connection String Kontrolü**
   ```bash
   echo $DATABASE_URL | grep pooler
   ```
   Eğer `pooler` yoksa, manuel olarak ekleyin.

2. **Keep-Alive Kontrolü**
   - Production log'larında `[Neon Keep-Alive]` mesajlarını kontrol edin
   - Eğer görünmüyorsa, `NODE_ENV=production` olduğundan emin olun

3. **Database Quota**
   - Neon dashboard'dan quota kullanımını kontrol edin
   - 100 GB limit'e yaklaşıyorsanız plan yükseltin

4. **Query Performance**
   - Vercel Analytics'ten slow query'leri kontrol edin
   - Database index'lerini gözden geçirin

## Sonuç

Bu optimizasyonlar ile:
- ✅ Cold start sorunu çözüldü
- ✅ Connection pooling optimize edildi
- ✅ Query performansı iyileştirildi
- ✅ Admin dashboard hızlandı
- ✅ Genel site performansı arttı

**Not:** Eğer hala performans sorunları yaşıyorsanız, Scale Plan'a geçiş yapmayı düşünün.

