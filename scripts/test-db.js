const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testConnection() {
  try {
    console.log('Testing database connection...')
    
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Database connection successful:', result)
    
    console.log('\nFetching licenses...')
    const licenses = await prisma.license.findMany({
      take: 5,
    })
    console.log(`✅ Found ${licenses.length} licenses`)
    
    if (licenses.length > 0) {
      console.log('\nFirst license:', {
        licenseKey: licenses[0].licenseKey,
        customerName: licenses[0].customerName,
        domain: licenses[0].domain,
        productType: licenses[0].productType,
      })
    }
    
    console.log('\nFetching chatbot logs...')
    const logs = await prisma.chatbotLog.groupBy({
      by: ['sessionId'],
      _count: true,
      take: 5,
    })
    console.log(`✅ Found ${logs.length} unique sessions`)
    
    console.log('\n✅ All database tests passed!')
  } catch (error) {
    console.error('❌ Database test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()