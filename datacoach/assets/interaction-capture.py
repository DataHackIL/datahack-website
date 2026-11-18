"""Capture public interactive states for the offline preview."""
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
ORIGIN = 'https://www.datacoach.org.il'
urls = {}

def localize(html):
    pattern = r'https?://static\.wixstatic\.com/media/[^"\s<>]+'
    for url in set(re.findall(pattern, html)):
        if url not in urls:
            with urlopen(Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=30) as response:
                ext = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif', 'image/svg+xml': 'svg'}.get(response.headers.get_content_type())
                if not ext:
                    raise ValueError('Unexpected image type: ' + response.headers.get_content_type())
                name = 'interaction-media-' + hashlib.sha256(url.encode()).hexdigest()[:20] + '.' + ext
                (HERE / name).write_bytes(response.read())
                urls[url] = '/assets/' + name
        html = html.replace(url, urls[url])
    return html

def prepare(page, path):
    page.goto(ORIGIN + path, wait_until='domcontentloaded', timeout=60000)
    page.wait_for_timeout(3000)
    page.evaluate('scrollTo(0, document.body.scrollHeight)')
    page.wait_for_timeout(1000)

def main():
    existing = (HERE / 'interaction-data.js').read_text(encoding='utf-8')
    data = json.loads(existing.removeprefix('window.DataCoachInteractions = ').removesuffix(';\n'))
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True)
        for mobile in (False, True):
            context = browser.new_context(viewport={'width': 390 if mobile else 1440, 'height': 900}, is_mobile=mobile, has_touch=mobile,
                user_agent=('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' if mobile else 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36'))
            page = context.new_page()
            result = data['mobile' if mobile else 'desktop']
            result['faq'] = []
            if not mobile:
                prepare(page, '/')
                slider = page.locator('#comp-lwqa8gcm')
                slider.scroll_into_view_if_needed()
                slides = []
                for i in range(6):
                    if i:
                        slider.locator('[data-testid="nextButton"]').click(timeout=10000)
                        page.wait_for_timeout(1200)
                    slide = slider.locator('[data-testid="slidesWrapper"] > div:visible').last
                    slides.append(localize(slide.evaluate('e => { const c=e.cloneNode(true); for (const img of c.querySelectorAll("img")) { const original=document.getElementById(img.id); if(original && original.currentSrc) img.src=original.currentSrc; img.removeAttribute("srcset"); } c.querySelectorAll("script,iframe").forEach(x=>x.remove()); return c.outerHTML; }')))
                    print('desktop testimonial', i, slide.get_attribute('id'), flush=True)
                result['slides']['comp-lwqa8gcm'] = slides
            prepare(page, '/faq')
            tabs = page.locator('[data-hook="faq-root"] [role="tab"]')
            for i in range(tabs.count()):
                tabs.nth(i).dispatch_event('click')
                page.wait_for_timeout(600)
                items = page.locator('[data-hook="accordion-item-header"]').evaluate_all('xs => xs.map(x => x.parentElement.outerHTML)')
                result['faq'].append(items)
                print('faq', mobile, i, len(items), flush=True)
            data['mobile' if mobile else 'desktop'] = result
            context.close()
        browser.close()
    (HERE / 'interaction-data.js').write_text('window.DataCoachInteractions = ' + json.dumps(data, ensure_ascii=False) + ';\n', encoding='utf-8')

if __name__ == '__main__':
    main()
