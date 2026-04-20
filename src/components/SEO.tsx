import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  url?: string;
}

export default function SEO({ title, description, keywords, image, url }: SEOProps) {
  useEffect(() => {
    // Update title
    document.title = `${title} | TEDx Lokoja`;

    // Helper to update or create meta tags
    const updateMetaTag = (selector: string, attribute: string, value: string) => {
      let tag = document.querySelector(selector);
      if (!tag) {
        tag = document.createElement('meta');
        if (selector.includes('name=')) {
          tag.setAttribute('name', selector.match(/name="([^"]+)"/)?.[1] || '');
        } else if (selector.includes('property=')) {
          tag.setAttribute('property', selector.match(/property="([^"]+)"/)?.[1] || '');
        }
        document.head.appendChild(tag);
      }
      tag.setAttribute(attribute, value);
    };

    // Standard meta tags
    updateMetaTag('meta[name="description"]', 'content', description);
    if (keywords) {
      updateMetaTag('meta[name="keywords"]', 'content', keywords);
    }

    // Open Graph tags
    updateMetaTag('meta[property="og:title"]', 'content', `${title} | TEDx Lokoja`);
    updateMetaTag('meta[property="og:description"]', 'content', description);
    if (image) updateMetaTag('meta[property="og:image"]', 'content', image);
    if (url) updateMetaTag('meta[property="og:url"]', 'content', url);

    // Twitter tags
    updateMetaTag('meta[property="twitter:title"]', 'content', `${title} | TEDx Lokoja`);
    updateMetaTag('meta[property="twitter:description"]', 'content', description);
    if (image) updateMetaTag('meta[property="twitter:image"]', 'content', image);
    if (url) updateMetaTag('meta[property="twitter:url"]', 'content', url);

  }, [title, description, keywords, image, url]);

  return null;
}
