"""Study a reference video: contact sheets of its frames and a list of its cuts, to learn its pacing and staging.

Usage:
    python tools/ref_sheet.py <video> [--every=1] [--from=0] [--to=end] [--cols=8] [--rows=6] [--w=240] [--out=<folder>]
    python tools/ref_sheet.py <video> --strip=31.5:33 [--fps=12]      every frame of a moment, for motion
    python tools/ref_sheet.py <video> --cuts [--threshold=.3] [--bpm=132.5]
    add --song=<seconds> to any of them when the video plays the song faster or slower than the original

Sheets hold one frame every --every seconds (default 1: fast music videos change picture every second or so, so a
sparser sampling misses whole shots, and comparing several references is only fair at the same rate), stamped with its time, cols x rows per image (a long video gives several
images); --strip takes the frames of a short stretch at --fps. --cuts lists where the picture changes abruptly (a cut
or a whip) and how long each shot lasts, in seconds and, with --bpm, in beats. The default threshold catches hard cuts;
motion-graphics videos change through whips and wipes, which only show up around --threshold=.15 (with some false hits). Images go to --out (default: a folder in
the system temp directory, printed at the end). A re-upload is often sped up (about 10% is common, and the gap grows
steadily through the video): --song=<the song's length> maps every stamp, cut and shot length to song time, so
references line up with each other and with the lyrics. Needs ffmpeg on PATH and Pillow.
"""
import os
import re
import shutil
import statistics
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw


def duration(video):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video], capture_output=True, text=True)
    return float(out.stdout.strip())


def grab(video, times, w, work):
    paths = []
    for i, t in enumerate(times):
        p = os.path.join(work, f"f{i:05d}.jpg")
        subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", video, "-frames:v", "1", "-vf", f"scale={w}:-2", "-q:v", "4", "-y", p], check=True)
        paths.append((t, p))
    return paths


def sheets(frames, cols, rows, out, name, k=1.0):
    written = []
    per = cols * rows
    for s in range(0, len(frames), per):
        chunk = frames[s:s + per]
        first = Image.open(chunk[0][1])
        fw, fh = first.size
        sheet = Image.new("RGB", (cols * fw, ((len(chunk) - 1) // cols + 1) * fh), "black")
        draw = ImageDraw.Draw(sheet)
        for i, (t, p) in enumerate(chunk):
            x, y = (i % cols) * fw, (i // cols) * fh
            sheet.paste(Image.open(p), (x, y))
            draw.rectangle([x, y, x + 58, y + 16], fill="black")
            draw.text((x + 3, y + 2), f"{t * k:6.1f}s", fill="white")
        path = os.path.join(out, f"{name}_{len(written) + 1:02d}.jpg")
        sheet.save(path, quality=82)
        written.append(path)
    return written


def cuts(video, threshold):
    out = subprocess.run(["ffmpeg", "-i", video, "-vf", f"select='gt(scene,{threshold})',showinfo", "-an", "-f", "null", "-"], capture_output=True, text=True)
    return [float(m) for m in re.findall(r"pts_time:([\d.]+)", out.stderr)]


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    opts = dict((a[2:].split("=", 1) + [""])[:2] for a in sys.argv[1:] if a.startswith("--"))
    if len(args) != 1:
        print(__doc__)
        sys.exit(1)
    video, name = args[0], os.path.splitext(os.path.basename(args[0]))[0]
    total = duration(video)
    k = float(opts["song"]) / total if opts.get("song") else 1.0
    if "cuts" in opts:
        times = [c * k for c in cuts(video, float(opts.get("threshold") or .3))]
        bounds = [0.0] + times + [total * k]
        lengths = [b - a for a, b in zip(bounds, bounds[1:])]
        beat = 60 / float(opts["bpm"]) if opts.get("bpm") else None
        for a, n in zip(bounds, lengths):
            print(f"{a:7.2f}s  shot {n:5.2f}s" + (f"  {n / beat:5.1f} beats" if beat else ""))
        print(f"{len(times)} cuts in {total * k:.1f}s; median shot {statistics.median(lengths):.2f}s, shortest {min(lengths):.2f}s, longest {max(lengths):.2f}s")
        return
    out = opts.get("out") or os.path.join(tempfile.gettempdir(), "ref_sheets")
    os.makedirs(out, exist_ok=True)
    work = tempfile.mkdtemp(prefix="ref_frames_")
    try:
        if opts.get("strip"):
            a, b = (float(v) / k for v in opts["strip"].split(":"))
            fps = float(opts.get("fps") or 12)
            times = [a + i / fps for i in range(round((b - a) * fps) + 1)]
            name += f"_strip{a:g}"
        else:
            a, b, every = float(opts.get("from") or 0) / k, float(opts.get("to") or total * k) / k, float(opts.get("every") or 1) / k
            times = [a + i * every for i in range(int((min(b, total - .05) - a) / every) + 1)]
        frames = grab(video, times, int(opts.get("w") or 240), work)
        for p in sheets(frames, int(opts.get("cols") or 8), int(opts.get("rows") or 6), out, name, k):
            print(p)
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    main()
