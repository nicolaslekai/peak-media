import comfy_client as cc
import json, os, time, traceback

RENDERS = r"C:\Users\nicol\Documents\Claude\Projects\scroll-cinematic\renders"
MANIFEST = os.path.join(RENDERS, "manifest.json")
os.makedirs(RENDERS, exist_ok=True)

STYLE = ("ultra photorealistic, editorial travel photography, shot on Sony A1 85mm, "
         "cinematic color grade, natural light, high dynamic range, crisp detail, "
         "5-star luxury, no text, no watermark, no logos")

PORTRAIT_STYLE = ("professional editorial portrait, shot on 85mm f1.4, soft natural window light, "
        "shallow depth of field, warm neutral tones, modern alpine luxury interior with blurred "
        "wood and stone background, confident approachable expression, photorealistic, no text, no watermark")

SHOTS = [
  # --- HERO SECTIONS (16:9, 2K) — also used as Kling video reference frames ---
  ("S1_hero_pool", "16:9", "2K",
   "Cinematic wide hero shot of a luxury alpine 5-star hotel infinity pool at golden hour, "
   "a swimmer surfacing at the pool edge sending up a dramatic crystalline water splash, "
   "turquoise water, gentle steam rising, snow-capped Bavarian Alps and pine forest behind, "
   "modern wood-and-stone chalet architecture on the right, warm sunset light, "+STYLE),
  ("S2_spa", "16:9", "2K",
   "Cinematic interior of a serene alpine luxury spa, an infinity-edge indoor-outdoor heated pool "
   "with soft steam rising, floor-to-ceiling glass wall revealing snowy mountain peaks at blue hour, "
   "warm oak wood, natural stone, candlelight and low warm lighting, a single guest in a white robe "
   "gazing at the mountains, tranquil wellness atmosphere, "+STYLE),
  ("S3_skilift", "16:9", "2K",
   "Cinematic shot of a modern panoramic glass gondola cabin ascending a cable car high above "
   "snow-covered alpine peaks under a bluebird sky, dramatic mountain vista and valley below, "
   "crisp winter sunlight, sense of altitude and luxury alpine travel, sparkling snow, "+STYLE),

  # --- TEAM (4:5, 2K) — four cohesive creative professionals ---
  ("T1_creative_director", "4:5", "2K",
   "Portrait of a stylish woman in her early 30s, creative director, short dark hair, wearing a "
   "tailored charcoal blazer, holding a coffee, "+PORTRAIT_STYLE),
  ("T2_photographer", "4:5", "2K",
   "Portrait of a man in his late 20s, cinematographer, light stubble, wearing a dark green knit "
   "sweater, a pro mirrorless camera on a strap around his neck, "+PORTRAIT_STYLE),
  ("T3_social_strategist", "4:5", "2K",
   "Portrait of a woman in her mid 20s, social media strategist, long blonde hair, wearing a cream "
   "turtleneck, warm friendly smile, holding a smartphone, "+PORTRAIT_STYLE),
  ("T4_producer", "4:5", "2K",
   "Portrait of a man in his mid 30s, executive producer, short beard, glasses, wearing a navy "
   "overshirt, arms crossed, calm confident, "+PORTRAIT_STYLE),

  # --- SOCIAL GRID TILES (1:1, 1K) — populate the engagement section ---
  ("G1_reel_pool", "1:1", "1K",
   "A hand holding a smartphone filming a vertical reel of a luxury alpine infinity pool with "
   "mountains behind, over-the-shoulder view, sunny, lifestyle content creation, "+STYLE),
  ("G2_spa_detail", "1:1", "1K",
   "Close-up flat-lay of a luxury spa detail, herbal tea, folded white towel, eucalyptus sprig, "
   "lit candle on warm oak, soft morning light, wellness lifestyle, "+STYLE),
  ("G3_aerial_pool", "1:1", "1K",
   "Aerial drone top-down view of a luxury alpine hotel infinity pool and wooden sun deck beside "
   "a snowy mountain slope, tiny sun loungers, turquoise water, "+STYLE),
  ("G4_champagne", "1:1", "1K",
   "Two champagne glasses on the stone edge of an alpine infinity pool at sunset, mountain bokeh "
   "in the background, condensation on the glass, celebratory luxury lifestyle, "+STYLE),
  ("G5_ski_action", "1:1", "1K",
   "A skier carving through fresh powder snow on an alpine slope, spray of snow catching golden "
   "backlight, dynamic action, luxury winter sport, "+STYLE),
  ("G6_chalet_interior", "1:1", "1K",
   "Cozy luxury alpine chalet lounge interior, crackling stone fireplace, sheepskin throws, warm "
   "lamp light, large window onto snowy peaks at dusk, "+STYLE),
]

def load_manifest():
    if os.path.exists(MANIFEST):
        try: return json.load(open(MANIFEST))
        except: return {}
    return {}

def main():
    manifest = load_manifest()
    for i, (name, ar, res, prompt) in enumerate(SHOTS):
        if name in manifest and os.path.exists(os.path.join(RENDERS, manifest[name].get("file",""))):
            print(f"[skip] {name} already done"); continue
        wf = {
          "1": {"class_type": "GeminiImage2Node", "inputs": {
              "prompt": prompt, "model": "gemini-3-pro-image-preview",
              "seed": 1000+i, "aspect_ratio": ar, "resolution": res,
              "response_modalities": "IMAGE"}},
          "2": {"class_type": "SaveImage", "inputs": {"images": ["1", 0],
              "filename_prefix": f"peakmedia_{name}"}},
        }
        try:
            pid = cc.queue(wf)
            print(f"[queue] {name} ({ar} {res}) -> {pid}", flush=True)
            out = cc.wait(pid, timeout=420, label=name)
            saved = cc.download_outputs(out, RENDERS)
            if saved:
                fn = os.path.basename(saved[0])
                manifest[name] = {"file": fn, "ar": ar, "res": res}
                json.dump(manifest, open(MANIFEST,"w"), indent=2)
                print(f"[ok]   {name} -> {fn}", flush=True)
        except Exception as e:
            print(f"[FAIL] {name}: {e}", flush=True)
            traceback.print_exc()
        time.sleep(1)
    print("DONE. total in manifest:", len(manifest))

if __name__ == "__main__":
    main()
