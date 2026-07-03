import imageio_ffmpeg, subprocess, os, shutil
FF = imageio_ffmpeg.get_ffmpeg_exe()
VID = r"C:\Users\nicol\Documents\Claude\Projects\scroll-cinematic\assets\video"

# clips to make scrub-friendly: every frame a keyframe (-g 1), faststart, yuv420p.
# KEEP native 1080p — do NOT downscale.
clips = ["hero.mp4", "S2_spa.mp4", "S3_skilift.mp4"]
for c in clips:
    src = os.path.join(VID, c)
    if not os.path.exists(src):
        print("MISSING", c); continue
    dst = os.path.join(VID, c.replace(".mp4", ".scrub.mp4"))
    cmd = [FF, "-y", "-i", src,
           "-an",
           "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p",
           "-g", "1", "-keyint_min", "1", "-sc_threshold", "0",
           "-crf", "19", "-preset", "slow", "-movflags", "+faststart",
           dst]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode == 0 and os.path.exists(dst):
        shutil.move(dst, src)  # replace original with scrub-optimized
        print(f"OK  {c}  ({os.path.getsize(src)//1024} KB)")
    else:
        print(f"FAIL {c}: {r.stderr[-300:]}")
print("done")
