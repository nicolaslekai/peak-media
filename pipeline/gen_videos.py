import comfy_client as cc
import json, os, time, traceback

VIDDIR = r"C:\Users\nicol\Documents\Claude\Projects\scroll-cinematic\assets\video"
os.makedirs(VIDDIR, exist_ok=True)
MANIFEST = os.path.join(VIDDIR, "video_manifest.json")

# (out_name, input_ref_filename, prompt)
CLIPS = [
  ("S1_pool", "peakref_S1_hero_pool.png",
   "Cinematic slow-motion loop. Gentle turquoise water ripples across the alpine infinity pool, "
   "soft steam drifting upward, subtle reflections shimmering, faint warm sunset light flickering on "
   "the surface. Very slow, elegant, continuous motion. Static locked-off camera, no cuts, luxury travel film."),
  ("S2_spa", "peakref_S2_spa.png",
   "Cinematic slow-motion loop. Steam drifts slowly over the calm indoor spa pool, candle flames "
   "flicker gently, faint water reflections move on the wooden ceiling, the robed guest breathes "
   "softly while gazing at the mountains. Serene, tranquil, barely-there motion. Static camera, no cuts."),
  ("S3_skilift", "peakref_S3_skilift.png",
   "Cinematic loop. The glass gondola glides smoothly along the cable high above snowy alpine peaks, "
   "the mountain backdrop slowly parallax-shifting, sparkling snow and crisp sunlight, a gentle sway "
   "of the cabin. Smooth continuous forward motion, luxury winter travel film, no cuts."),
]

def load_manifest():
    if os.path.exists(MANIFEST):
        try: return json.load(open(MANIFEST))
        except: return {}
    return {}

def main():
    man = load_manifest()
    for i,(name, ref, prompt) in enumerate(CLIPS):
        if name in man and os.path.exists(os.path.join(VIDDIR, man[name])):
            print(f"[skip] {name}"); continue
        wf = {
          "1": {"class_type": "LoadImage", "inputs": {"image": ref}},
          "2": {"class_type": "KlingOmniProImageToVideoNode", "inputs": {
              "model_name": "kling-v3-omni",
              "prompt": prompt,
              "aspect_ratio": "16:9",
              "duration": 5,
              "reference_images": ["1", 0],
              "resolution": "1080p",
              "generate_audio": False,
              "seed": 100+i}},
          "3": {"class_type": "SaveVideo", "inputs": {
              "video": ["2", 0], "filename_prefix": f"peakvid_{name}",
              "format": "mp4", "codec": "h264"}},
        }
        try:
            pid = cc.queue(wf)
            print(f"[queue] {name} -> {pid}", flush=True)
            out = cc.wait(pid, timeout=1200, poll=10, label=name)
            saved = cc.download_outputs(out, VIDDIR)
            mp4 = [s for s in saved if s.lower().endswith('.mp4')] or saved
            if mp4:
                fn = os.path.basename(mp4[0])
                # normalize to clean name
                clean = os.path.join(VIDDIR, name + ".mp4")
                if os.path.abspath(mp4[0]) != os.path.abspath(clean):
                    import shutil; shutil.copyfile(mp4[0], clean)
                man[name] = name + ".mp4"
                json.dump(man, open(MANIFEST,"w"), indent=2)
                print(f"[ok]   {name} -> {name}.mp4", flush=True)
            else:
                print(f"[warn] {name}: no video file in outputs: {saved}", flush=True)
        except Exception as e:
            print(f"[FAIL] {name}: {e}", flush=True)
            traceback.print_exc()
        time.sleep(2)
    print("DONE videos:", list(man.keys()))

if __name__ == "__main__":
    main()
