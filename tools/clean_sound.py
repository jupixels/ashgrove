"""Tidy ElevenLabs sound effects for the game: cut leading silence and bring the level to a standard.

The original is backed up to assets/raw/audio_originals/<same path> before it is replaced. Re-running starts
from that backup, so it is safe to run again with different settings. If you replace a file with a new
recording, the tool notices (each cleaned file's fingerprint is kept in audio_originals/_cleaned.json)
and backs up the new recording as the original instead.

Usage: python tools/clean_sound.py [--peak -3 | --lufs -16] [--keep-lead 0.01] FILE [FILE ...]
       (paths under assets/audio; needs ffmpeg on PATH)
"""
import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO = os.path.join(ROOT, 'assets', 'audio')
BACKUP = os.path.join(ROOT, 'assets', 'raw', 'audio_originals')
MANIFEST = os.path.join(BACKUP, '_cleaned.json')


def probe(path, filters):
    return subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', filters, '-f', 'null', '-'],
                          capture_output=True, text=True).stderr


def md5(path):
    return hashlib.md5(open(path, 'rb').read()).hexdigest()


def load_manifest():
    try:
        return json.load(open(MANIFEST))
    except (OSError, ValueError):
        return {}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('files', nargs='+')
    ap.add_argument('--peak', type=float, default=-3.0, help='target peak in dB')
    ap.add_argument('--keep-lead', type=float, default=0.01, help='seconds of lead-in kept before the sound starts')
    ap.add_argument('--lufs', type=float, help='match perceived loudness instead of peak (voices: -16, screams: -13)')
    ap.add_argument('--mark-clean', action='store_true', help='only record these files as already cleaned')
    a = ap.parse_args()
    manifest = load_manifest()
    for f in a.files:
        path = os.path.abspath(f)
        rel = os.path.relpath(path, AUDIO).replace('\\', '/')
        backup = os.path.join(BACKUP, rel)
        if a.mark_clean:
            manifest[rel] = md5(path)
            continue
        replaced = os.path.exists(backup) and rel in manifest and md5(path) != manifest[rel]
        if not os.path.exists(backup) or replaced:
            os.makedirs(os.path.dirname(backup), exist_ok=True)
            shutil.copy2(path, backup)
        log = probe(backup, 'silencedetect=n=-45dB:d=0.03')
        m = re.search(r'silence_start: 0(?:\.0+)?\n.*?silence_end: ([\d.]+)', log, re.S)
        start = max(0.0, float(m.group(1)) - a.keep_lead) if m else 0.0
        if a.lufs is not None:
            level = f'loudnorm=I={a.lufs}:TP=-1.5:LRA=11'
            note = f'loudness {a.lufs} LUFS'
        else:
            peak = float(re.search(r'max_volume: (-?[\d.]+) dB', probe(backup, 'volumedetect')).group(1))
            level = f'volume={a.peak - peak:.1f}dB'
            note = f'gain {a.peak - peak:+.1f} dB'
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{start:.3f}', '-i', backup,
                        '-af', level, '-ar', '44100', '-b:a', '160k', path], check=True)
        manifest[rel] = md5(path)
        print(f'{rel}: {"new recording, " if replaced else ""}trimmed {start:.2f}s, {note}')
    os.makedirs(BACKUP, exist_ok=True)
    json.dump(manifest, open(MANIFEST, 'w'), indent=1, sort_keys=True)


if __name__ == '__main__':
    main()
