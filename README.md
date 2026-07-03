# Peak Stories — cinematic, scroll-scrubbed one-page site

Concept site for **Peak Stories**, a Bavarian creative studio making scroll-stopping social
content, films and photography for hotels, spas and alpine resorts. The pitch: content
engineered for engagement — reels, films and photography that make people book.

## Run it locally

The site uses **scroll-scrubbed video** (`<video>` seeks as you scroll), which needs a server
that supports HTTP **Range** requests. Python's stock `http.server` does **not**, so use the
included range-capable server:

```bash
python serve.py 5174
# open http://localhost:5174
```

(GitHub Pages supports Range natively, so scrubbing works in production without this.)

## Structure

```
index.html          one-page site
serve.py             range-capable static server (for local video scrubbing)
css/style.css        alpine design system + .scrub sticky-stage component
js/main.js           Lenis smooth scroll + GSAP: video currentTime driven by scroll
assets/img/          Nano Banana Pro stills (hero, team, social grid)
assets/video/        Kling 3 clips (hero pool, spa, ski lift), re-encoded all-intra for smooth seeking
```

## How the scroll-scrub works

Each `[data-scrub]` section is taller than the viewport with a `position: sticky` stage. A GSAP
ScrollTrigger maps the section's scroll progress onto `video.currentTime`, so the footage plays
forward/backward exactly as fast as you scroll — no autoplay loops. Videos are re-encoded with
every frame a keyframe (`ffmpeg -g 1`) so seeking is smooth.

## How the media was made (ComfyUI, driven locally — no browser)

- **Images:** `GeminiImage2Node` → `gemini-3-pro-image-preview` (Nano Banana Pro), 2K.
- **Videos:** `KlingOmniProImageToVideoNode` → `kling-v3-omni`, each hero still fed as the
  reference frame, 5s / 1080p, then all-intra re-encoded (kept at native 1080p) for scrubbing.
- Queued straight against the local ComfyUI HTTP API (`127.0.0.1:8000/api/prompt`) using a
  comfy.org API key — no Chrome bridge. See `scratchpad/comfy_client.py`.

## Notes

All imagery is AI-generated for concept presentation. Region names (Tegernsee, Zugspitze,
Berchtesgaden, Allgäu…) are real; the case-study numbers are illustrative but calibrated to
real luxury-hospitality social benchmarks.
