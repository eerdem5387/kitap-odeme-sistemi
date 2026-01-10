export const dynamic = 'force-dynamic'

export default async function AboutPage() {
  // Basit statik içerik (eğitim, yemek, forma, servis, kitap setleri)

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Hakkımızda</h1>
      <p className="text-gray-700 leading-relaxed">
        Okulumuzun ihtiyaç ödemelerini kolaylaştırmak için tasarlanan bu platformda; yemek hizmeti,
        okul forması, servis hizmeti ve kitap setleri satışını güvenle gerçekleştirebilirsiniz.
      </p>
      <p className="text-gray-700 leading-relaxed mt-4">
        Tüm süreçleri şeffaf, hızlı ve güvenli bir şekilde yönetiyoruz.
      </p>
    </div>
  )
} 