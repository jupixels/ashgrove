"""Tidy ElevenLabs sound effects for the game: cut leading silence and bring the peak up to a standard level.

The original is backed up to assets/raw/audio_originals/<same path> before it is replaced (once; re-running
always starts from that backup, so it is safe to run again with different settings).

Usage: python tools/clean_sound.py [--peak -3] [--keep-lead 0.01] FILE [FILE ...]
       (paths under assets/audio; needs ffmpeg on PATH)
"""
import argparse
import os
import re
import shutil
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO = os.path.join(ROOT, 'assets', 'audio')
BACKUP = os.path.join(ROOT, 'assets', 'raw', 'audio_originals')


def probe(path, filters):
    return subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', filters, '-f', 'null', '-'],
                          capture_output=True, text=True).stderr


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('files', nargs='+')
    ap.add_argument('--peak', type=float, default=-3.0, help='target peak in dB')
    ap.add_argument('--keep-lead', type=float, default=0.01, help='seconds of lead-in kept before the sound starts')
    a = ap.parse_args()
    for f in a.files:
        path = os.path.abspath(f)
        rel = os.path.relpath(path, AUDIO)
        backup = os.path.join(BACKUP, rel)
        if not os.path.exists(backup):
            os.makedirs(os.path.dirname(backup), exist_ok=True)
            shutil.copy2(path, backup)
        log = probe(backup, 'silencedetect=n=-45dB:d=0.03')
        m = re.search(r'silence_start: 0(?:\.0+)?\n.*?silence_end: ([\d.]+)', log, re.S)
        start = max(0.0, float(m.group(1)) - a.keep_lead) if m else 0.0
        peak = float(re.search(r'max_volume: (-?[\d.]+) dB', probe(backup, 'volumedetect')).group(1))
        gain = a.peak - peak
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{start:.3f}', '-i', backup,
                        '-af', f'volume={gain:.1f}dB', '-b:a', '160k', path], check=True)
        print(f'{rel}: trimmed {start:.2f}s, gain {gain:+.1f} dB')


if __name__ == '__main__':
    main()
