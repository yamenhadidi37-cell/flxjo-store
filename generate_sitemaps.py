import json
import os
import re
import requests
import xml.etree.ElementTree as ET
from datetime import datetime

TMDB_API_KEY = os.environ.get("TMDB_API_KEY", "c714ec95383c51abcde6afdf2e1571b9")
BASE_URL = os.environ.get("SITE_BASE_URL", "https://flexjo.sbs")
BLOCKLIST_API_URL = os.environ.get("BLOCKLIST_API_URL", "")
OUTPUT_DIR = "public"
MAX_PAGES = 20
NS = "http://www.sitemaps.org/schemas/sitemap/0.9"
MANUALLY_BLOCKED_IDS = set()


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


def is_explicit_content(item):
    """Exclude TMDB-adult and clearly explicit titles from public SEO files.

    TMDB metadata cannot identify every individual scene, so this is a
    conservative metadata filter rather than a complete content review.
    """
    if item.get("adult") is True:
        return True
    text = " ".join(str(item.get(key) or "") for key in (
        "title", "name", "original_title", "original_name", "overview"
    )).lower()
    explicit_terms = (
        "porn", "xxx", "erotic", "nudity", "nude", "nsfw", "adult movie",
        "erotica", "striptease", "playboy", "orgasm", "naked", "uncut",
        "half-naked", "scantily", "boudoir", "إباحية", "اباحي", "عري",
        "عاري", "جنس", "جنسي", "بورن", "سكس", "للكبار فقط", "+18"
    )
    return any(term in text for term in explicit_terms)


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
                if item.get("id") and item["id"] not in MANUALLY_BLOCKED_IDS and not is_explicit_content(item):
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
    xml_str = xml_str.replace("</url></urlset>", "</url>\n</urlset>")
    with open(path, "w", encoding="utf-8") as file:
        file.write(xml_str)


def seo_record(item, media_type, clean_base):
    is_movie = media_type == "movie"
    title = item.get("title") or item.get("name") or f"{media_type.title()} {item['id']}"
    original = item.get("original_title") or item.get("original_name") or title
    slug = media_slug(item, media_type)
    route_type = "movie" if is_movie else "tv"
    route = f"/{route_type}/{item['id']}/{slug}/"
    year = (item.get("release_date") or item.get("first_air_date") or "")[:4]
    year_text = f" ({year})" if year else ""
    overview = (item.get("overview") or "").strip()
    if len(overview) > 260:
        overview = overview[:257].rsplit(" ", 1)[0] + "..."
    kind_ar = "فيلم" if is_movie else "مسلسل"
    kind_en = "movie" if is_movie else "TV series"
    ar_title = f"مشاهدة {kind_ar} {title}{year_text} مترجم HD | فلكس جو"
    en_title = f"Watch {original}{year_text} Full {kind_en} Online HD | FlexJo"
    ar_desc = (f"شاهد {kind_ar} {title}{year_text} مترجم بجودة HD على فلكس جو. "
               f"{overview}" if overview else
               f"شاهد {kind_ar} {title}{year_text} مترجم بجودة HD على منصة فلكس جو.")
    en_desc = (f"Watch {original}{year_text} online in HD with subtitles on FlexJo. "
               f"{overview}" if overview else
               f"Watch {original}{year_text} online in HD with subtitles on FlexJo.")
    image = item.get("backdrop_path") or item.get("poster_path")
    image_url = f"https://image.tmdb.org/t/p/w1280{image}" if image else f"{clean_base}/logo.jpg"
    return {
        "id": item["id"], "type": route_type, "route": route,
        "title": title, "originalTitle": original, "year": year,
        "arTitle": ar_title, "enTitle": en_title,
        "arDescription": ar_desc[:300], "enDescription": en_desc[:300],
        "description": overview or en_desc, "image": image_url,
        "url": f"{clean_base}{route}",
    }


def generate_sitemap():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    clean_base = BASE_URL.rstrip("/")
    if BLOCKLIST_API_URL:
        try:
            response = requests.get(BLOCKLIST_API_URL, timeout=10)
            if response.ok:
                MANUALLY_BLOCKED_IDS.update(int(item["id"]) for item in response.json().get("items", []) if str(item.get("id", "")).isdigit())
                print(f"Loaded {len(MANUALLY_BLOCKED_IDS)} manually blocked media IDs.")
        except Exception as exc:
            print(f"Could not load remote media blocklist: {exc}")
    now = datetime.now().strftime("%Y-%m-%d")
    pages = ET.Element("urlset", xmlns=NS)
    movies = ET.Element("urlset", xmlns=NS)
    tv = ET.Element("urlset", xmlns=NS)

    # Only indexable content pages. Search and watch history are intentionally excluded.
    core_pages = ["/", "/home", "/movie", "/tv", "/anime"]
    for page in core_pages:
        loc = f"{clean_base}{page}" if page != "/" else f"{clean_base}/"
        add_url(pages, loc, now, "1.0" if page in ["/", "/home"] else "0.9", "daily")

    print(f"Fetching media using key: {TMDB_API_KEY[:5]}***")
    movie_items = fetch_media_items("movie")
    tv_items = fetch_media_items("tv")
    seo_records = []

    for item in movie_items.values():
        record = seo_record(item, "movie", clean_base)
        seo_records.append(record)
        add_url(movies, record["url"], now)
    for item in tv_items.values():
        record = seo_record(item, "tv", clean_base)
        seo_records.append(record)
        add_url(tv, record["url"], now)

    write_xml(pages, os.path.join(OUTPUT_DIR, "sitemap-pages.xml"))
    write_xml(movies, os.path.join(OUTPUT_DIR, "sitemap-movies.xml"))
    write_xml(tv, os.path.join(OUTPUT_DIR, "sitemap-tv.xml"))
    combined = ET.Element("urlset", xmlns=NS)
    for source in (pages, movies, tv):
        for url in list(source):
            combined.append(url)
    write_xml(combined, os.path.join(OUTPUT_DIR, "sitemap.xml"))

    locations = [node.find("loc").text for node in combined if node.find("loc") is not None]
    with open(os.path.join(OUTPUT_DIR, "sitemap.txt"), "w", encoding="utf-8") as file:
        file.write("\n".join(locations) + "\n")
    with open(os.path.join(OUTPUT_DIR, "seo-media.json"), "w", encoding="utf-8") as file:
        json.dump(seo_records, file, ensure_ascii=False, indent=2)

    total = len(core_pages) + len(seo_records)
    print(f"Generated indexable sitemap with {total} URLs and {len(seo_records)} prerender records.")


if __name__ == "__main__":
    generate_sitemap()
