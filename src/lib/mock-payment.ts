interface MockPaymentRequest {
  amount: number
  orderId: string
  orderNumber: string
  customerEmail: string
  customerName: string
  customerPhone: string
  successUrl: string
  failUrl: string
}

interface MockPaymentResponse {
  success: boolean
  redirectUrl?: string
  error?: string
  transactionId?: string
}

interface MockPaymentCallback {
  success: boolean
  transactionId?: string
  orderId?: string
  amount?: number
  error?: string
  responseCode?: string
  responseMessage?: string
}

class MockPaymentService {
  async createPaymentRequest(paymentData: MockPaymentRequest): Promise<MockPaymentResponse> {
    try {
      console.log('Mock payment request:', paymentData)

      // Simüle edilmiş gecikme
      await new Promise(resolve => setTimeout(resolve, 1000))

      // %90 başarı oranı ile test
      const isSuccess = Math.random() > 0.1

      if (isSuccess) {
        const transactionId = `MOCK_TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        // Mock ödeme sayfası URL'i
        const mockPaymentUrl = `${process.env.NEXTAUTH_URL}/mock-payment?orderId=${paymentData.orderId}&amount=${paymentData.amount}&transactionId=${transactionId}`

        return {
          success: true,
          redirectUrl: mockPaymentUrl,
          transactionId: transactionId
        }
      } else {
        return {
          success: false,
          error: 'Mock ödeme başlatılamadı (test hatası)'
        }
      }
    } catch (error) {
      console.error('Mock payment error:', error)
      return {
        success: false,
        error: 'Mock ödeme işlemi başarısız'
      }
    }
  }

  async processCallback(callbackData: any): Promise<MockPaymentCallback> {
    try {
      console.log('Mock callback data:', callbackData)

      // Simüle edilmiş gecikme
      await new Promise(resolve => setTimeout(resolve, 500))

      // Callback verilerine göre başarı durumunu belirle
      const isSuccess = callbackData.status === 'success' || Math.random() > 0.2

      if (isSuccess) {
        return {
          success: true,
          transactionId: callbackData.transactionId || `MOCK_TXN_${Date.now()}`,
          orderId: callbackData.orderId,
          amount: parseFloat(callbackData.amount),
          responseCode: '00',
          responseMessage: 'Mock ödeme başarılı'
        }
      } else {
        return {
          success: false,
          error: 'Mock ödeme başarısız (test hatası)',
          responseCode: '51',
          responseMessage: 'Yetersiz bakiye (test)'
        }
      }
    } catch (error) {
      console.error('Mock callback error:', error)
      return {
        success: false,
        error: 'Mock callback işlemi başarısız'
      }
    }
  }

  // Test ödeme oluştur
  async createTestPayment(orderId: string, amount: number): Promise<MockPaymentResponse> {
    const testData: MockPaymentRequest = {
      amount: amount,
      orderId: orderId,
      orderNumber: `MOCK-${orderId}`,
      customerEmail: 'test@example.com',
      customerName: 'Test Müşteri',
      customerPhone: '5551234567',
      successUrl: `${process.env.NEXTAUTH_URL}/payment/success`,
      failUrl: `${process.env.NEXTAUTH_URL}/payment/fail`
    }

    return this.createPaymentRequest(testData)
  }
}

export const mockPaymentService = new MockPaymentService()
