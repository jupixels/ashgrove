"""List sounds in assets/audio that are new or replaced since clean_sound.py last levelled them.

Usage: python tools/sound_status.py
"""
import hashlib
import json
import os
import re
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO = os.path.join(ROOT, 'assets', 'audio')
MANIFEST = os.path.join(ROOT, 'assets', 'raw', 'audio_originals', '_cleaned.json')

cleaned = json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else {}
for root, _, files in os.walk(AUDIO):
    for f in sorted(files):
        path = os.path.join(root, f)
        rel = os.path.relpath(path, AUDIO).replace(os.sep, '/')
        if 'footstep_tile' in rel:
            continue
        digest = hashlib.md5(open(path, 'rb').read()).hexdigest()
        status = 'new' if rel not in cleaned else 'REPLACED' if cleaned[rel] != digest else None
        if not status:
            continue
        if not f.endswith('.mp3'):
            print(f'{status:8} {rel}  (not an mp3)')
            continue
        log = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128', '-f', 'null', '-'],
                             capture_output=True, text=True).stderr
        lufs = re.findall(r'^\s+I:\s+(-?[\d.]+) LUFS', log, re.M)
        dur = re.search(r'Duration: (\d+):(\d+):([\d.]+)', log)
        print(f'{status:8} {rel:40} {float(dur.group(3)) + 60 * int(dur.group(2)):6.2f}s  {lufs[-1] if lufs else "?"} LUFS')
