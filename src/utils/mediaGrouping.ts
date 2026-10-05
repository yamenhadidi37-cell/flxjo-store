import { MediaItem, ConsolidatedSeries, Episode } from '../types/media';

/**
 * Groups multi-season media items based on `parentSeries` and `seasonName`.
 * Honors the user's `hidden: true` rule to prevent duplicate cards on home/series feeds.
 */
export const groupMediaCatalog = (items: MediaItem[]): {
  consolidatedSeries: ConsolidatedSeries[];
  movies: MediaItem[];
  standaloneSeries: MediaItem[];
  displayItems: (MediaItem | ConsolidatedSeries)[];
} => {
  const seriesByParent = new Map<string, MediaItem[]>();
  const movies: MediaItem[] = [];
  const standaloneSeries: MediaItem[] = [];

  items.forEach((item) => {
    if (item.type === 'movie') {
      movies.push(item);
      return;
    }

    const parentKey = item.parentSeries && item.parentSeries.trim().length > 0 
      ? item.parentSeries.trim() 
      : null;

    if (parentKey) {
      const group = seriesByParent.get(parentKey) || [];
      group.push(item);
      seriesByParent.set(parentKey, group);
    } else {
      if (!item.hidden) {
        standaloneSeries.push(item);
      }
    }
  });

  const consolidatedSeries: ConsolidatedSeries[] = [];

  seriesByParent.forEach((seasonItems, parentTitle) => {
    // Sort seasons nicely (e.g. الأول, الثاني, etc. or by year/id)
    seasonItems.sort((a, b) => {
      const yearA = Number(a.year) || 0;
      const yearB = Number(b.year) || 0;
      return yearA - yearB;
    });

    const primaryDoc = seasonItems.find((s) => !s.hidden) || seasonItems[0];
    let totalEpisodes = 0;

    const seasons = seasonItems.map((s, idx) => {
      const eps = s.episodes || [];
      totalEpisodes += eps.length;
      return {
        seasonName: s.seasonName || `الموسم ${idx + 1}`,
        mediaId: s.id,
        episodes: eps,
        posterUrl: s.posterUrl || primaryDoc.posterUrl,
      };
    });

    consolidatedSeries.push({
      id: primaryDoc.id,
      title: parentTitle,
      type: primaryDoc.type,
      posterUrl: primaryDoc.posterUrl,
      backdropUrl: primaryDoc.backdropUrl || primaryDoc.posterUrl,
      category: primaryDoc.category,
      year: primaryDoc.year,
      rating: primaryDoc.rating,
      story: primaryDoc.story,
      folderId: primaryDoc.folderId,
      quality: primaryDoc.quality,
      views: primaryDoc.views,
      cast: primaryDoc.cast,
      videoUrl: primaryDoc.videoUrl,
      totalEpisodesCount: totalEpisodes,
      seasons,
    });
  });

  // Display items: visible movies, visible standalone series, and consolidated series
  const displayItems = [
    ...movies.filter((m) => !m.hidden),
    ...consolidatedSeries,
    ...standaloneSeries,
  ];

  return {
    consolidatedSeries,
    movies,
    standaloneSeries,
    displayItems,
  };
};

/**
 * Generates an XML sitemap adhering to sitemaps.org protocol,
 * containing distinct indexed URLs for:
 * 1. Root and category pages
 * 2. Dedicated pages for every movie and series
 * 3. Dedicated pages for EVERY single episode!
 */
export const generateSitemapXml = (
  items: MediaItem[],
  origin: string = window.location.origin
): string => {
  const currentDate = new Date().toISOString().split('T')[0];
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // Static core routes
  const staticRoutes = [
    { loc: `${origin}/`, priority: '1.0', changefreq: 'daily' },
    { loc: `${origin}/movies`, priority: '0.9', changefreq: 'daily' },
    { loc: `${origin}/series`, priority: '0.9', changefreq: 'daily' },
    { loc: `${origin}/live`, priority: '0.8', changefreq: 'daily' },
    { loc: `${origin}/folders`, priority: '0.7', changefreq: 'weekly' },
    { loc: `${origin}/sitemap`, priority: '0.6', changefreq: 'weekly' },
  ];

  staticRoutes.forEach((route) => {
    xml += `  <url>\n`;
    xml += `    <loc>${route.loc}</loc>\n`;
    xml += `    <lastmod>${currentDate}</lastmod>\n`;
    xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
    xml += `    <priority>${route.priority}</priority>\n`;
    xml += `  </url>\n`;
  });

  // Index every media item (Movie or Series)
  items.forEach((item) => {
    xml += `  <url>\n`;
    xml += `    <loc>${origin}/media/${encodeURIComponent(item.id)}</loc>\n`;
    xml += `    <lastmod>${currentDate}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>${item.type === 'movie' ? '0.8' : '0.85'}</priority>\n`;
    xml += `  </url>\n`;

    // Index EVERY individual episode if it is a series/tv/anime
    if (Array.isArray(item.episodes) && item.episodes.length > 0) {
      item.episodes.forEach((_, epIdx) => {
        xml += `  <url>\n`;
        xml += `    <loc>${origin}/watch/${encodeURIComponent(item.id)}/episode/${epIdx + 1}</loc>\n`;
        xml += `    <lastmod>${currentDate}</lastmod>\n`;
        xml += `    <changefreq>monthly</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
        xml += `  </url>\n`;
      });
    }
  });

  xml += `</urlset>`;
  return xml;
};

/**
 * Returns translated Arabic label for categories
 */
export const getCategoryLabel = (category: string): string => {
  const map: Record<string, string> = {
    egyptian: 'دراما مصرية',
    turkish: 'مسلسلات تركية',
    syrian: 'دراما شامية / سورية',
    foreign: 'أجنبي وعالمي',
    anime: 'أنمي ياباني',
    action: 'أكشن وإثارة',
    drama: 'دراما اجتماعية',
    comedy: 'كوميدي',
    sports: 'رياضة وبطولات',
    news: 'إخباري',
    movies: 'سينما وأفلام',
    documentary: 'وثائقي',
    entertainment: 'ترفيه ومنوعات',
  };
  return map[category.toLowerCase()] || category;
};
