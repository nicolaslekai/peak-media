#!/usr/bin/env python3
"""Slice each scroll clip into a numbered JPG frame sequence for canvas scroll-scrubbing.
Windows-friendly (uses imageio-ffmpeg's bundled binary). This is the smooth technique:
the site draws preloaded JPGs to a <canvas> by scroll progress — no <video> seeking.
"""
import imageio_ffmpeg, subprocess, os, sys, re, glob

FF = imageio_ffmpeg.get_ffmpeg_exe()
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VID = os.path.join(ROOT, "assets", "video")
FRAMES = os.path.join(ROOT, "assets", "frames")

# clip file -> frame-folder name
JOBS = [
    ("hero.mp4",    "hero"),
    ("spa.mp4",     "spa"),
    ("skilift.mp4", "skilift"),
]
WIDTH = 1600     # frame width — WebP is lighter, so we can afford a touch more resolution
COUNT = 120      # frames per clip
WEBP_QUALITY = 82  # libwebp quality 0..100

def duration(path):
    p = subprocess.run([FF, "-i", path], capture_output=True, text=True)
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", p.stderr)
    if not m: return 5.0
    h, mm, s = m.groups()
    return int(h)*3600 + int(mm)*60 + float(s)

def main():
    for clip, name in JOBS:
        src = os.path.join(VID, clip)
        if not os.path.exists(src):
            print("MISSING", clip); continue
        out = os.path.join(FRAMES, name)
        os.makedirs(out, exist_ok=True)
        for old in glob.glob(os.path.join(out, "frame_*.*")):
            os.remove(old)
        dur = duration(src)
        fps = COUNT / dur if dur > 0 else 30
        cmd = [FF, "-y", "-i", src,
               "-vf", f"fps={fps:.4f},scale={WIDTH}:-2",
               "-c:v", "libwebp", "-quality", str(WEBP_QUALITY), "-compression_level", "6",
               os.path.join(out, "frame_%04d.webp"),
               "-hide_banner", "-loglevel", "error"]
        subprocess.run(cmd, check=True)
        n = len(glob.glob(os.path.join(out, "frame_*.webp")))
        total_mb = sum(os.path.getsize(f) for f in glob.glob(os.path.join(out,"frame_*.webp")))/1048576
        print(f"{name}: {n} frames @ {WIDTH}px ({total_mb:.1f} MB)  -> FRAME_COUNT={n}")

if __name__ == "__main__":
    main()
