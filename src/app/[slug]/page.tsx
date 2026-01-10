import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

async function renderSection(section: any) {
  const { type, data } = section
  switch (type) {
    case 'hero':
      return (
        <section className="py-16 bg-gray-50">
          <div className="max-w-5xl mx-auto px-4">
            <h1 className="text-3xl font-bold mb-4">{data.title}</h1>
            <p className="text-gray-600">{data.subtitle}</p>
          </div>
        </section>
      )
    case 'rich_text':
      return (
        <section className="py-8">
          <div className="prose max-w-5xl mx-auto px-4" dangerouslySetInnerHTML={{ __html: data.html || '' }} />
        </section>
      )
    case 'cta':
      return (
        <section className="py-12 bg-gray-900">
          <div className="max-w-5xl mx-auto px-4 flex items-center justify-between">
            <h2 className="text-white text-2xl font-semibold">{data.title}</h2>
            {data.buttonText && (
              <a href={data.buttonUrl || '#'} className="px-4 py-2 rounded bg-white text-gray-900 font-medium">{data.buttonText}</a>
            )}
          </div>
        </section>
      )
    default:
      return null
  }
}

export default async function PageBySlug({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  
  // Direct database access - Server-side optimization
  const page = await prisma.page.findFirst({
    where: { 
      slug, 
      status: 'PUBLISHED' 
    },
    include: { 
      sections: { 
        orderBy: { order: 'asc' } 
      } 
    },
  })
  
  if (!page) {
    notFound()
  }

  return (
    <main>
      {page.sections.map((section) => (
        <div key={section.id}>
          {renderSection(section)}
        </div>
      ))}
    </main>
  )
}


