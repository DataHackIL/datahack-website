"""Build a local static copy from captured public design and integration assets."""
import shutil
from pathlib import Path

BASE = Path(__file__).resolve().parent
OUT = BASE / 'dist'

if __name__ == '__main__':
    if OUT.exists(): shutil.rmtree(OUT)
    shutil.copytree(BASE / 'design', OUT)
    for page in OUT.rglob('*.html'):
        if page.name == '404.html': continue
        source = page.read_text().replace('<title>', '<script src="/assets/viewport.js"></script><title>', 1)
        # Never put visitors' form fields in the URL when scripts are disabled.
        source = source.replace('<form ', '<form method="post" action="/api/forms-require-javascript" ')
        page.write_text(source)
    assets = BASE / 'assets'
    if assets.exists(): shutil.copytree(assets, OUT / 'assets', dirs_exist_ok=True,
        ignore=shutil.ignore_patterns('*.py', '__pycache__'))
    else: (OUT / 'assets').mkdir()
    print('Built', OUT)
