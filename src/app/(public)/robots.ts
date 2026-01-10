import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: [
                '/admin/',
                '/api/',
                '/checkout/',
                '/profile/',
                '/orders/',
                '/cart/',
                '/login',
                '/register',
            ],
        },
        sitemap: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com'}/sitemap.xml`,
    }
} 