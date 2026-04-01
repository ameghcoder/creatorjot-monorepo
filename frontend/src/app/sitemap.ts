import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://creatorjot.com'
  return [
    { url: base,                          lastModified: new Date(), changeFrequency: 'weekly',  priority: 1   },
    { url: `${base}/pricing`,             lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/faq`,                 lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/how-it-works`,        lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/about`,               lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/contact-us`,          lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/refund-policy`,       lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
  ]
}
