"""Generate crawlable static HTML pages for every URL in the sitemap."""
from html import escape
from pathlib import Path
from urllib.parse import urlparse, unquote, quote
from urllib.request import Request, urlopen
import json
import re
import xml.etree.ElementTree as ET

DIST = Path('dist')
SITEMAP = DIST / 'sitemap.xml'
NS = '{http://www.sitemaps.org/schemas/sitemap/0.9}'
ORIGIN = 'https://flexjo.sbs'
FIRESTORE_PROJECT = 'kpro-a1c5d'
FIRESTORE_KEY = 'AIzaSyCucLj9W843sJXwhlfVsi15soRyq29wkdU'


def typed_value(value):
    if not isinstance(value, dict):
        return value
    if 'stringValue' in value:
        return value['stringValue']
    if 'integerValue' in value:
        return int(value['integerValue'])
    if 'doubleValue' in value:
        return float(value['doubleValue'])
    if 'booleanValue' in value:
        return value['booleanValue']
    if 'arrayValue' in value:
        return [typed_value(item) for item in value.get('arrayValue', {}).get('values', [])]
    if 'mapValue' in value:
        return {key: typed_value(item) for key, item in value.get('mapValue', {}).get('fields', {}).items()}
    return None


def fetch_media():
    documents = []
    token = ''
    while True:
        url = f'https://firestore.googleapis.com/v1/projects/{FIRESTORE_PROJECT}/databases/(default)/documents/vip_media?pageSize=300&key={FIRESTORE_KEY}'
        if token:
            url += f'&pageToken={quote(token)}'
        request = Request(url, headers={'User-Agent': 'FLEXJO static SEO builder'})
        with urlopen(request, timeout=30) as response:
            payload = json.loads(response.read().decode('utf-8'))
        documents.extend(payload.get('documents', []))
        token = payload.get('nextPageToken', '')
        if not token:
            break
    result = {}
    for document in documents:
        item_id = document.get('name', '').split('/')[-1]
        if not item_id:
            continue
        fields = {key: typed_value(value) for key, value in document.get('fields', {}).items()}
        if fields.get('hidden') is not True:
            result[item_id] = fields
    return result


def safe_text(value, fallback=''):
    text = str(value or fallback).strip()
    return re.sub(r'\s+', ' ', text)


def item_title(item, fallback):
    return safe_text(item.get('title'), fallback)


def item_description(item, title, episode_title=None):
    story = safe_text(item.get('story'))
    if episode_title:
        overview = safe_text(episode_title.get('overview'))
        if overview:
            return overview[:155]
        return f'مشاهدة {episode_title.get("title", "الحلقة")} من مسلسل {title} بجودة عالية على FLEXJO VIP.'[:155]
    if story:
        return story[:155]
    kind = 'فيلم' if item.get('type') == 'movie' else 'مسلسل'
    return f'مشاهدة {kind} {title} بجودة عالية على FLEXJO VIP.'[:155]


def episode_list(item):
    episodes = item.get('episodes')
    return episodes if isinstance(episodes, list) else []


def find_episode(item, number):
    episodes = episode_list(item)
    index = max(number - 1, 0)
    if index < len(episodes):
        return episodes[index], index, len(episodes)
    return {'title': f'الحلقة {number}'}, index, len(episodes)


def meta_replace(html, pattern, tag):
    updated, count = re.subn(pattern, tag, html, count=1, flags=re.IGNORECASE)
    if count:
        return updated
    return updated.replace('</head>', f'    {tag}\n  </head>', 1)


