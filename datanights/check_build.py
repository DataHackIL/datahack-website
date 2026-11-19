"""Check the public, offline site's asset references before uploading it."""

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit

ROOT = Path(__file__).resolve().parent / "dist"
PAGES = ("", "blank", "blank-1", "privacy-policy", "accessibility-statement")


class Page(HTMLParser):
    def __init__(self, route):
        super().__init__()
        self.route = route
        self.errors = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "script" and not attrs.get("src"):
            return
        for key in ("src", "href", "poster"):
            ref = attrs.get(key, "")
            if not ref or ref.startswith(("#", "data:", "mailto:", "tel:")):
                continue
            url = urlsplit(urljoin("https://preview.invalid/" + self.route, ref))
            if url.hostname != "preview.invalid":
                if tag == "script":
                    self.errors.append("external executable: " + str(url.hostname))
                continue
            path = ROOT / unquote(url.path).lstrip("/")
            if not path.is_file() and not (path / "index.html").is_file():
                self.errors.append(ref)


def main():
    errors = []
    for route in PAGES:
        parser = Page(route + "/" if route else "")
        parser.feed((ROOT / route / "index.html").read_text(encoding="utf-8"))
        errors.extend((route or "/", ref) for ref in sorted(set(parser.errors)))
    if errors:
        raise SystemExit("\n".join(f"{route}: {ref}" for route, ref in errors))
    print(f"{len(PAGES)} pages: local links, media and script paths resolved")


if __name__ == "__main__":
    main()
