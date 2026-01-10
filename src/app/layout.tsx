import type { Metadata } from 'next'
import { Lexend_Deca } from 'next/font/google'
import './globals.css'
import HeaderWrapper from '@/components/layout/HeaderWrapper'
import Footer from '@/components/layout/Footer'
import { validateEnvironment } from '@/lib/env-check'

// Validate environment on startup
validateEnvironment()

const lexendDeca = Lexend_Deca({ 
  subsets: ['latin'],
  variable: '--font-lexend-deca'
})

export const metadata: Metadata = {
  title: {
    default: 'Levent Kolej Ürün Hizmeti',
    template: '%s | Levent Kolej Ürün Hizmeti'
  },
  description: 'Modern ve güvenilir e-ticaret deneyimi. Kaliteli ürünler, hızlı teslimat ve müşteri memnuniyeti garantisi.',
  keywords: ['e-ticaret', 'online alışveriş', 'elektronik', 'giyim', 'ev', 'bahçe', 'spor'],
  authors: [{ name: 'Levent Kolej Ürün Hizmeti' }],
  creator: 'Levent Kolej Ürün Hizmeti',
  publisher: 'Levent Kolej Ürün Hizmeti',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: process.env.NEXT_PUBLIC_BASE_URL ? new URL(process.env.NEXT_PUBLIC_BASE_URL) : undefined,
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
    shortcut: '/icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com',
    title: 'Levent Kolej Ürün Hizmeti',
    description: 'Modern ve güvenilir e-ticaret deneyimi. Kaliteli ürünler, hızlı teslimat ve müşteri memnuniyeti garantisi.',
    siteName: 'Levent Kolej Ürün Hizmeti',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Levent Kolej Ürün Hizmeti',
    description: 'Modern ve güvenilir e-ticaret deneyimi.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body className={`${lexendDeca.variable} font-lexend-deca`}>
        {children}
      </body>
    </html>
  )
}
