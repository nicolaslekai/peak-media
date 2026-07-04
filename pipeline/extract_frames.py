"""Slice the scene videos into high-quality WebP frame sequences for the canvas scrub.
Produces a crisp desktop set (assets/frames) and a lighter mobile set (assets/framesm)."""
import imageio_ffmpeg, subprocess, os, glob, re
FF = imageio_ffmpeg.get_ffmpeg_exe()
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VID = os.path.join(ROOT, "assets", "video")
CLIPS = ["hero", "spa", "skilift"]
# (out_dir, width, webp_quality, frame_count)
SETS = [
    (os.path.join(ROOT, "assets", "frames"),  1920, 92, 120),  # desktop: crisp
    (os.path.join(ROOT, "assets", "framesm"), 1170, 90, 60),   # mobile: retina width, lighter
]

def duration(p):
    out = subprocess.run([FF, "-i", p], capture_output=True, text=True).stderr
    m = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", out)
    h, mm, s = m.groups(); return int(h)*3600 + int(mm)*60 + float(s)

for name in CLIPS:
    src = os.path.join(VID, name + ".mp4")
    if not os.path.exists(src): print("MISSING", src); continue
    dur = duration(src)
    for outroot, width, q, count in SETS:
        out = os.path.join(outroot, name); os.makedirs(out, exist_ok=True)
        for old in glob.glob(os.path.join(out, "frame_*.*")): os.remove(old)
        fps = count / dur if dur > 0 else 24
        cmd = [FF, "-y", "-i", src,
               "-vf", f"fps={fps:.4f},scale={width}:-2:flags=lanczos",
               "-c:v", "libwebp", "-quality", str(q), "-compression_level", "6", "-preset", "photo",
               os.path.join(out, "frame_%04d.webp"),
               "-hide_banner", "-loglevel", "error"]
        subprocess.run(cmd, check=True)
        files = glob.glob(os.path.join(out, "frame_*.webp"))
        mb = sum(os.path.getsize(f) for f in files) / 1048576
        tag = "desktop" if width >= 1600 else "mobile "
        print(f"{tag} {name}: {len(files)} @ {width}px q{q}  ({mb:.1f} MB)")
print("DONE")
