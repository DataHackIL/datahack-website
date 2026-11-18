"""Build a local static copy from captured public design and integration assets."""
import shutil
import re
from pathlib import Path
from html import escape

BASE = Path(__file__).resolve().parent
OUT = BASE / 'dist'
NEWSLETTER = 'https://5f6f5ce8.sibforms.com/serve/MUIFAGaNcdpQVojS4IkANstHZD7cniCwuH-jLMijZdCwv1X6EUY8WeDUuYwKddGqw9mFfvxdVwGIZcZ2NKTG6y0cRDgyqtKIOQdbMK5jmhpFeCrNSkWLh0LUqa1h5iHNRCci68LQRPwG4gbZqk6YYLaopuVz-WVF6_Iwm1VzJrE7sDMC-7tFvxikrK0htEjQimOueIkTBkY7Kn-ioA=='

def connect_newsletter(match):
    form = match[0].replace('/api/forms-require-javascript', NEWSLETTER, 1)
    assert form.count('name="email"') == 1
    return form.replace('name="email"', 'name="EMAIL"').replace('</form>',
        '<input type="text" name="email_address_check" value="" tabindex="-1" autocomplete="off" hidden>'
        '<input type="hidden" name="locale" value="en"></form>')

if __name__ == '__main__':
    if OUT.exists(): shutil.rmtree(OUT)
    shutil.copytree(BASE / 'design', OUT)
    for page in OUT.rglob('*.html'):
        if page.name == '404.html': continue
        source = page.read_text().replace('<title>', '<script src="/assets/viewport.js"></script><title>', 1)
        route = page.relative_to(OUT).parent.as_posix()
        canonical = 'https://datacoach.org.il/' + ('' if route == '.' else route + '/')
        source = source.replace('</head>', f'<link rel="canonical" href="{escape(canonical, quote=True)}"></head>', 1)
        # Never put visitors' form fields in the URL when scripts are disabled.
        source = source.replace('<form ', '<form method="post" action="/api/forms-require-javascript" ')
        source, count = re.subn(r'<form\b[^>]*\bid="comp-jtshg6e6"[^>]*>.*?</form>',
                                connect_newsletter, source, flags=re.S)
        if count != 2:
            raise ValueError(f'Expected desktop and mobile newsletter forms in {page}')
        page.write_text(source)
    assets = BASE / 'assets'
    if assets.exists(): shutil.copytree(assets, OUT / 'assets', dirs_exist_ok=True,
        ignore=shutil.ignore_patterns('*.py', '__pycache__'))
    else: (OUT / 'assets').mkdir()
    print('Built', OUT)
