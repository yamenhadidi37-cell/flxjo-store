import { readdir, readFile, unlink, writeFile } from 'node:fs/promises';

const projectId = 'kpro-a1c5d';
const apiKey = 'AIzaSyCucLj9W843sJXwhlfVsi15soRyq29wkdU';
const collection = 'vip_media';
const publicDir = new URL('../public/', import.meta.url);
const output = new URL('sitemap.xml', publicDir);
const origin = process.env.SITE_ORIGIN || 'https://www.flexjo.sbs';
const chunkSize = 500;

function typedValue(value) {
  if (!value || typeof value !== 'object') return value;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(typedValue);
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, item]) => [key, typedValue(item)]));
  return null;
}

function xmlEscape(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

async function fetchAllMedia() {
  const documents = [];
  let pageToken = '';
  do {
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}`);
    url.searchParams.set('pageSize', '300');
    url.searchParams.set('key', apiKey);
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Firestore responded with ${response.status}`);
    const payload = await response.json();
    documents.push(...(payload.documents || []));
    pageToken = payload.nextPageToken || '';
  } while (pageToken);
  return documents;
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
    return [...previous.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => ({
      path: match[1].startsWith(origin) ? match[1].slice(origin.length) : match[1],
      priority: '0.5',
      changefreq: 'weekly',
    }));
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

  try {
    const documents = await fetchAllMedia();
    let mediaCount = 0;
    let episodeCount = 0;
    for (const document of documents) {
      const fields = Object.fromEntries(Object.entries(document.fields || {}).map(([key, value]) => [key, typedValue(value)]));
      if (fields.hidden === true) continue;
      const id = document.name?.split('/').pop();
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
  } catch (error) {
    console.warn(`sitemap: Firestore unavailable (${error.message}); keeping previous URLs`);
    const previous = await readPreviousUrls();
    if (previous.length > 0) {
      urls.length = 0;
      urls.push(...previous);
    }
  }

  await removeOldChunks();
  const chunks = [];
  for (let index = 0; index < urls.length; index += chunkSize) {
    chunks.push(urls.slice(index, index + chunkSize));
  }
  await writeFile(output, renderUrlset(urls));
  await writeFile(new URL('manus-sitemap.xml', publicDir), renderUrlset(urls));
  await writeFile(new URL('sitemap-index.xml', publicDir), renderIndex(chunks.length));
  await writeFile(new URL('sitemap.txt', publicDir), `${urls.map((item) => `${origin}${item.path}`).join('\n')}\n`);
  await Promise.all(chunks.map((chunk, index) => writeFile(new URL(`sitemap-${index + 1}.xml`, publicDir), renderUrlset(chunk))));
  console.log(`sitemap: wrote ${urls.length} URLs, ${chunks.length} XML chunks, sitemap-index.xml and sitemap.txt`);
}

await main();
