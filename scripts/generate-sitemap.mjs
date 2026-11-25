import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';

const projectId = 'kpro-a1c5d';
const apiKey = 'AIzaSyCucLj9W843sJXwhlfVsi15soRyq29wkdU';
const publicDir = new URL('../public/', import.meta.url);
const output = new URL('sitemap.xml', publicDir);
const catalogOutput = new URL('data/catalog.json', publicDir);
const origin = process.env.SITE_ORIGIN || 'https://flexjo.sbs';
const chunkSize = 500;

function typedValue(value) {
  if (!value || typeof value !== 'object') return value;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(typedValue);
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, item]) => [key, typedValue(item)]));
  return null;
}

function documentData(document) {
  return Object.fromEntries(Object.entries(document.fields || {}).map(([key, value]) => [key, typedValue(value)]));
}

function documentId(document) {
  return document.name?.split('/').pop() || '';
}

function normalizeMedia(document) {
  const data = documentData(document);
  const rawEpisodes = Array.isArray(data.episodes) ? data.episodes : [];
  return {
    id: documentId(document),
    title: String(data.title || data.name || '').trim() || 'عمل بدون عنوان',
    type: data.type === 'movie' ? 'movie' : (data.type === 'anime' ? 'anime' : 'tv'),
    posterUrl: data.posterUrl || '',
    backdropUrl: data.backdropUrl || data.posterUrl || '',
    category: data.category ? String(data.category).trim() : 'general',
    parentSeries: data.parentSeries ? String(data.parentSeries).trim() : '',
    seasonName: data.seasonName ? String(data.seasonName).trim() : '',
    hidden: Boolean(data.hidden),
    videoUrl: data.videoUrl || '',
    episodes: rawEpisodes.map((episode, index) => ({
      title: episode.title || `الحلقة ${index + 1}`,
      videoUrl: episode.videoUrl || '',
      hidden: Boolean(episode.hidden),
      duration: episode.duration || '45 دقيقة',
      thumbnail: episode.thumbnail || '',
      overview: episode.overview || '',
      episodeNumber: episode.episodeNumber || index + 1,
    })),
    folderId: data.folderId ? String(data.folderId).trim() : '',
    year: data.year || '',
    rating: data.rating || '',
    story: data.story || data.description || '',
    cast: Array.isArray(data.cast) ? data.cast : [],
    duration: data.duration,
    quality: data.quality || 'FHD 1080p',
    views: typeof data.views === 'number' ? data.views : 0,
  };
}

function normalizeChannel(document) {
  const data = documentData(document);
  if (data.hidden) return null;
  return {
    id: documentId(document),
    name: String(data.nameAr || data.name || data.nameEn || 'قناة بث مباشر').trim(),
    logoUrl: data.logoUrl || '',
    streamUrl: data.streamUrl || '',
    category: data.category || 'general',
    quality: data.isHd ? 'HD' : (data.quality || 'FHD'),
    currentProgram: data.currentProgram || '',
  };
}

function normalizeFolder(document) {
  const data = documentData(document);
  if (data.hidden) return null;
  return {
    id: documentId(document),
    name: String(data.title || data.name || 'مجلد').trim(),
    icon: data.icon || 'Folder',
    description: data.description || '',
    coverUrl: data.posterUrl || data.coverUrl || '',
    itemCount: typeof data.itemCount === 'number' ? data.itemCount : 0,
  };
}

async function fetchAllDocuments(collection) {
  const documents = [];
  let pageToken = '';
  do {
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}`);
    url.searchParams.set('pageSize', '300');
    url.searchParams.set('key', apiKey);
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${collection}: Firestore responded with ${response.status}`);
    const payload = await response.json();
    documents.push(...(payload.documents || []));
    pageToken = payload.nextPageToken || '';
  } while (pageToken);
  return documents;
}

async function writeCatalogSnapshot() {
  // Fetch sequentially to avoid unnecessary request bursts against Firestore quotas.
  const mediaDocuments = await fetchAllDocuments('vip_media');
  const channelDocuments = await fetchAllDocuments('live_channels');
  const folderDocuments = await fetchAllDocuments('folders');
  if (mediaDocuments.length === 0) throw new Error('vip_media returned no documents; refusing to replace the catalog with an empty snapshot');

  const catalog = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    media: mediaDocuments.map(normalizeMedia).filter((item) => item.id),
    channels: channelDocuments.map(normalizeChannel).filter(Boolean),
    folders: folderDocuments.map(normalizeFolder).filter(Boolean),
  };
  await mkdir(new URL('data/', publicDir), { recursive: true });
  await writeFile(catalogOutput, `${JSON.stringify(catalog)}\n`);
  console.log(`catalog: wrote ${catalog.media.length} media, ${catalog.channels.length} channels, ${catalog.folders.length} folders`);
  return mediaDocuments;
}

