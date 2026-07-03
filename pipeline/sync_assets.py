import json, os, shutil
RENDERS = r"C:\Users\nicol\Documents\Claude\Projects\scroll-cinematic\renders"
IMGDIR  = r"C:\Users\nicol\Documents\Claude\Projects\scroll-cinematic\assets\img"
INPUTDIR = r"C:\Users\nicol\Documents\input"   # ComfyUI input dir for Kling refs
os.makedirs(IMGDIR, exist_ok=True)
m = json.load(open(os.path.join(RENDERS,"manifest.json")))
for key, meta in m.items():
    src = os.path.join(RENDERS, meta["file"])
    dst = os.path.join(IMGDIR, key + ".png")
    shutil.copyfile(src, dst)
    # copy the 3 hero stills into ComfyUI input for Kling reference
    if key.startswith("S"):
        shutil.copyfile(src, os.path.join(INPUTDIR, f"peakref_{key}.png"))
print("synced", len(m), "assets to", IMGDIR)
print("hero refs in input:", [f"peakref_S{i}_*.png" for i in (1,2,3)])
