/**
 * Neon Launch Plan "Scale to Zero" sorununu çözmek için keep-alive mekanizması
 * Database 5 dakika inaktif kalırsa cold start oluyor (5-10 saniye gecikme)
 * Bu script periyodik olarak basit bir query çalıştırarak database'i aktif tutar
 */

import { prisma } from './prisma'

let keepAliveInterval: NodeJS.Timeout | null = null
let isKeepAliveActive = false

/**
 * Neon database'i aktif tutmak için periyodik keep-alive query'si
 * Her 4 dakikada bir basit bir SELECT query çalıştırır
 * Bu sayede "scale to zero" tetiklenmez
 */
export function startNeonKeepAlive() {
  // Sadece production'da ve Neon kullanıyorsak çalıştır
  if (process.env.NODE_ENV !== 'production') {
    return
  }

  const databaseUrl = process.env.DATABASE_URL || ''
  if (!databaseUrl.includes('neon.tech') && !databaseUrl.includes('neon')) {
    return
  }

  // Zaten çalışıyorsa tekrar başlatma
  if (isKeepAliveActive) {
    return
  }

  isKeepAliveActive = true

  // Her 4 dakikada bir keep-alive query çalıştır
  // (5 dakika scale to zero olduğu için 4 dakika güvenli)
  keepAliveInterval = setInterval(async () => {
    try {
      // Basit ve hızlı bir query (sadece connection'ı aktif tutmak için)
      await prisma.$queryRaw`SELECT 1`
      console.log('[Neon Keep-Alive] Database connection maintained')
    } catch (error) {
      console.error('[Neon Keep-Alive] Error:', error)
      // Hata olsa bile devam et (sadece log)
    }
  }, 4 * 60 * 1000) // 4 dakika

  console.log('[Neon Keep-Alive] Started - Database will stay active')
}

/**
 * Keep-alive mekanizmasını durdur
 */
export function stopNeonKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval)
    keepAliveInterval = null
    isKeepAliveActive = false
    console.log('[Neon Keep-Alive] Stopped')
  }
}

// Server-side'da otomatik başlat (Next.js API routes için)
if (typeof window === 'undefined') {
  startNeonKeepAlive()
}

