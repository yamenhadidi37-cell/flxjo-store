import React, { useEffect } from 'react';
import { MediaItem } from '../types';
import { getBackdropUrl, getPosterUrl } from '../lib/tmdb';
import { slugify } from '../lib/slugify';

interface SeoHeadProps {
  title?: string;
  description?: string;
  image?: string;
  type?: 'website' | 'video.movie' | 'video.tv_show';
  item?: MediaItem | null;
  lang?: 'ar' | 'en';
  canonicalUrl?: string;
}

export default function SeoHead({
  title,
  description,
  image,
  type = 'website',
  item,
  lang = 'ar',
  canonicalUrl
}: SeoHeadProps) {
  useEffect(() => {
    const siteName = lang === 'en' ? 'FlxJo Cinema Platform' : 'فلكس جو | FLXJO';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://flxjo.netlify.app';
    const currentUrl = canonicalUrl || (typeof window !== 'undefined' ? window.location.href : baseUrl);

    let pageTitle = '';
    let pageDesc = '';
    let pageImage = image || `${baseUrl}/logo.jpg`;
    let ogType = type;
    let schemaObj: any = null;

    if (item) {
      const isMovie = item.media_type === 'movie' || (!item.media_type && item.title);
      const mediaTitle = item.title || item.name || '';
      const releaseYear = (item.release_date || item.first_air_date || '').substring(0, 4);
      const yearStr = releaseYear ? ` (${releaseYear})` : '';

      if (lang === 'ar') {
        pageTitle = isMovie
          ? `مشاهدة فيلم ${mediaTitle}${yearStr} مترجم كامل HD | ${siteName}`
          : `مشاهدة مسلسل ${mediaTitle}${yearStr} جميع الحلقات HD | ${siteName}`;
        
        pageDesc = item.overview && item.overview.trim().length > 10
          ? `${item.overview.substring(0, 155)}... مشاهدة وتحميل ${mediaTitle} بجودة عالية بدون إعلانات مزعجة على فلكس جو.`
          : `شاهد الآن ${isMovie ? 'فيلم' : 'مسلسل'} ${mediaTitle}${yearStr} مترجم بأعلى جودة HD وسيرفرات سريعة على منصة فلكس جو السينمائية.`;
      } else {
        pageTitle = isMovie
          ? `Watch ${mediaTitle}${yearStr} Full Movie Online Free HD | ${siteName}`
          : `Watch ${mediaTitle}${yearStr} Full Series Online HD | ${siteName}`;
        
        pageDesc = item.overview && item.overview.trim().length > 10
          ? `${item.overview.substring(0, 155)}... Stream ${mediaTitle} in high definition with subtitles on FlxJo.`
          : `Stream ${mediaTitle}${yearStr} free in HD quality with multi-subtitle support on FlxJo Cinema.`;
      }

      const backdrop = item.backdrop_path ? getBackdropUrl(item.backdrop_path, 'original') : null;
      const poster = item.poster_path ? getPosterUrl(item.poster_path, 'w500') : null;
      pageImage = backdrop || poster || pageImage;
      ogType = isMovie ? 'video.movie' : 'video.tv_show';

      // Build JSON-LD Schema (Multi-layer Graph)
      const itemSlug = slugify(mediaTitle);
      const itemPath = isMovie ? `/movie/${item.id}/${itemSlug}` : `/tv/${item.id}/${itemSlug}`;
      const itemUrl = `${baseUrl}${itemPath}`;
      const voteCount = (item as any).vote_count || 100;

      const mainEntity = isMovie
        ? {
            '@type': 'Movie',
            '@id': `${itemUrl}#movie`,
            'name': mediaTitle,
            'alternateName': item.original_title || mediaTitle,
            'headline': pageTitle,
            'description': item.overview || pageDesc,
            'image': [pageImage, backdrop, poster].filter(Boolean),
            'datePublished': item.release_date || `${releaseYear}-01-01`,
            'url': itemUrl,
            'inLanguage': lang === 'ar' ? 'ar' : 'en',
            'aggregateRating': item.vote_average ? {
              '@type': 'AggregateRating',
              'ratingValue': item.vote_average.toFixed(1),
              'bestRating': '10',
              'worstRating': '1',
              'ratingCount': voteCount
            } : undefined,
            'provider': {
              '@type': 'Organization',
              'name': 'FlxJo Cinema',
              'url': baseUrl,
              'logo': `${baseUrl}/logo.jpg`
            }
          }
        : {
            '@type': 'TVSeries',
            '@id': `${itemUrl}#tvseries`,
            'name': mediaTitle,
            'alternateName': item.original_name || mediaTitle,
            'headline': pageTitle,
            'description': item.overview || pageDesc,
            'image': [pageImage, backdrop, poster].filter(Boolean),
            'startDate': item.first_air_date || `${releaseYear}-01-01`,
            'url': itemUrl,
            'inLanguage': lang === 'ar' ? 'ar' : 'en',
            'aggregateRating': item.vote_average ? {
              '@type': 'AggregateRating',
              'ratingValue': item.vote_average.toFixed(1),
              'bestRating': '10',
              'worstRating': '1',
              'ratingCount': voteCount
            } : undefined,
            'provider': {
              '@type': 'Organization',
              'name': 'FlxJo Cinema',
              'url': baseUrl,
              'logo': `${baseUrl}/logo.jpg`
            }
          };

      // Breadcrumb schema
      const breadcrumbList = {
        '@type': 'BreadcrumbList',
        'itemListElement': [
          {
            '@type': 'ListItem',
            'position': 1,
            'name': lang === 'en' ? 'Home' : 'الرئيسية',
            'item': baseUrl
          },
          {
            '@type': 'ListItem',
            'position': 2,
            'name': isMovie ? (lang === 'en' ? 'Movies' : 'الأفلام') : (lang === 'en' ? 'TV Shows' : 'المسلسلات'),
            'item': `${baseUrl}/${isMovie ? 'movie' : 'tv'}`
          },
          {
            '@type': 'ListItem',
            'position': 3,
            'name': mediaTitle,
            'item': itemUrl
          }
        ]
      };

      schemaObj = {
        '@context': 'https://schema.org',
        '@graph': [mainEntity, breadcrumbList]
      };
    } else {
      pageTitle = title 
        ? `${title} | ${siteName}`
        : (lang === 'ar' ? 'فلكس جو | FlxJo - مشاهدة أحدث الأفلام والمسلسلات والأنمي مجاناً' : 'FlxJo | Watch Movies, Series & Anime Online Free');
      
      pageDesc = description || (lang === 'ar'
        ? 'منصة فلكس جو السينمائية لمشاهدة وتحميل أحدث أفلام هوليوود، المسلسلات العالمية، وروائع الأنمي الياباني بأعلى جودة HD وبدون إعلانات مزعجة.'
        : 'FlxJo Cinema Platform to watch latest Hollywood movies, trending TV series, and legendary Japanese anime free in full HD.');

      // Global WebSite & SearchAction Schema
      schemaObj = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        'name': 'FlxJo Cinema',
        'alternateName': 'فلكس جو',
        'url': baseUrl,
        'description': pageDesc,
        'potentialAction': {
          '@type': 'SearchAction',
          'target': `${baseUrl}/home?search={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
      };
    }

    // Update document title
    document.title = pageTitle;

    // Helper to update meta tags
    const setMetaTag = (nameAttr: 'name' | 'property', attrValue: string, content: string) => {
      let element = document.querySelector(`meta[${nameAttr}="${attrValue}"]`) as HTMLMetaElement;
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(nameAttr, attrValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Helper for link rel
    const setLinkTag = (rel: string, href: string) => {
      let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', rel);
        document.head.appendChild(element);
      }
      element.setAttribute('href', href);
    };

    // Standard SEO Tags
    setMetaTag('name', 'google-site-verification', 'NSdY4h5pH0VVdwEK36LgS7gnPXVmXK-MjvAF4-TJi04');
    setMetaTag('name', 'description', pageDesc);
    setMetaTag('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    setMetaTag('name', 'keywords', lang === 'ar' 
      ? 'مشاهدة افلام, تحميل مسلسلات, انمي مترجم, فلكس جو, flxjo, افلام 2026, مسلسلات هوليوود'
      : 'watch movies online, free streaming, hd movies, tv series, anime streaming, flxjo');

    // OpenGraph Tags
    setMetaTag('property', 'og:site_name', siteName);
    setMetaTag('property', 'og:title', pageTitle);
    setMetaTag('property', 'og:description', pageDesc);
    setMetaTag('property', 'og:image', pageImage);
    setMetaTag('property', 'og:url', currentUrl);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:locale', lang === 'ar' ? 'ar_AR' : 'en_US');

    // Twitter Tags
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', pageTitle);
    setMetaTag('name', 'twitter:description', pageDesc);
    setMetaTag('name', 'twitter:image', pageImage);

    // Canonical link
    setLinkTag('canonical', currentUrl);

    // JSON-LD Schema injection
    let schemaScript = document.getElementById('flxjo-jsonld-schema') as HTMLScriptElement;
    if (schemaObj) {
      if (!schemaScript) {
        schemaScript = document.createElement('script');
        schemaScript.id = 'flxjo-jsonld-schema';
        schemaScript.type = 'application/ld+json';
        document.head.appendChild(schemaScript);
      }
      schemaScript.textContent = JSON.stringify(schemaObj, null, 2);
    } else if (schemaScript) {
      schemaScript.remove();
    }
  }, [title, description, image, type, item, lang, canonicalUrl]);

  return null;
}
