import comfy_client as cc, os, shutil
VIDDIR = r"C:\Users\nicol\Documents\Claude\Projects\scroll-cinematic\assets\video"
prompt = ("Cinematic slow camera push-in over a calm alpine infinity pool at golden hour. The camera glides "
          "forward very slowly and smoothly toward the mirror-still turquoise water and the snow-capped "
          "mountains beyond. Soft steam drifts gently across the surface, the mountain reflection shimmers "
          "faintly, warm sun flares softly. Elegant, luxurious, continuous slow motion, no cuts, no people.")
wf = {
  "1": {"class_type": "LoadImage", "inputs": {"image": "peakref_hero.png"}},
  "2": {"class_type": "KlingOmniProImageToVideoNode", "inputs": {
      "model_name": "kling-v3-omni", "prompt": prompt, "aspect_ratio": "16:9",
      "duration": 5, "reference_images": ["1", 0], "resolution": "1080p",
      "generate_audio": False, "seed": 7}},
  "3": {"class_type": "SaveVideo", "inputs": {"video": ["2", 0],
      "filename_prefix": "peakstories_hero_vid", "format": "mp4", "codec": "h264"}},
}
pid = cc.queue(wf)
print("queued", pid, flush=True)
out = cc.wait(pid, timeout=1200, poll=10, label="hero_vid")
saved = cc.download_outputs(out, VIDDIR)
mp4 = [s for s in saved if s.lower().endswith('.mp4')]
if mp4:
    shutil.copyfile(mp4[0], os.path.join(VIDDIR, "hero.mp4"))
    print("SAVED hero.mp4 <-", os.path.basename(mp4[0]))
else:
    print("no mp4:", saved)
