"""Turn raw footstep recordings into clean single-step clips for the game.

Each input file may contain several steps with silence around them. Every step is cut out with
no leading silence, peak-normalized, and given a short fade-out. Duplicate inputs are skipped.

Usage: python tools/split_steps.py OUT_DIR IN_FILE [IN_FILE ...]
Writes OUT_DIR/footstep_tile_1.mp3, footstep_tile_2.mp3, ...  (needs ffmpeg on PATH)
"""
import hashlib
import re
import subprocess
import sys

SILENCE_DB = -40      # quieter than this counts as silence
MIN_GAP = 0.05        # seconds of silence that separate two steps
PRE_ROLL = 0.01       # keep a hair of audio before the hit so the attack isn't clipped
MAX_LEN = 0.35        # a single step never needs to be longer than this
PEAK_DB = -3          # loudest point of every clip


def segments(path):
    log = subprocess.run(
        ['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', f'silencedetect=n={SILENCE_DB}dB:d={MIN_GAP}', '-f', 'null', '-'],
        capture_output=True, text=True).stderr
    dur = float(re.search(r'Duration: (\d+):(\d+):([\d.]+)', log).groups()[2])
    starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', log)]
    ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', log)]
    # sound lives between each silence_end and the next silence_start
    bounds = sorted([(0.0, 'end')] * (not starts or starts[0] > 0) + [(e, 'end') for e in ends] + [(s, 'start') for s in starts])
    out, cur = [], None
    for t, kind in bounds:
        if kind == 'end':
            cur = t
        elif cur is not None:
            if t - cur > 0.03:
                out.append((cur, t))
            cur = None
    if cur is not None and dur - cur > 0.03:
        out.append((cur, dur))
    return out


def peak_db(path, start, length):
    log = subprocess.run(
        ['ffmpeg', '-hide_banner', '-nostats', '-ss', str(start), '-t', str(length), '-i', path, '-af', 'volumedetect', '-f', 'null', '-'],
        capture_output=True, text=True).stderr
    return float(re.search(r'max_volume: (-?[\d.]+) dB', log).group(1))


def main():
    out_dir, inputs = sys.argv[1], sys.argv[2:]
    seen, n = set(), 0
    for path in inputs:
        digest = hashlib.md5(open(path, 'rb').read()).hexdigest()
        if digest in seen:
            print('skip duplicate', path)
            continue
        seen.add(digest)
        for a, b in segments(path):
            start = max(0.0, a - PRE_ROLL)
            length = min(b - start + 0.06, MAX_LEN)
            gain = PEAK_DB - peak_db(path, start, length)
            n += 1
            dst = f'{out_dir}/footstep_tile_{n}.mp3'
            subprocess.run(
                ['ffmpeg', '-y', '-loglevel', 'error', '-ss', str(start), '-t', str(length), '-i', path,
                 '-af', f'volume={gain:.1f}dB,afade=t=out:st={max(0, length - 0.05):.3f}:d=0.05',
                 '-ac', '1', '-b:a', '128k', dst], check=True)
            print(f'{dst}: from {path} @ {start:.2f}s, {length:.2f}s, gain {gain:+.1f} dB')
    print(n, 'steps written')


if __name__ == '__main__':
    main()