def seo_html(source, path, items):
    parts = path.split('/')
    item = None
    title = 'FLEXJO VIP – أفلام ومسلسلات'
    description = 'شاهد الأفلام والمسلسلات والحلقات بجودة عالية على منصة FLEXJO VIP.'
    keywords = 'FLEXJO, أفلام, مسلسلات, حلقات, مشاهدة'
    image = ''
    body = '<h1>FLEXJO VIP</h1><p>أفلام ومسلسلات وحلقات بجودة عالية.</p>'

    if len(parts) >= 2 and parts[0] in {'media', 'watch'}:
        item = items.get(unquote(parts[1]))
        if item:
            base_title = item_title(item, 'عمل FLEXJO')
            image = safe_text(item.get('posterUrl'))
            if parts[0] == 'media':
                title = f'{base_title} | FLEXJO VIP'
                description = item_description(item, base_title)
                keywords = f'{base_title}, {safe_text(item.get("category"), "مشاهدة")}, FLEXJO, مشاهدة, {"فيلم" if item.get("type") == "movie" else "مسلسل"}'
                links = [f'<p><a href="/">الرئيسية</a> · <a href="/{"movies" if item.get("type") == "movie" else "series"}">{"الأفلام" if item.get("type") == "movie" else "المسلسلات"}</a></p>']
                body_parts = [f'<h1>{escape(base_title)}</h1>', f'<p>{escape(description)}</p>', *links]
                episodes = episode_list(item)
                if episodes:
                    body_parts.append('<h2>حلقات المسلسل</h2><ul>')
                    for index, episode in enumerate(episodes, 1):
                        if isinstance(episode, dict) and episode.get('hidden') is True:
                            continue
                        episode_name = safe_text(episode.get('title') if isinstance(episode, dict) else '', f'الحلقة {index}')
                        href = f'/watch/{quote(unquote(parts[1]), safe="")}/episode/{index}'
                        body_parts.append(f'<li><a href="{href}">{escape(episode_name)}</a></li>')
                    body_parts.append('</ul>')
                body = ''.join(body_parts)
            else:
                try:
                    number = int(parts[3]) if len(parts) > 3 and parts[2] == 'episode' else 1
                except ValueError:
                    number = 1
                episode, index, total = find_episode(item, number)
                episode_name = safe_text(episode.get('title'), f'الحلقة {number}')
                title = f'{base_title} - {episode_name} | FLEXJO VIP'
                description = item_description(item, base_title, episode)
                keywords = f'{base_title}, {episode_name}, الحلقة {number}, FLEXJO, مشاهدة'
                previous_link = f'<a href="/watch/{quote(unquote(parts[1]), safe="")}/episode/{index}">الحلقة السابقة</a>' if index > 0 else ''
                next_link = f'<a href="/watch/{quote(unquote(parts[1]), safe="")}/episode/{index + 2}">الحلقة التالية</a>' if index + 1 < total else ''
                navigation = ' · '.join(link for link in [previous_link, next_link] if link)
                body = (
                    f'<h1>{escape(title)}</h1><p>{escape(description)}</p>'
                    f'<p><a href="/media/{quote(unquote(parts[1]), safe="")}">صفحة {escape(base_title)}</a>'
                    f'{(" · " + navigation) if navigation else ""}</p>'
                )

    canonical = f'{ORIGIN}/{path}'
    source = re.sub(r'<div id="seo-content"[\s\S]*?</div>', '', source, count=1, flags=re.IGNORECASE)
    source = meta_replace(source, r'<title>[\s\S]*?</title>', f'<title>{escape(title)}</title>')
    source = meta_replace(source, r'<meta\s+name="description"[^>]*>', f'<meta name="description" content="{escape(description, quote=True)}" />')
    source = meta_replace(source, r'<meta\s+name="keywords"[^>]*>', f'<meta name="keywords" content="{escape(keywords[:240], quote=True)}" />')
    source = meta_replace(source, r'<link\s+rel="canonical"[^>]*>', f'<link rel="canonical" href="{escape(canonical, quote=True)}" />')
    source = meta_replace(source, r'<meta\s+property="og:title"[^>]*>', f'<meta property="og:title" content="{escape(title, quote=True)}" />')
    source = meta_replace(source, r'<meta\s+property="og:description"[^>]*>', f'<meta property="og:description" content="{escape(description, quote=True)}" />')
    source = meta_replace(source, r'<meta\s+property="og:url"[^>]*>', f'<meta property="og:url" content="{escape(canonical, quote=True)}" />')
    source = meta_replace(source, r'<meta\s+property="og:image"[^>]*>', f'<meta property="og:image" content="{escape(image, quote=True)}" />' if image else '<meta property="og:image" content="" />')
    fallback = f'<div id="seo-content" dir="rtl" style="max-width:960px;margin:0 auto;padding:32px 20px;color:#e2e8f0;background:#070b14;font-family:Arial,sans-serif;line-height:1.8">{body}</div>'
    return source.replace('<div id="root"></div>', f'{fallback}\n    <div id="root"></div>', 1)


def main():
    source = DIST / 'index.html'
    if not source.exists() or not SITEMAP.exists():
        raise SystemExit('dist/index.html and dist/sitemap.xml are required')
    html = source.read_text(encoding='utf-8')
    root = ET.fromstring(SITEMAP.read_text(encoding='utf-8'))
    try:
        items = fetch_media()
        print(f'Loaded {len(items)} public media records for route SEO')
    except Exception as error:
        print(f'Firestore SEO data unavailable ({error}); generating route shells')
        items = {}
    routes = set()
    for node in root.findall(f'{NS}url/{NS}loc'):
        path = urlparse(node.text or '').path.strip('/')
        if path:
            routes.add(path)
    for route in sorted(routes):
        target = DIST / Path(*[unquote(part) for part in route.split('/')]) / 'index.html'
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(seo_html(html, route, items), encoding='utf-8')
    print(f'Created {len(routes)} SEO-ready static route pages in dist/')


if __name__ == '__main__':
    main()
