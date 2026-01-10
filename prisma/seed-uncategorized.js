const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function seedUncategorized() {
  console.log('🌱 Creating uncategorized category...')
  
  try {
    // "Kategorisiz" kategorisini oluştur
    const uncategorized = await prisma.category.upsert({
      where: { slug: 'kategorisiz' },
      update: {},
      create: {
        name: 'Kategorisiz',
        slug: 'kategorisiz',
        description: 'Kategorisi belirlenmemiş ürünler',
        isActive: true,
        isPopular: false
      }
    })

    console.log('✅ Uncategorized category created:', uncategorized.id)
  } catch (error) {
    console.error('❌ Error creating uncategorized category:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedUncategorized()
