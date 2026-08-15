import os
import requests
import xml.etree.ElementTree as ET
from datetime import datetime

# إعدادات الروابط والأسرار
# سنستخدم المفتاح الموجود في tmdb.ts كقيمة افتراضية إذا لم يتوفر Secret
TMDB_API_KEY = os.environ.get("TMDB_API_KEY", "c714ec95383c51abcde6afdf2e1571b9")
BASE_URL = os.environ.get("SITE_BASE_URL", "https://yamenhadidi37-cell.github.io/flxjo-store")

OUTPUT_DIR = "public"
MAX_PAGES = 5  # تقليل العدد لتسريع العملية وضمان النجاح في GitHub Actions

def fetch_media_ids(media_type):
    ids = []
    if not TMDB_API_KEY:
        print(f"Warning: TMDB_API_KEY not found. Using sample IDs for {media_type}.")
        return [157336, 27205, 155, 872585, 693134] if media_type == "movie" else [1396, 1399, 1429, 37854]
    
    for page in range(1, MAX_PAGES + 1):
        url = f"https://api.themoviedb.org/3/{media_type}/popular?api_key={TMDB_API_KEY}&page={page}"
        try:
            response = requests.get(url, timeout=15)
            if response.status_code == 200:
                data = response.json()
                for item in data.get('results', []):
                    ids.append(item['id'])
            else:
                print(f"Failed to fetch {media_type} page {page}: Status {response.status_code}")
        except Exception as e:
            print(f"Error fetching {media_type} page {page}: {e}")
    return list(set(ids))

def generate_sitemap():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # تعريف namespace للـ sitemap
    urlset = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    
    # الصفحات الأساسية
    core_pages = ["/", "/home", "/movie", "/tv", "/anime", "/search", "/history"]
    now = datetime.now().strftime("%Y-%m-%d")
    
    for page in core_pages:
        url_el = ET.SubElement(urlset, "url")
        # تنظيف الرابط الأساسي والتأكد من عدم تكرار الفواصل
        clean_base = BASE_URL.rstrip('/')
        path = page.lstrip('/')
        loc_text = f"{clean_base}/{path}".rstrip('/')
        if page == "/":
            loc_text = f"{clean_base}/"
            
        ET.SubElement(url_el, "loc").text = loc_text
        ET.SubElement(url_el, "lastmod").text = now
        ET.SubElement(url_el, "changefreq").text = "daily"
        ET.SubElement(url_el, "priority").text = "1.0" if page in ["/", "/home"] else "0.9"

    # جلب الأفلام والمسلسلات
    print(f"Fetching media using key: {TMDB_API_KEY[:5]}***")
    movie_ids = fetch_media_ids("movie")
    tv_ids = fetch_media_ids("tv")

    for mid in movie_ids:
        url_el = ET.SubElement(urlset, "url")
        ET.SubElement(url_el, "loc").text = f"{BASE_URL.rstrip('/')}/watch/movie/{mid}"
        ET.SubElement(url_el, "lastmod").text = now
        ET.SubElement(url_el, "changefreq").text = "weekly"
        ET.SubElement(url_el, "priority").text = "0.7"

    for tid in tv_ids:
        url_el = ET.SubElement(urlset, "url")
        ET.SubElement(url_el, "loc").text = f"{BASE_URL.rstrip('/')}/watch/tv/{tid}"
        ET.SubElement(url_el, "lastmod").text = now
        ET.SubElement(url_el, "changefreq").text = "weekly"
        ET.SubElement(url_el, "priority").text = "0.7"

    # حفظ الملف بتنسيق جميل
    sitemap_path = os.path.join(OUTPUT_DIR, "sitemap.xml")
    
    # تحويل الشجرة إلى نص مع إضافة سطر جديد بعد كل URL ليكون قابلاً للقراءة
    xml_str = ET.tostring(urlset, encoding='utf-8', xml_declaration=True).decode('utf-8')
    # تجميل بسيط (اختياري)
    xml_str = xml_str.replace('><url>', '>\n  <url>').replace('</url><url>', '</url>\n  <url>').replace('</url></urlset>', '</url>\n</urlset>')
    
    with open(sitemap_path, "w", encoding="utf-8") as f:
        f.write(xml_str)
        
    print(f"Sitemap successfully generated at {sitemap_path} with {len(core_pages) + len(movie_ids) + len(tv_ids)} links.")

if __name__ == "__main__":
    generate_sitemap()
