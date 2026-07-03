import comfy_client as cc, json, os
RENDERS = r"C:\Users\nicol\Documents\Claude\Projects\scroll-cinematic\renders"
STYLE = ("ultra photorealistic, editorial travel photography, cinematic color grade, natural light, "
         "high dynamic range, crisp detail, no people, no text, no watermark, no logos")
# New hero — NO swimmer, clean and aspirational, premium (not shouting '5 star')
prompt = ("Cinematic wide hero shot of a calm alpine infinity pool at golden hour, glassy still turquoise "
          "water with a mirror reflection of snow-dusted mountains and pine forest, soft steam drifting, "
          "a modern wood-and-stone chalet softly out of focus on the right, warm low sun flaring gently, "
          "empty serene poolside, aspirational travel content, " + STYLE)
wf = {
  "1": {"class_type": "GeminiImage2Node", "inputs": {
      "prompt": prompt, "model": "gemini-3-pro-image-preview", "seed": 24,
      "aspect_ratio": "16:9", "resolution": "2K", "response_modalities": "IMAGE"}},
  "2": {"class_type": "SaveImage", "inputs": {"images": ["1", 0], "filename_prefix": "peakstories_hero"}},
}
pid = cc.queue(wf)
print("queued", pid, flush=True)
out = cc.wait(pid, timeout=300, label="hero")
saved = cc.download_outputs(out, RENDERS)
print("SAVED:", saved)
