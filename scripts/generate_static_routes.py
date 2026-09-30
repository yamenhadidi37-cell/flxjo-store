"""Create 200-serving HTML shells for every public sitemap route."""
from pathlib import Path
import re
import shutil
import xml.etree.ElementTree as ET

DIST = Path("dist")
SITEMAP_DIR = Path("public")
NS = "{http://www.sitemaps.org/schemas/sitemap/0.9}"


def route_from_url(url: str) -> str:
    route = re.sub(r"^https?://[^/]+", "", url).split("?", 1)[0]
    return route.strip("/")


def sitemap_urls(path: Path):
    root = ET.parse(path).getroot()
    return [node.text for node in root.findall(f"{NS}url/{NS}loc") if node.text]


def all_sitemap_urls():
    urls = []
    index = SITEMAP_DIR / "sitemap.xml"
    if not index.exists():
        raise SystemExit("public/sitemap.xml does not exist")
    root = ET.parse(index).getroot()
    child_files = [node.text for node in root.findall(f"{NS}sitemap/{NS}loc") if node.text]
    if child_files:
        for child in child_files:
            name = child.rsplit("/", 1)[-1]
            path = SITEMAP_DIR / name
            if path.exists():
                urls.extend(sitemap_urls(path))
    else:
        urls.extend(sitemap_urls(index))
    return urls


def main():
    source = DIST / "index.html"
    if not source.exists():
        raise SystemExit("dist/index.html does not exist; run the client build first")

    routes = set()
    media_routes = []
    for loc in all_sitemap_urls():
        route = route_from_url(loc)
        if route and not route.startswith("assets/"):
            routes.add(route)
            parts = route.split("/")
            if len(parts) == 3 and parts[0] in {"movie", "tv"}:
                media_routes.append(parts)

    # Preserve old /watch/<type>/<slug>/<id>/ URLs as aliases.
    for media_type, media_id, slug in media_routes:
        routes.add(f"watch/{media_type}/{slug}/{media_id}")

    # URL already discovered by Search Console.
    routes.update({"watch/movie/geostorm/274855", "movie/274855/geostorm"})

    created = 0
    for route in sorted(routes):
        target = DIST / route / "index.html"
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
        created += 1

    print(f"Created {created} static route shells in dist/")


if __name__ == "__main__":
    main()
