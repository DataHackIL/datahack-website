"""Capture public design markup and assets, never the Wix application or session."""
import hashlib
import html
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

from playwright.sync_api import sync_playwright

OUT = Path(__file__).parent / "design"
MEDIA = OUT / "media"
MEDIA.mkdir(parents=True, exist_ok=True)
HOSTS = {"static.wixstatic.com", "static.parastorage.com"}
URL = re.compile(r"""(?:https?:)?//(?:static\.wixstatic\.com|static\.parastorage\.com)/[^"'()<>\s]+""")


def local_asset(ref):
    url = html.unescape(ref)
    if url.startswith("//"):
        url = "https:" + url
    if urlsplit(url).hostname not in HOSTS:
        raise ValueError("Unexpected asset origin")
    key = hashlib.sha256(url.encode()).hexdigest()[:24]
    existing = list(MEDIA.glob(key + ".*"))
    if existing:
        return ref, "/media/" + existing[0].name
    with urlopen(Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=45) as r:
        kind = r.headers.get_content_type()
        ext = {"image/jpeg": "jpg", "image/png": "png", "image/svg+xml": "svg",
               "image/avif": "avif", "image/webp": "webp", "image/gif": "gif"}.get(kind)
        ext = ext or Path(urlsplit(url).path).suffix.lstrip(".")
        if ext not in {"jpg","jpeg","png","svg","avif","webp","gif","woff","woff2","ttf"}:
            raise ValueError(f"Unexpected static media type {kind} {ext}")
        path = MEDIA / (key + "." + ext)
        path.write_bytes(r.read())
    return ref, "/media/" + path.name


SNAPSHOT = r"""() => {
  const root = document.querySelector('#SITE_CONTAINER').cloneNode(true);
  // CSSOM serialization drops responsive shorthand values such as font:var(...).
  const css = [...document.styleSheets].map(sheet =>
    sheet.ownerNode.textContent.trim() || [...sheet.cssRules].map(rule => rule.cssText).join('\n')).join('\n');
  root.querySelectorAll('script,iframe,link,style,noscript').forEach(n=>n.remove());
  for (const node of [root,...root.querySelectorAll('*')]) {
    for (const attr of [...node.attributes]) {
      if (/^on/i.test(attr.name) || ['data-image-info','data-motion-part','data-src','data-animator-params'].includes(attr.name))
        node.removeAttribute(attr.name);
    }
  }
  for(const a of root.querySelectorAll('a[href]')) {
    const u = new URL(a.href, location.href);
    if (['datahack.org.il','www.datahack.org.il'].includes(u.hostname)) a.setAttribute('href',u.pathname+u.hash);
  }
  const form = root.querySelector('form');
  if (form) {
    form.id='contact-form'; form.method='post'; form.setAttribute('action','/api/contact');
    form.removeAttribute('novalidate');
    for (const [selector,name,max] of [['input[aria-label=Name]','name',100],
      ['input[aria-label="Email Address"]','email',254],['textarea','message',4000]]) {
      const field=form.querySelector(selector); field.name=name;field.required=true;field.maxLength=max;
      if(name==='email')field.type='email';
    }
    form.querySelector('[data-hook=submit-button]').type='submit';
    form.insertAdjacentHTML('beforeend','<div hidden><input name="website" tabindex="-1" autocomplete="off"></div><div class="cf-turnstile" data-sitekey="0x4AAAAAAGG1-qTJDZKK7qdk" data-action="contact" data-appearance="interaction-only"></div><p id="contact-status" role="status" hidden></p>');
  }
  return {css,body:document.body.className,root:root.outerHTML, title:document.title,
    svg:[...document.body.children].filter(x=>x.tagName.toLowerCase()==='svg').map(x=>x.outerHTML).join('')};
}"""


def capture(browser, name, path):
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto("https://www.datahack.org.il" + path, wait_until="load")
    # Hydrate lazy images in the narrow and wide layouts before removing Wix JS.
    variants = {}
    for width in (390, 1440):
        page.set_viewport_size({"width":width, "height":900})
        page.wait_for_timeout(450)
        for y in range(0, page.evaluate("document.body.scrollHeight")+900, 650):
            page.evaluate("y=>scrollTo(0,y)", y)
            page.wait_for_timeout(110)
        page.wait_for_timeout(500)
        variants[width] = page.eval_on_selector_all("wow-image[id] img",
            "imgs=>Object.fromEntries(imgs.filter(i=>i.currentSrc).map(i=>[i.closest('wow-image').id,i.currentSrc]))")
    page.evaluate("""mobile => { for(const [id,url] of Object.entries(mobile)){
      let img=document.getElementById(id)?.querySelector('img'); if(!img)continue;
      let p=img.closest('picture'); if(!p){p=document.createElement('picture');img.replaceWith(p);p.append(img)}
      p.querySelectorAll('source').forEach(s=>s.remove());let s=document.createElement('source');
      s.media='(max-width:750px)';s.srcset=url;p.prepend(s);
      if(!img.getAttribute('src'))img.src=url;
    }}""", variants[390])
    page.evaluate("scrollTo(0,0)")
    page.wait_for_timeout(400)
    result = page.evaluate(SNAPSHOT)
    page.close()
    css = re.sub(r"/\*[#@]\s*sourceMappingURL=.*?\*/", "", result["css"], flags=re.S)
    body = result["svg"] + result["root"]
    scripts = '<script src="/assets/mirror.js" defer></script>'
    if 'id="contact-form"' in body:
        scripts += '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" defer></script><script src="/assets/contact.js" defer></script>'
    doc = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{html.escape(result["title"])}</title><link rel="icon" href="/assets/favicon.png"><link rel="stylesheet" href="/{name}.css">{scripts}</head><body class="{result["body"]}">{body}</body></html>'''
    refs = sorted(set(URL.findall(css) + URL.findall(doc)))
    with ThreadPoolExecutor(max_workers=10) as pool:
        paths = dict(pool.map(local_asset, refs))
    for ext, data in (("html",doc), ("css",css)):
        (OUT / f"{name}.{ext}").write_text(URL.sub(lambda m: paths[m[0]], data))
    print(name, len(refs), "asset references", flush=True)


if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome")
        for name, path in [("index","/"),("team","/team")]:
            capture(browser, name, path)
