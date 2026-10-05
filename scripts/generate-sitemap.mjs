import { mkdir, readFile, writeFile } from 'node:fs/promises';

const projectId = 'kpro-a1c5d';
const apiKey = 'AIzaSyCucLj9W843sJXwhlfVsi15soRyq29wkdU';
const collection = 'vip_media';
const output = new URL('../public/sitemap.xml', import.meta.url);
const origin = process.env.SITE_ORIGIN || 'https://flexjo.sbs';

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

function addUrl(lines, path, priority, changefreq) {
  lines.push('  <url>');
  lines.push(`    <loc>${xmlEscape(`${origin}${path}`)}</loc>`);
  lines.push(`    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>`);
  lines.push(`    <changefreq>${changefreq}</changefreq>`);
  lines.push(`    <priority>${priority}</priority>`);
  lines.push('  </url>');
}

async function main() {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
  [['/', '1.0', 'daily'], ['/home', '1.0', 'daily'], ['/movies', '0.9', 'daily'], ['/series', '0.9', 'daily'], ['/live', '0.8', 'daily'], ['/folders', '0.7', 'weekly'], ['/watchlist', '0.4', 'weekly']].forEach(([path, priority, changefreq]) => addUrl(lines, path, priority, changefreq));

  try {
    const documents = await fetchAllMedia();
    let mediaCount = 0;
    let episodeCount = 0;
    for (const document of documents) {
      const fields = Object.fromEntries(Object.entries(document.fields || {}).map(([key, value]) => [key, typedValue(value)]));
      if (fields.hidden === true) continue;
      const id = document.name?.split('/').pop();
      if (!id) continue;
      addUrl(lines, `/media/${encodeURIComponent(id)}`, fields.type === 'movie' ? '0.8' : '0.85', 'weekly');
      mediaCount += 1;
      const episodes = Array.isArray(fields.episodes) ? fields.episodes : [];
      episodes.forEach((episode, index) => {
        if (episode?.hidden === true) return;
        addUrl(lines, `/watch/${encodeURIComponent(id)}/episode/${index + 1}`, '0.7', 'monthly');
        episodeCount += 1;
      });
    }
    console.log(`sitemap: ${mediaCount} media URLs + ${episodeCount} episode URLs`);
  } catch (error) {
    console.warn(`sitemap: Firestore unavailable (${error.message}); keeping the previous static sitemap`);
    try {
      const previous = await readFile(output, 'utf8');
      await mkdir(new URL('../public', import.meta.url), { recursive: true });
      await writeFile(output, previous);
      return;
    } catch {
      // Continue with static routes if no previous file exists.
    }
  }

  lines.push('</urlset>');
  await mkdir(new URL('../public', import.meta.url), { recursive: true });
  await writeFile(output, `${lines.join('\n')}\n`);
}

await main();
