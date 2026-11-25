"""Capture public Wix renderings, without retaining Wix scripts or sessions."""
import hashlib
import html
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen

from playwright.sync_api import sync_playwright

BASE = Path(__file__).resolve().parent
OUT = BASE / 'design'
MEDIA = OUT / 'media'
ORIGIN = 'https://www.datacoach.org.il'
HOSTS = {'static.wixstatic.com', 'static.parastorage.com', 'fonts.gstatic.com'}
URL = re.compile(r'''(?:https?:)?//(?:static\.wixstatic\.com|static\.parastorage\.com|fonts\.gstatic\.com)/[^"'()<>\s\\]+''')

SNAPSHOT = r'''() => {
  const root = document.querySelector('#SITE_CONTAINER') || document.body;
  const copy = root.cloneNode(true);
  for (const img of copy.querySelectorAll('img')) {
    const original = img.id && document.getElementById(img.id);
    if (original && original.currentSrc) img.src = original.currentSrc;
    try {
      const info = JSON.parse(img.closest('[data-image-info]')?.getAttribute('data-image-info') || '{}');
      if (info.imageData?.uri && (info.isLQIP || !img.getAttribute('src') || img.getAttribute('src').includes('blur_')))
        img.src = 'https://static.wixstatic.com/media/' + info.imageData.uri;
    } catch (_) {}
    img.removeAttribute('srcset'); img.removeAttribute('loading');
  }
  let css = [...document.styleSheets].map(s => {
    try { return s.ownerNode?.textContent?.trim() || [...s.cssRules].map(r => r.cssText).join('\n'); }
    catch (_) { return ''; }
  }).join('\n');
  copy.querySelectorAll('script,iframe,link,style,noscript').forEach(n => n.remove());
  for (const node of [copy, ...copy.querySelectorAll('*')]) {
    for (const a of [...node.attributes])
      if (/^on/i.test(a.name) || ['data-image-info','data-src','data-animator-params'].includes(a.name)) node.removeAttribute(a.name);
    if (node.tagName === 'FORM') { node.removeAttribute('action'); node.removeAttribute('method'); node.dataset.offlineForm = 'true'; }
  }
  for (const a of copy.querySelectorAll('a[href]')) {
    try { const u = new URL(a.getAttribute('href'), location.href);
      if (u.hostname === location.hostname || u.hostname === 'datacoach.org.il') a.setAttribute('href', u.pathname + u.search + u.hash);
      else if (!['https:', 'http:', 'mailto:', 'tel:'].includes(u.protocol)) a.removeAttribute('href');
    } catch (_) { a.removeAttribute('href'); }
  }
  return {css, root:copy.outerHTML, title:document.title, body:document.body.className,
    links:[...copy.querySelectorAll('a[href]')].map(a => a.getAttribute('href'))};
}'''

def asset(ref):
    url = html.unescape(ref)
    if url.startswith('//'): url = 'https:' + url
    if urlsplit(url).hostname not in HOSTS: raise ValueError(url)
    # Wix SSR can leave a tiny blurred placeholder even after scrolling.
    if 'blur_' in url and urlsplit(url).hostname == 'static.wixstatic.com':
        url = url.split('/v1/', 1)[0]
    key = hashlib.sha256(url.encode()).hexdigest()[:24]
    existing = list(MEDIA.glob(key + '.*'))
    if existing: return ref, '/media/' + existing[0].name
    try:
        with urlopen(Request(url, headers={'User-Agent':'Mozilla/5.0'}), timeout=30) as response:
            kind = response.headers.get_content_type()
            ext = {'image/jpeg':'jpg','image/png':'png','image/svg+xml':'svg','image/webp':'webp','image/gif':'gif','image/avif':'avif','font/woff2':'woff2','font/woff':'woff','application/font-woff':'woff','font/ttf':'ttf'}.get(kind, Path(urlsplit(url).path).suffix.lstrip('.').lower())
            if ext not in {'jpg','jpeg','png','svg','webp','gif','avif','woff','woff2','ttf','otf'}: raise ValueError(kind)
            path = MEDIA / (key + '.' + ext)
            path.write_bytes(response.read())
            return ref, '/media/' + path.name
    except Exception as exc:
        print('asset unavailable:', url[:140], str(exc), flush=True)
        return ref, ''

def capture(browser, path, mobile):
    context = browser.new_context(viewport={'width':390 if mobile else 1440,'height':900}, is_mobile=mobile, has_touch=mobile,
        user_agent=('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' if mobile else 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'))
    page = context.new_page()
    page.goto(ORIGIN + path, wait_until='domcontentloaded', timeout=60000)
    page.wait_for_timeout(3000)
    height = page.evaluate('document.body.scrollHeight')
    for y in range(0, height + 900, 650):
        page.evaluate('y => scrollTo(0,y)', y); page.wait_for_timeout(150)
    page.evaluate('scrollTo(0,0)'); page.wait_for_timeout(500)
    result = page.evaluate(SNAPSHOT)
    context.close()
    return result

def main():
    MEDIA.mkdir(parents=True, exist_ok=True)
    pending = ['/','/about','/curriculum','/faq','/contact']
    done = set()
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True)
        while pending and len(done) < 50:
            path = pending.pop(0).rstrip('/') or '/'
            if path in done: continue
            done.add(path)
            try:
                desktop = capture(browser, path, False)
                mobile = capture(browser, path, True)
            except Exception as exc:
                print('page unavailable:', path, exc, flush=True); continue
            for link in desktop['links'] + mobile['links']:
                parsed = urlsplit(link)
                if link.startswith('/') and not link.startswith('//') and not parsed.query and not re.search(r'\.[a-zA-Z0-9]{2,5}$', parsed.path):
                    candidate = parsed.path.rstrip('/') or '/'
                    if candidate not in done and candidate not in pending: pending.append(candidate)
            name = 'index' if path == '/' else path.strip('/') + '/index'
            css = '@media (min-width: 751px){\n' + desktop['css'] + '\n}\n@media (max-width: 750px){\n' + mobile['css'] + '\n}\n@media (max-width:750px){.capture-desktop{display:none!important}}@media (min-width:751px){.capture-mobile{display:none!important}}'
            css = re.sub(r'/\*[#@]\s*sourceMappingURL=.*?\*/', '', css, flags=re.S)
            body = '<div class="capture-desktop ' + html.escape(desktop['body'], quote=True) + '">' + desktop['root'] + '</div><div class="capture-mobile ' + html.escape(mobile['body'], quote=True) + '">' + mobile['root'] + '</div>'
            doc = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + html.escape(desktop['title']) + '</title><link rel="stylesheet" href="/styles/' + name.replace('/', '-') + '.css"><script src="/assets/site.js" defer></script>' + ('<script src="/assets/contact.js" defer></script>' if '<form' in body.lower() else '') + '</head><body>' + body + '</body></html>'
            refs = sorted(set(URL.findall(css) + URL.findall(doc)))
            with ThreadPoolExecutor(max_workers=10) as pool: paths = dict(pool.map(asset, refs))
            for suffix, data in [('html',doc),('css',css)]:
                target = OUT / (name + '.html' if suffix == 'html' else 'styles/' + name.replace('/', '-') + '.css')
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(URL.sub(lambda m: paths[m[0]], data), encoding='utf-8')
            print(path, 'captured,', len(refs), 'assets', flush=True)
        browser.close()

if __name__ == '__main__': main()
