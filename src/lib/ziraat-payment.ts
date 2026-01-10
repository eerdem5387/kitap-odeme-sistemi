import crypto from 'crypto'
import { prisma } from './prisma'

interface ZiraatPaymentSettings {
  merchantId: string
  storeKey: string
  posUrl: string // API endpoint URL
  storeType: string
  testMode: boolean
}

interface PaymentRequest {
  amount: number
  orderId: string
  orderNumber?: string
  successUrl: string
  failUrl: string
  installments?: string // Taksit sayısı (boş ise tek çekim)
  customerEmail?: string
  customerName?: string
  customerPhone?: string
}

interface PaymentResponse {
  success: boolean
  redirectUrl?: string // Banka formunun post edileceği URL
  formParams?: Record<string, string> // Bankaya post edilecek parametreler
  transactionId?: string
  error?: string
}

class ZiraatPaymentService {
  private settings: ZiraatPaymentSettings | null = null

  /**
   * Veritabanından ayarları çeker ve servisi başlatır.
   */
  async initialize(): Promise<boolean> {
    try {
      // Veritabanında ayarlar 'payment.ziraatClientId' gibi saklanıyor.
      // 'payment' kategorisindeki tüm ayarları çekelim.
      const paymentSettings = await prisma.settings.findMany({
        where: {
          category: 'payment',
          key: {
            startsWith: 'payment.ziraat' // payment.ziraatClientId, payment.ziraatStoreKey vb.
          }
        }
      })

      if (paymentSettings.length === 0) {
        console.warn('Ziraat Bankası ayarları veritabanında bulunamadı')
        return false
      }

      const settings: any = {
        testMode: false,
        storeType: '3d_pay_hosting' // Varsayılan
      }

      // Key Mapping: DB Key -> Internal Settings Key
      paymentSettings.forEach(setting => {
        const dbKey = setting.key // Örn: payment.ziraatClientId
        
        if (dbKey === 'payment.ziraatClientId') settings.merchantId = setting.value
        if (dbKey === 'payment.ziraatStoreKey') settings.storeKey = setting.value
        // 3D Ödeme için kullanılacak URL, API URL DEĞİL!
        // Öncelik: ziraat3dUrl (est3Dgate). Eğer bu yoksa, eski konfig'e uyum için ziraatApiUrl'i fallback olarak kullanıyoruz.
        if (dbKey === 'payment.ziraat3dUrl') settings.posUrl = setting.value
        if (!settings.posUrl && dbKey === 'payment.ziraatApiUrl') settings.posUrl = setting.value
        if (dbKey === 'payment.ziraatStoreType') settings.storeType = setting.value
        if (dbKey === 'payment.ziraatTestMode') settings.testMode = setting.value === 'true'
        
        // Eski formata göre de kontrol (payment.ziraat.merchantId gibi)
        if (dbKey.split('.').length === 3) {
            const subKey = dbKey.split('.')[2]
            if (subKey === 'merchantId') settings.merchantId = setting.value
            if (subKey === 'storeKey') settings.storeKey = setting.value
            if (subKey === 'posUrl') settings.posUrl = setting.value
            if (subKey === 'storeType') settings.storeType = setting.value
            if (subKey === 'testMode') settings.testMode = setting.value === 'true'
        }
      })

      // Gerekli alan kontrolü
      if (!settings.merchantId || !settings.storeKey || !settings.posUrl) {
        console.warn('Ziraat Bankası kritik ayarları eksik:', {
            hasMerchantId: !!settings.merchantId,
            hasStoreKey: !!settings.storeKey,
            hasPosUrl: !!settings.posUrl
        })
        return false
      }

      this.settings = {
        merchantId: settings.merchantId,
        storeKey: settings.storeKey,
        posUrl: settings.posUrl,
        storeType: settings.storeType,
        testMode: settings.testMode
      }

      return true
    } catch (error) {
      console.error('Ziraat servisi başlatılamadı:', error)
      return false
    }
  }

