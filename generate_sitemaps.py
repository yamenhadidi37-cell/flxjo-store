import os
import re
import requests
import xml.etree.ElementTree as ET
from datetime import datetime

TMDB_API_KEY = os.environ.get("TMDB_API_KEY", "c714ec95383c51abcde6afdf2e1571b9")
BASE_URL = os.environ.get("SITE_BASE_URL", "https://flexjo.sbs")
OUTPUT_DIR = "public"
MAX_PAGES = 20
NS = "http://www.sitemaps.org/schemas/sitemap/0.9"


def slugify(text):
    text = (text or "media").strip().lower()
    text = re.sub(r"[\s\t\n\r_]+", "-", text)
    text = re.sub(r"[^a-z0-9\-]", "", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text or "media"


def media_slug(item, media_type):
    candidates = ([item.get("original_title"), item.get("title")]
                  if media_type == "movie" else
                  [item.get("original_name"), item.get("name")])
    for candidate in candidates:
        if candidate and re.search(r"[a-z]", candidate, re.I):
            return slugify(candidate)
    return str(item.get("id", "media"))


def fetch_media_items(media_type):
    items = {}
    if not TMDB_API_KEY:
        return items
    for page in range(1, MAX_PAGES + 1):
        try:
            response = requests.get(
                f"https://api.themoviedb.org/3/{media_type}/popular",
                params={"api_key": TMDB_API_KEY, "page": page, "language": "en-US"},
                timeout=15,
            )
            if response.status_code != 200:
                print(f"Failed to fetch {media_type} page {page}: Status {response.status_code}")
                continue
            for item in response.json().get("results", []):
                if item.get("id"):
                    items[item["id"]] = item
        except Exception as exc:
            print(f"Error fetching {media_type} page {page}: {exc}")
    return items


def add_url(urlset, loc, now, priority="0.7", changefreq="weekly"):
    if not loc.endswith("/"):
        loc += "/"
    url_el = ET.SubElement(urlset, "url")
    ET.SubElement(url_el, "loc").text = loc
    ET.SubElement(url_el, "lastmod").text = now
    ET.SubElement(url_el, "changefreq").text = changefreq
    ET.SubElement(url_el, "priority").text = priority


def write_xml(root, path):
    xml_str = ET.tostring(root, encoding="utf-8", xml_declaration=True).decode("utf-8")
    xml_str = xml_str.replace("><url>", ">\n  <url>").replace("</url><url>", "</url>\n  <url>")
    xml_str = xml_str.replace("><sitemap>", ">\n  <sitemap>").replace("</sitemap><sitemap>", "</sitemap>\n  <sitemap>")
    xml_str = xml_str.replace("</url></urlset>", "</url>\n</urlset>").replace("</sitemap></sitemapindex>", "</sitemap>\n</sitemapindex>")
    with open(path, "w", encoding="utf-8") as file:
        file.write(xml_str)


def generate_sitemap():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    clean_base = BASE_URL.rstrip("/")
    now = datetime.now().strftime("%Y-%m-%d")

    pages = ET.Element("urlset", xmlns=NS)
    movies = ET.Element("urlset", xmlns=NS)
    tv = ET.Element("urlset", xmlns=NS)

    core_pages = ["/", "/home", "/movie", "/tv", "/anime", "/search", "/history"]
    for page in core_pages:
        loc = f"{clean_base}{page}" if page != "/" else f"{clean_base}/"
        add_url(pages, loc, now, "1.0" if page in ["/", "/home"] else "0.9", "daily")

    print(f"Fetching media using key: {TMDB_API_KEY[:5]}***")
    movie_items = fetch_media_items("movie")
    tv_items = fetch_media_items("tv")

    for item in movie_items.values():
        add_url(movies, f"{clean_base}/movie/{item['id']}/{media_slug(item, 'movie')}", now)
    for item in tv_items.values():
        add_url(tv, f"{clean_base}/tv/{item['id']}/{media_slug(item, 'tv')}", now)

    # Keep the child maps for diagnostics, but make the main sitemap a
    # straightforward flat urlset like the format most validators display.
    write_xml(pages, os.path.join(OUTPUT_DIR, "sitemap-pages.xml"))
    write_xml(movies, os.path.join(OUTPUT_DIR, "sitemap-movies.xml"))
    write_xml(tv, os.path.join(OUTPUT_DIR, "sitemap-tv.xml"))

    combined = ET.Element("urlset", xmlns=NS)
    for source in (pages, movies, tv):
        for url in list(source):
            combined.append(url)
    write_xml(combined, os.path.join(OUTPUT_DIR, "sitemap.xml"))

    total = len(core_pages) + len(movie_items) + len(tv_items)
    print(f"Generated flat sitemap.xml plus 3 diagnostic child sitemaps with {total} URLs.")


if __name__ == "__main__":
    generate_sitemap()
