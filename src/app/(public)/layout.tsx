import HeaderWrapper from '@/components/layout/HeaderWrapper'
import Footer from '@/components/layout/Footer'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <HeaderWrapper />
      <main className="flex-1 pb-20 lg:pb-0">{children}</main>
      <Footer />
    </div>
  )
}
