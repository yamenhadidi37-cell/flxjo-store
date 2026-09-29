"""Create a 200-serving HTML shell for every public sitemap route.
GitHub Pages is static and otherwise returns 404 for deep React routes.
The app's <base> tag and client router then render the requested content.
"""
from pathlib import Path
import re
import shutil
import xml.etree.ElementTree as ET

DIST = Path("dist")
SITEMAP = Path("public/sitemap.xml")
NS = "{http://www.sitemaps.org/schemas/sitemap/0.9}"


def route_from_url(url: str) -> str:
    route = re.sub(r"^https?://[^/]+", "", url).split("?", 1)[0]
    return route.strip("/")


def main():
    source = DIST / "index.html"
    if not source.exists():
        raise SystemExit("dist/index.html does not exist; run the client build first")
    if not SITEMAP.exists():
        raise SystemExit("public/sitemap.xml does not exist")

    root = ET.parse(SITEMAP).getroot()
    routes = set()
    for node in root.findall(f"{NS}url/{NS}loc"):
        if node.text:
            route = route_from_url(node.text)
            if route and not route.startswith("assets/"):
                routes.add(route)

    created = 0
    for route in sorted(routes):
        target = DIST / route / "index.html"
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
        created += 1

    print(f"Created {created} static route shells in dist/")


if __name__ == "__main__":
    main()
