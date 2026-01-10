import { NextRequest, NextResponse } from 'next/server'
import { mockPaymentService } from '@/lib/mock-payment'
import { prisma } from '@/lib/prisma'
import { emailService } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    console.log('=== MOCK CALLBACK API CALLED ===')

    const body = await request.json()
    console.log('Mock callback data:', body)

    const { orderId, amount, transactionId, status } = body

    if (!orderId || !amount || !transactionId || !status) {
      return NextResponse.json({
        error: 'Eksik callback verileri'
      }, { status: 400 })
    }

    // Mock callback'i işle
    const result = await mockPaymentService.processCallback({
      orderId,
      amount,
      transactionId,
      status
    })

    if (result.success && result.orderId) {
      // Siparişi güncelle
      const order = await prisma.order.update({
        where: { id: result.orderId },
        data: {
          paymentStatus: 'COMPLETED',
          status: 'CONFIRMED',
          notes: `Mock ödeme başarılı. Transaction ID: ${result.transactionId}`
        },
        include: {
          user: {
            select: { name: true, email: true }
          },
          items: {
            include: {
              product: true,
              variation: {
                include: {
                  attributes: {
                    include: {
                      attributeValue: {
                        include: {
                          attribute: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      })

      // Ödeme kaydı oluştur
        await prisma.payment.create({
          data: {
            orderId: result.orderId,
            amount: result.amount || 0,
            method: 'CREDIT_CARD',
            status: 'COMPLETED',
            transactionId: result.transactionId || '',
            gatewayResponse: JSON.stringify({
              responseCode: result.responseCode || '',
              responseMessage: result.responseMessage || ''
            })
          }
        })

      // E-posta bildirimleri gönder
      try {
        // Müşteriye ödeme onay e-postası
        await emailService.sendOrderStatusUpdate(order, order.user.email, 'CONFIRMED')
        
        // Admin'e ödeme bildirimi
        await emailService.sendOrderNotificationToAdmin(order)
      } catch (emailError) {
        console.error('E-posta gönderilirken hata:', emailError)
      }

      return NextResponse.json({
        success: true,
        message: 'Mock ödeme başarıyla işlendi'
      })
    } else {
      // Siparişi güncelle (başarısız)
      if (result.orderId) {
        await prisma.order.update({
          where: { id: result.orderId },
          data: {
            paymentStatus: 'FAILED',
            notes: `Mock ödeme başarısız. Hata: ${result.error}`
          }
        })

        // Başarısız ödeme kaydı oluştur
        await prisma.payment.create({
          data: {
            orderId: result.orderId,
            amount: result.amount || 0,
            method: 'CREDIT_CARD',
            status: 'FAILED',
            transactionId: result.transactionId || '',
            gatewayResponse: JSON.stringify({
              responseCode: result.responseCode || '',
              responseMessage: result.error || ''
            })
          }
        })
      }

      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Mock callback error:', error)
    
    return NextResponse.json({
      error: 'Mock callback işlemi başarısız'
    }, { status: 500 })
  }
}
