"""Create static fallback pages for every route in the generated sitemap."""
from pathlib import Path
from urllib.parse import urlparse, unquote
import xml.etree.ElementTree as ET

DIST = Path('dist')
SITEMAP = DIST / 'sitemap.xml'
NS = '{http://www.sitemaps.org/schemas/sitemap/0.9}'


def main():
    source = DIST / 'index.html'
    if not source.exists() or not SITEMAP.exists():
        raise SystemExit('dist/index.html and dist/sitemap.xml are required')
    html = source.read_text(encoding='utf-8')
    root = ET.fromstring(SITEMAP.read_text(encoding='utf-8'))
    routes = set()
    for node in root.findall(f'{NS}url/{NS}loc'):
        path = urlparse(node.text or '').path.strip('/')
        if path:
            routes.add(path)
    for route in sorted(routes):
        target = DIST / Path(*[unquote(part) for part in route.split('/')]) / 'index.html'
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(html, encoding='utf-8')
    print(f'Created {len(routes)} static route pages in dist/')


if __name__ == '__main__':
    main()