  /**
   * Ziraat v3 (3D Pay Hosting) hash oluşturma algoritması.
   * 1. Parametre anahtarlarını case-insensitive sırala.
   * 2. Değerlerdeki | ve \ karakterlerini escape et.
   * 3. Değerleri | ile birleştir.
   * 4. Sona escape edilmiş storeKey ekle.
   * 5. SHA512 hash al ve Base64'e çevir.
   */
  private createHash(params: Record<string, string>): string {
    if (!this.settings) throw new Error('Servis başlatılmadı')

    // Hash ve encoding parametrelerini hariç tut
    const keys = Object.keys(params).filter(k => {
        const lk = k.toLowerCase()
        return lk !== "hash" && lk !== "encoding"
    }).sort((a, b) => {
        // Case-insensitive sıralama
        const aLower = a.toLowerCase()
        const bLower = b.toLowerCase()
        if (aLower !== bLower) return aLower.localeCompare(bLower, undefined, { numeric: true, sensitivity: "base" })
        return 0
    })

    // Değerleri escape et ve birleştir
    const escapedJoin = keys.map(k => {
        const v = String(params[k] ?? "")
        return v.replace(/\\/g, "\\\\").replace(/\|/g, "\\|")
    }).join("|") + "|" + this.settings.storeKey.replace(/\\/g, "\\\\").replace(/\|/g, "\\|")

    // SHA512 -> Base64
    const sha512hex = crypto.createHash("sha512").update(escapedJoin, "utf8").digest("hex")
    return Buffer.from(sha512hex, "hex").toString("base64")
  }

  /**
   * Ödeme isteği oluşturur ve bankaya gönderilecek form verilerini hazırlar.
   */
  async createPaymentRequest(data: PaymentRequest): Promise<PaymentResponse> {
    if (!this.settings) {
        const init = await this.initialize()
        if (!init) return { success: false, error: 'Ödeme sistemi yapılandırılamadı (Ayarlar eksik)' }
    }

    try {
        const rnd = String(Date.now())
        const amountStr = data.amount.toFixed(2) // 100.00 formatı
        
        // Temel parametreler
        const baseParams: Record<string, string> = {
            clientid: this.settings!.merchantId,
            storetype: this.settings!.storeType,
            hashAlgorithm: "ver3",
            oid: data.orderId,
            amount: amountStr,
            currency: "949", // TRY
            TranType: "Auth",
            rnd: rnd,
            okurl: data.successUrl,
            failUrl: data.failUrl,
            callbackUrl: data.successUrl, // Callback URL
            lang: "tr",
            encoding: "utf-8",
            Instalment: data.installments || ""
        }

        // Hash hesapla
        const hash = this.createHash(baseParams)
        
        // Final parametreler
        const finalParams = {
            ...baseParams,
            hash: hash, // Küçük harf hash parametresi (bazı entegrasyonlarda HASH olarak da istenebilir, burada her ikisi de denenebilir ama v3 genelde hash ister)
            HASH: hash  // Güvenlik için her ikisini de gönderiyoruz
        }

        // Banka URL'i
        const actionUrl = this.settings!.posUrl.startsWith("http") 
            ? this.settings!.posUrl 
            : `https://${this.settings!.posUrl}`

        return {
            success: true,
            redirectUrl: actionUrl, // Frontend bu URL'e POST yapacak
            formParams: finalParams
        }

    } catch (error) {
        console.error('Ödeme isteği hatası:', error)
        return { success: false, error: 'Ödeme isteği oluşturulurken hata oluştu' }
    }
  }

  /**
   * Bankadan dönen callback isteğini doğrular.
   */
  async verifyCallback(data: Record<string, any>): Promise<{ success: boolean; error?: string }> {
    if (!this.settings) {
        await this.initialize()
    }

    try {
        // Gelen verideki hash
        const incomingHash = (data["HASH"] || data["hash"] || "").toString()
        
        if (!incomingHash) {
            return { success: false, error: 'Hash bilgisi bulunamadı' }
        }

        // Hash doğrulama için veriyi hazırla (Gelen parametrelerle aynı algoritmayı çalıştır)
        const verifyParams: Record<string, string> = {}
        Object.keys(data).forEach(k => {
            verifyParams[k] = String(data[k])
        })

        const calculatedHash = this.createHash(verifyParams)

        if (calculatedHash !== incomingHash) {
            console.error('Hash uyuşmazlığı:', { incoming: incomingHash, calculated: calculatedHash })
            return { success: false, error: 'Güvenlik doğrulaması başarısız (Hash mismatch)' }
        }

        // İşlem sonucu kontrolü
        const mdStatus = data["mdStatus"] || data["MdStatus"]
        const response = data["Response"] || data["response"] || ""

        // mdStatus 1: Tam doğrulama, 2,3,4: Kart saklama vs. (Genelde 1 beklenir)
        // Response: Approved olmalı
        if (mdStatus === "1" && response.toLowerCase() === "approved") {
            return { success: true }
        }

        return { 
            success: false, 
            error: data["ErrMsg"] || data["errmsg"] || 'İşlem banka tarafından reddedildi' 
        }

    } catch (error) {
        console.error('Callback doğrulama hatası:', error)
        return { success: false, error: 'Doğrulama sırasında hata oluştu' }
    }
  }
}

export const ziraatPaymentService = new ZiraatPaymentService()
