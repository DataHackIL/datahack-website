"""Assemble the self-hosted design and Cloudflare integration, entirely offline."""
import shutil
from pathlib import Path

BASE = Path(__file__).resolve().parent
OUT = BASE / "dist"

if __name__ == "__main__":
    if OUT.exists():
        shutil.rmtree(OUT)
    shutil.copytree(BASE / "design", OUT)
    for page in ("index.html", "team.html"):
        path = OUT / page
        path.write_text(path.read_text().replace("</head>",
            '<link rel="stylesheet" href="/assets/proportions.css"></head>'))
    (OUT / "assets").mkdir()
    for script in ("contact.js", "mirror.js", "proportions.css"):
        shutil.copyfile(BASE / "assets" / script, OUT / "assets" / script)
    shutil.copyfile(BASE.parent / "favicon.png", OUT / "assets/favicon.png")
    shutil.copyfile(BASE / "_headers", OUT / "_headers")
    (OUT / "404.html").write_text('<!doctype html><html lang="en"><title>Not found | DataHack</title><h1>Page not found</h1><a href="/">Back to DataHack</a></html>')
    (OUT / "robots.txt").write_text("User-agent: *\nDisallow: /\n")
