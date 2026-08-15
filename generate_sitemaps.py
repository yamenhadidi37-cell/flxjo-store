import os
import requests
import xml.etree.ElementTree as ET
from datetime import datetime

# إعدادات
TMDB_API_KEY = "c714ec95383c51abcde6afdf2e1571b9"
BASE_URL = "https://flxjo.netlify.app"
OUTPUT_DIR = "public"
MAX_PAGES = 50  # عدد الصفحات لجلب الأفلام (كل صفحة 20 فيلم)

def fetch_media_ids(media_type):
    ids = []
    for page in range(1, MAX_PAGES + 1):
        url = f"https://api.themoviedb.org/3/{media_type}/popular?api_key={TMDB_API_KEY}&page={page}"
        try:
            response = requests.get(url)
            if response.status_code == 200:
                data = response.json()
                for item in data.get('results', []):
                    ids.append(item['id'])
            else:
                print(f"Failed to fetch {media_type} page {page}")
        except Exception as e:
            print(f"Error fetching {media_type}: {e}")
    return ids

def generate_sitemap():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    urlset = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    
    # صفحات أساسية
    core_pages = ["/", "/home", "/movie", "/tv", "/anime"]
    for page in core_pages:
        url = ET.SubElement(urlset, "url")
        ET.SubElement(url, "loc").text = f"{BASE_URL}{page}"
        ET.SubElement(url, "lastmod").text = datetime.now().strftime("%Y-%m-%d")
        ET.SubElement(url, "changefreq").text = "daily"
        ET.SubElement(url, "priority").text = "1.0" if page == "/" else "0.9"

    # جلب الأفلام والمسلسلات
    print("Fetching movie IDs...")
    movie_ids = fetch_media_ids("movie")
    print("Fetching TV IDs...")
    tv_ids = fetch_media_ids("tv")

    for mid in movie_ids:
        url = ET.SubElement(urlset, "url")
        ET.SubElement(url, "loc").text = f"{BASE_URL}/watch/movie/{mid}"
        ET.SubElement(url, "lastmod").text = datetime.now().strftime("%Y-%m-%d")
        ET.SubElement(url, "changefreq").text = "weekly"
        ET.SubElement(url, "priority").text = "0.7"

    for tid in tv_ids:
        url = ET.SubElement(urlset, "url")
        ET.SubElement(url, "loc").text = f"{BASE_URL}/watch/tv/{tid}"
        ET.SubElement(url, "lastmod").text = datetime.now().strftime("%Y-%m-%d")
        ET.SubElement(url, "changefreq").text = "weekly"
        ET.SubElement(url, "priority").text = "0.7"

    # حفظ الملف
    tree = ET.ElementTree(urlset)
    sitemap_path = os.path.join(OUTPUT_DIR, "sitemap.xml")
    tree.write(sitemap_path, encoding="utf-8", xml_declaration=True)
    print(f"Sitemap generated at {sitemap_path} with {len(movie_ids) + len(tv_ids) + len(core_pages)} links.")

if __name__ == "__main__":
    generate_sitemap()
