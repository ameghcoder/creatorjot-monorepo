import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/onboarding/', '/api/', '/checkout/'],
    },
    sitemap: 'https://creatorjot.com/sitemap.xml',
  }
}
