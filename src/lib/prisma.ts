import { PrismaClient } from '@prisma/client'
import { startNeonKeepAlive } from './neon-keepalive'

let withAccelerate: any = null
try {
    // Optional: only if dependency exists
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    withAccelerate = require('@prisma/extension-accelerate').withAccelerate
} catch { }

declare global {
    // eslint-disable-next-line no-var
    var prisma: PrismaClient | undefined
}

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

// KALICI ÇÖZÜM: Prisma 6.x stable client with error handling
if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL environment variable is not set. Using placeholder URL.')
}

// Optimize connection string for Neon pooled connections
const databaseUrl = process.env.DATABASE_URL || 'postgresql://placeholder:placeholder@localhost:5432/placeholder'

// Neon Launch Plan optimizasyonları:
// 1. Pooled connection kullan (scale to zero sorununu azaltır)
// 2. Connection limit ve timeout ayarla
// 3. PgBouncer mode (transaction pooling) kullan
let optimizedUrl = databaseUrl

// Neon pooled connection kontrolü ve optimizasyonu
if (databaseUrl.includes('neon.tech') || databaseUrl.includes('neon')) {
  // Pooled connection URL'ine çevir (eğer değilse)
  if (!databaseUrl.includes('pooler')) {
    // Direct connection'ı pooled'a çevir
    optimizedUrl = databaseUrl.replace(/\.neon\.tech/, '.pooler.neon.tech')
  }
  
  // Connection parametrelerini ekle/optimize et
  const urlParams = new URLSearchParams()
  
  // Neon Launch Plan için optimal ayarlar
  urlParams.set('pgbouncer', 'true') // Transaction pooling
  urlParams.set('connect_timeout', '10') // Connection timeout
  urlParams.set('pool_timeout', '10') // Pool timeout
  
  // URL'e parametreleri ekle
  if (optimizedUrl.includes('?')) {
    optimizedUrl = `${optimizedUrl}&${urlParams.toString()}`
  } else {
    optimizedUrl = `${optimizedUrl}?${urlParams.toString()}`
  }
} else if (databaseUrl.includes('pooler') && !databaseUrl.includes('connection_limit')) {
  // Diğer pooler'lar için
  optimizedUrl = `${databaseUrl}${databaseUrl.includes('?') ? '&' : '?'}connection_limit=1&pool_timeout=10`
}

const baseClient = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
        db: {
            url: optimizedUrl
        }
    },
    errorFormat: 'pretty'
})

const client = withAccelerate
    ? (baseClient as any).$extends(withAccelerate())
    : baseClient

// CRITICAL FIX: Always reuse global instance in production to avoid cold starts
export const prisma = globalForPrisma.prisma ?? (client as PrismaClient)

// Always cache in global to prevent re-initialization
if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = prisma as any
    
    // Neon Launch Plan için keep-alive başlat (cold start'ı önlemek için)
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
        startNeonKeepAlive()
    }
} 