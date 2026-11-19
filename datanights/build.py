"""Build preview files in a temporary directory, then sync owned output."""
import json
import re
import shutil
import tempfile
from pathlib import Path

BASE = Path(__file__).resolve().parent
OUT = BASE / 'dist'
MANIFEST = '.build-manifest.json'

with tempfile.TemporaryDirectory(prefix='.datanights-build-', dir=BASE) as temporary:
    stage = Path(temporary)
    shutil.copytree(BASE / 'design', stage, dirs_exist_ok=True)
    shutil.copytree(BASE / 'assets', stage / 'assets')
    forms = stage / 'datanights' / 'forms'
    forms.mkdir(parents=True)
    shutil.copy2(BASE / 'forms' / 'newsletter.js', forms / 'newsletter.js')
    for page in stage.rglob('*.html'):
        source = page.read_text(encoding='utf-8')
        source = source.replace('<html lang="he" dir="rtl">', '<html lang="en">', 1)
        source = source.replace('<body>', '<body class="responsive"><script>document.body.classList.toggle("device-mobile-responsive", matchMedia("(max-width: 750px)").matches)</script>', 1)
        source = source.replace('</head>', '<script defer src="/datanights/forms/newsletter.js"></script></head>', 1)
        source = re.sub(r'(<form\b[^>]*aria-label="Subscribe 1"[^>]*>)(.*?)(</form>)',
                        lambda m: m[1] + re.sub(r'<input\b', '<input disabled data-preview-disabled', m[2]) + m[3], source, flags=re.S)
        source = source.replace('</form>', '<noscript><p>For newsletter signup, visit the <a href="https://5f6f5ce8.sibforms.com/serve/MUIFAD_Xp6chqrR_yxAODllDypizhsVCkvp2Wxi4if9xndXPp7LkY3mZ1e0UCmzZVgH4DJf3ClkDfRy7NJ-U1CH6_PEUT4j6i8I1M9_jrKi0pKCJFXrU7uHY_8mp46E6_gftwsjba4hnkRdkvOkkH9CvXtgpeOA6j0L2NXrevt-MCs24z-u1jStf8vqHy0h3ZoYC1F5IR7MsbiGaOg==">hosted signup form</a>.</p></noscript></form>')
        page.write_text(source, encoding='utf-8')
    (stage / 'robots.txt').write_text('User-agent: *\nDisallow: /\n', encoding='utf-8')
    (stage / '_headers').write_text('/*\n  X-Robots-Tag: noindex, nofollow\n', encoding='utf-8')
    (stage / '404.html').write_text('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Page not found | DataNights</title></head><body><main><h1>Page not found</h1><p><a href="/">Return to DataNights home</a></p></main></body></html>', encoding='utf-8')
    files = sorted(p.relative_to(stage).as_posix() for p in stage.rglob('*') if p.is_file())
    OUT.mkdir(exist_ok=True)
    manifest = OUT / MANIFEST
    previous = json.loads(manifest.read_text()) if manifest.exists() else []
    for name in previous:
        target = OUT / name
        if name not in files and target.is_file() and target.resolve().is_relative_to(OUT.resolve()):
            target.unlink()
    shutil.copytree(stage, OUT, dirs_exist_ok=True)
    manifest.write_text(json.dumps(files, indent=2) + '\n', encoding='utf-8')
print('Built', OUT)
