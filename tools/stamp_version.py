"""Stamp a version on every game file so browsers never run an old copy after an update.

GitHub Pages lets browsers reuse files for 10 minutes, so right after a push the page can load with stale code.
This writes a fingerprint of src/ and assets/ into index.html: the entry script gets ?v=<fingerprint>, and the
import map points every module at ?v=<fingerprint> too. Models and sounds pick it up from their own module URL
(see assets.js / audio.js). Runs automatically before each commit (.git/hooks/pre-commit); safe to run by hand.

Usage: python tools/stamp_version.py
"""
import hashlib
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, 'index.html')


def fingerprint():
    h = hashlib.md5()
    for folder in ('src', 'assets/models', 'assets/audio', 'assets/textures'):
        for base, dirs, files in sorted(os.walk(os.path.join(ROOT, folder))):
            dirs.sort()
            for f in sorted(files):
                path = os.path.join(base, f)
                h.update(os.path.relpath(path, ROOT).replace('\\', '/').encode())
                h.update(open(path, 'rb').read())
    return h.hexdigest()[:10]


def main():
    v = fingerprint()
    html = open(INDEX, encoding='utf8').read()
    modules = sorted(f for f in os.listdir(os.path.join(ROOT, 'src')) if f.endswith('.js'))
    imports = {
        'three': 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
        'three/addons/': 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/',
        **{f'./src/{m}': f'./src/{m}?v={v}' for m in modules},
    }
    block = '  <script type="importmap">\n' + json.dumps({'imports': imports}, indent=2).replace('\n', '\n  ') + '\n  </script>'
    html = re.sub(r'  <script type="importmap">.*?</script>', lambda _: block, html, count=1, flags=re.S)
    html = re.sub(r'<script type="module" src="src/main\.js[^"]*"></script>', f'<script type="module" src="src/main.js?v={v}"></script>', html)
    open(INDEX, 'w', encoding='utf8').write(html)
    print('stamped', v)


if __name__ == '__main__':
    main()
