"""Build the public site from curated content and the committed Wix snapshot."""
import html
import json
import shutil
from pathlib import Path

BASE = Path(__file__).parent
OUT = BASE / "dist"
DATA = json.loads((BASE / "content.json").read_text())


def esc(value):
    return html.escape(value, quote=True)


def image(src, alt="", lazy=True):
    loading = ' loading="lazy"' if lazy else ' fetchpriority="high"'
    return f'<img src="/assets/{esc(src)}" alt="{esc(alt)}"{loading} decoding="async">'


def link(item):
    return f'<a href="{esc(item["url"])}">{esc(item["name"])}</a>'


def layout(title, content, team=False):
    nav = {"Our vision": "/#vision", "Programs": "/#programs", "Partners": "/#partners",
           "Team": "/team", "Contact": "/#contact"}
    links = "".join(f'<a href="{url}"' + (' aria-current="page"' if team and url == "/team" else "")
                    + f'>{name}</a>' for name, url in nav.items())
    social = "".join(link(item) for item in DATA["social"])
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title><meta name="description" content="DataHack is an Israeli nonprofit advancing diversity in data science and AI for social good.">
<link rel="icon" href="/assets/favicon.png"><link rel="stylesheet" href="/assets/site.css">
</head><body>
<a class="skip" href="#main">Skip to content</a>
<header class="mast"><div class="wrap bar"><a class="brand" href="/">{image("logo.svg", "DataHack", False)}</a>
<nav aria-label="Main navigation">{links}</nav></div></header>
<main id="main">{content}</main>
<footer><div class="wrap foot"><a href="mailto:contact@datahack.org.il">contact@datahack.org.il</a><nav aria-label="Social links">{social}</nav></div></footer>
</body></html>"""


def cards(items, people=False):
    result = []
    for item in items:
        name = link(item) if item.get("url") else esc(item["name"])
        photo = image(item["asset"]) if item.get("asset") else ""
        result.append(f'<article class="tile">{photo}<h3>{name}</h3><p>{esc(item["description"])}</p></article>')
    return f'<div class="tiles{" people" if people else ""}">{"".join(result)}</div>'


def home():
    supporters = "".join(image(x["asset"], x["name"]) for x in DATA["supporters"])
    partners = "".join(image(x["asset"], x["name"]) for x in DATA["partners"])
    return layout("DataHack | Diversity in data science and AI", f"""
<section class="hero">
  {image(DATA["hero"], "", False)}
  <div class="wrap hero-copy"><p class="label">DataHack</p><h1>Hacking diversity in data science and AI</h1>
  <p>An Israeli nonprofit expanding access to data science and putting AI to work for social good.</p>
  <a class="action" href="#programs">Explore our programs <span aria-hidden="true">↓</span></a></div>
</section>
<section class="wrap band vision" id="vision"><p class="label">Our vision</p>
<h2>A more representative AI community.</h2><p>We focus on data science education, representation of underrepresented communities in Israel, and AI projects that serve the public good.</p></section>
<section class="program-band" id="programs"><div class="wrap band"><p class="label">What we do</p><h2>Our programs</h2>
{cards(DATA["programs"])}</div></section>
<section class="partner-band" id="partners"><div class="wrap band"><h2>Supporters</h2><div class="logos">{supporters}</div>
<h2>Partners</h2><div class="logos">{partners}</div></div></section>
<section class="wrap band contact" id="contact"><div><p class="label">Contact</p><h2>Get in touch</h2>
<p><a href="mailto:contact@datahack.org.il">contact@datahack.org.il</a></p></div>
<form action="/api/contact" method="post" id="contact-form">
<label>Name<input name="name" autocomplete="name" required maxlength="100"></label>
<label>Email address<input name="email" type="email" autocomplete="email" required maxlength="254"></label>
<label>Message<textarea name="message" rows="5" required maxlength="4000"></textarea></label>
<div hidden><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>
<div class="cf-turnstile" data-sitekey="0x4AAAAAAGG1-qTJDZKK7qdk" data-action="contact" data-size="flexible"></div>
<button class="action" type="submit">Send message</button>
<p id="contact-status" role="status" aria-live="polite" hidden></p>
</form>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" defer></script>
<script src="/assets/contact.js" defer></script></section>""")


def team():
    return layout("Team | DataHack", f"""
<section class="wrap band"><p class="label">DataHack</p><h1>Our team</h1>
{cards(DATA["team"], True)}</section>
<section class="program-band"><div class="wrap band"><h2>Advisory board</h2>
{cards(DATA["advisors"], True)}</div></section>""", team=True)


def build():
    if OUT.exists():
        shutil.rmtree(OUT)
    shutil.copytree(BASE / "assets", OUT / "assets")
    shutil.copyfile(BASE.parent / "favicon.png", OUT / "assets/favicon.png")
    (OUT / "index.html").write_text(home())
    (OUT / "team.html").write_text(team())
    (OUT / "404.html").write_text(layout("Not found | DataHack",
        '<section class="wrap band"><h1>Page not found</h1><a href="/">Back to DataHack</a></section>'))
    (OUT / "_headers").write_text((BASE / "_headers").read_text())
    (OUT / "robots.txt").write_text("User-agent: *\nDisallow: /\n")


if __name__ == "__main__":
    build()
