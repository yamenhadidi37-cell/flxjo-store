"""Create indexable HTML for every sitemap route and deep-link aliases."""
from html import escape
import json
from pathlib import Path
import re
import shutil
import xml.etree.ElementTree as ET

DIST = Path("dist")
SITEMAP_DIR = Path("public")
SEO_DATA = SITEMAP_DIR / "seo-media.json"
NS = "{http://www.sitemaps.org/schemas/sitemap/0.9}"


def route_from_url(url: str) -> str:
    route = re.sub(r"^https?://[^/]+", "", url).split("?", 1)[0]
    return route.strip("/")


def sitemap_urls(path: Path):
    root = ET.parse(path).getroot()
    return [node.text for node in root.findall(f"{NS}url/{NS}loc") if node.text]


def all_sitemap_urls():
    index = SITEMAP_DIR / "sitemap.xml"
    if not index.exists():
        raise SystemExit("public/sitemap.xml does not exist")
    root = ET.parse(index).getroot()
    child_files = [node.text for node in root.findall(f"{NS}sitemap/{NS}loc") if node.text]
    if child_files:
        urls = []
        for child in child_files:
            path = SITEMAP_DIR / child.rsplit("/", 1)[-1]
            if path.exists():
                urls.extend(sitemap_urls(path))
        return urls
    return sitemap_urls(index)


def replace_meta(html: str, name: str, content: str) -> str:
    value = escape(content, quote=True)
    pattern = rf'(<meta\s+name=["\']{re.escape(name)}["\']\s+content=)["\'][^"\']*["\']'
    html, count = re.subn(pattern, rf'\1"{value}"', html, count=1, flags=re.I)
    if count:
        return html
    return html.replace("</head>", f'<meta name="{name}" content="{value}" />\n</head>', 1)


def replace_property(html: str, prop: str, content: str) -> str:
    value = escape(content, quote=True)
    pattern = rf'(<meta\s+property=["\']{re.escape(prop)}["\']\s+content=)["\'][^"\']*["\']'
    html, count = re.subn(pattern, rf'\1"{value}"', html, count=1, flags=re.I)
    if count:
        return html
    return html.replace("</head>", f'<meta property="{prop}" content="{value}" />\n</head>', 1)


def replace_canonical(html: str, url: str) -> str:
    value = escape(url, quote=True)
    pattern = r'(<link\s+rel=["\']canonical["\']\s+href=)["\'][^"\']*["\']'
    html, count = re.subn(pattern, rf'\1"{value}"', html, count=1, flags=re.I)
    if count:
        return html
    return html.replace("</head>", f'<link rel="canonical" href="{value}" />\n</head>', 1)


def customize_html(source: str, route: str, record_by_route: dict) -> str:
    data = record_by_route.get("/" + route + "/")
    is_alias = route.startswith("watch/")
    if data:
        title = data["arTitle"]
        description = data["arDescription"]
        canonical = data["url"]
        image = data["image"]
        visible = f'<main id="seo-fallback"><h1>{escape(title)}</h1><p>{escape(description)}</p></main>'
    else:
        core = {
            "": ("فلكس جو | مشاهدة الأفلام والمسلسلات والأنمي", "منصة فلكس جو لمشاهدة أحدث الأفلام والمسلسلات والأنمي بجودة عالية.", "https://flexjo.sbs/"),
            "home": ("الرئيسية | فلكس جو", "اكتشف أحدث الأفلام والمسلسلات والأنمي على فلكس جو.", "https://flexjo.sbs/home/"),
            "movie": ("الأفلام | فلكس جو", "تصفح أفلاماً مترجمة ومعلومات الأعمال السينمائية على فلكس جو.", "https://flexjo.sbs/movie/"),
            "tv": ("المسلسلات | فلكس جو", "تصفح المسلسلات والمواسم والحلقات على فلكس جو.", "https://flexjo.sbs/tv/"),
            "anime": ("الأنمي | فلكس جو", "تصفح أعمال الأنمي المترجمة على فلكس جو.", "https://flexjo.sbs/anime/"),
        }
        key = route.rstrip("/")
        title, description, canonical = core.get(key, ("فلكس جو | FlexJo", "منصة فلكس جو السينمائية.", "https://flexjo.sbs/"))
        image = "https://flexjo.sbs/logo.jpg"
        visible = f'<main id="seo-fallback"><h1>{escape(title)}</h1><p>{escape(description)}</p></main>'
    if is_alias:
        alias_parts = route.split("/")
        canonical = f"https://flexjo.sbs/{alias_parts[1]}/{alias_parts[3]}/{alias_parts[2]}/"
        visible = ""
    result = re.sub(r"<title>.*?</title>", f"<title>{escape(title)}</title>", source, count=1, flags=re.S)
    result = replace_meta(result, "description", description)
    result = replace_meta(result, "robots", "noindex, follow" if is_alias else "index, follow, max-image-preview:large")
    result = replace_property(result, "og:title", title)
    result = replace_property(result, "og:description", description)
    result = replace_property(result, "og:url", canonical)
    result = replace_property(result, "og:image", image)
    result = replace_canonical(result, canonical)
    result = result.replace('<div id="root"></div>', visible + '<div id="root"></div>', 1)
    return result


def main():
    source = DIST / "index.html"
    if not source.exists():
        raise SystemExit("dist/index.html does not exist; run the client build first")
    records = json.loads(SEO_DATA.read_text(encoding="utf-8")) if SEO_DATA.exists() else []
    record_by_route = {item["route"]: item for item in records}
    routes = {route_from_url(loc) for loc in all_sitemap_urls() if route_from_url(loc)}
    media_routes = []
    for route in routes:
        parts = route.split("/")
        if len(parts) == 3 and parts[0] in {"movie", "tv"}:
            media_routes.append(parts)
    for media_type, media_id, slug in media_routes:
        routes.add(f"watch/{media_type}/{slug}/{media_id}")
    routes.update({"watch/movie/geostorm/274855", "movie/274855/geostorm"})

    created = 0
    for route in sorted(routes):
        target = DIST / route / "index.html"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(customize_html(source.read_text(encoding="utf-8"), route, record_by_route), encoding="utf-8")
        created += 1
    print(f"Created {created} prerendered route pages in dist/")


if __name__ == "__main__":
    main()
