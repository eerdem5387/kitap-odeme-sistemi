// Environment variables validation
export function validateEnvironment() {
    const requiredEnvVars = [
        'DATABASE_URL',
        'JWT_SECRET',
        'NEXTAUTH_SECRET'
    ]

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

    if (missingVars.length > 0) {
        console.warn('Missing environment variables:', missingVars)
        return false
    }

    return true
}

// Database connection check
export async function checkDatabaseConnection() {
    try {
        const { prisma } = await import('./prisma')
        await prisma.$queryRaw`SELECT 1`
        return true
    } catch (error) {
        console.log('Database connection failed:', error)
        return false
    }
}