async function hasUsableCatalogSnapshot() {
  try {
    const catalog = JSON.parse(await readFile(catalogOutput, 'utf8'));
    return catalog.schemaVersion === 1 && Array.isArray(catalog.media) && catalog.media.length > 0;
  } catch {
    return false;
  }
}

function xmlEscape(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function addUrl(urls, path, priority, changefreq) {
  urls.push({ path, priority, changefreq });
}

function renderUrlset(urls) {
  const today = new Date().toISOString().slice(0, 10);
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
  for (const item of urls) {
    lines.push('  <url>');
    lines.push(`    <loc>${xmlEscape(`${origin}${item.path}`)}</loc>`);
    lines.push(`    <lastmod>${today}</lastmod>`);
    lines.push(`    <changefreq>${item.changefreq}</changefreq>`);
    lines.push(`    <priority>${item.priority}</priority>`);
    lines.push('  </url>');
  }
  lines.push('</urlset>');
  return `${lines.join('\n')}\n`;
}

function renderIndex(chunkCount) {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
  const today = new Date().toISOString().slice(0, 10);
  for (let index = 1; index <= chunkCount; index += 1) {
    lines.push('  <sitemap>');
    lines.push(`    <loc>${xmlEscape(`${origin}/sitemap-${index}.xml`)}</loc>`);
    lines.push(`    <lastmod>${today}</lastmod>`);
    lines.push('  </sitemap>');
  }
  lines.push('</sitemapindex>');
  return `${lines.join('\n')}\n`;
}

async function readPreviousUrls() {
  try {
    const previous = await readFile(output, 'utf8');
    return [...previous.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => {
      const value = match[1];
      try {
        const parsed = new URL(value);
        return { path: `${parsed.pathname}${parsed.search}${parsed.hash}`, priority: '0.5', changefreq: 'weekly' };
      } catch {
        return { path: value.startsWith('/') ? value : `/${value}`, priority: '0.5', changefreq: 'weekly' };
      }
    });
  } catch {
    return [];
  }
}

async function removeOldChunks() {
  const files = await readdir(publicDir);
  await Promise.all(files.filter((name) => /^sitemap-\d+\.xml$/.test(name)).map((name) => unlink(new URL(name, publicDir))));
}

async function main() {
  const urls = [];
  [['/', '1.0', 'daily'], ['/home', '1.0', 'daily'], ['/movies', '0.9', 'daily'], ['/series', '0.9', 'daily'], ['/live', '0.8', 'daily'], ['/folders', '0.7', 'weekly'], ['/watchlist', '0.4', 'weekly']].forEach(([path, priority, changefreq]) => addUrl(urls, path, priority, changefreq));

  let mediaDocuments = null;
  try {
    mediaDocuments = await writeCatalogSnapshot();
  } catch (error) {
    console.warn(`catalog/sitemap: Firestore unavailable (${error.message}); keeping the previous snapshot when available`);
    if (!(await hasUsableCatalogSnapshot())) {
      throw new Error('No published catalog snapshot exists and Firestore could not provide one. Fix Firestore quota, then rerun the build.');
    }
    const previous = await readPreviousUrls();
    if (previous.length > 0) {
      urls.length = 0;
      urls.push(...previous);
    }
  }

  if (mediaDocuments) {
    let mediaCount = 0;
    let episodeCount = 0;
    for (const document of mediaDocuments) {
      const fields = documentData(document);
      if (fields.hidden === true) continue;
      const id = documentId(document);
      if (!id) continue;
      addUrl(urls, `/media/${encodeURIComponent(id)}`, fields.type === 'movie' ? '0.8' : '0.85', 'weekly');
      mediaCount += 1;
      const episodes = Array.isArray(fields.episodes) ? fields.episodes : [];
      episodes.forEach((episode, index) => {
        if (episode?.hidden === true) return;
        addUrl(urls, `/watch/${encodeURIComponent(id)}/episode/${index + 1}`, '0.7', 'monthly');
        episodeCount += 1;
      });
    }
    console.log(`sitemap: ${mediaCount} media URLs + ${episodeCount} episode URLs`);
  }

  await removeOldChunks();
  const chunks = [];
  for (let index = 0; index < urls.length; index += chunkSize) {
    chunks.push(urls.slice(index, index + chunkSize));
  }
  await writeFile(output, renderUrlset(urls));
  await writeFile(new URL('flexjo-sitemap.xml', publicDir), renderUrlset(urls));
  await writeFile(new URL('manus-sitemap.xml', publicDir), renderUrlset(urls));
  await writeFile(new URL('sitemap-index.xml', publicDir), renderIndex(chunks.length));
  await writeFile(new URL('sitemap.txt', publicDir), `${urls.map((item) => `${origin}${item.path}`).join('\n')}\n`);
  await Promise.all(chunks.map((chunk, index) => writeFile(new URL(`sitemap-${index + 1}.xml`, publicDir), renderUrlset(chunk))));
  console.log(`sitemap: wrote ${urls.length} URLs, ${chunks.length} XML chunks, sitemap-index.xml and sitemap.txt`);
}

await main();
