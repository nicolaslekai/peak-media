"""Headless ComfyUI client for Peak Media.
Refreshes the comfy.org Firebase token and drives /api/prompt directly (no browser).
"""
import json, time, os, urllib.request, urllib.error, base64

BASE = "http://127.0.0.1:8000"
AUTHDIR = r"C:\Users\nicol\AppData\Local\Temp\claude\C--Users-nicol-Documents-Claude\5ac5158b-a98a-46f9-9ab5-4340e82d5b80\scratchpad\comfy_auth"

# comfy.org API key (durable) â€” billed against Nicolas's account. Preferred path.
COMFY_API_KEY = "YOUR_COMFY_ORG_API_KEY_HERE"

# Fallback: extracted from Comfy Desktop Firebase session
REFRESH_TOKEN = None
API_KEY = None

def _load_creds():
    global REFRESH_TOKEN, API_KEY
    # pull the freshest refresh token + apiKey from copied leveldb
    import re, glob
    refs, keys = [], []
    for f in glob.glob(os.path.join(AUTHDIR, '*')):
        if f.endswith('auth.json') or f.endswith('.py'): continue
        try: txt = open(f,'rb').read().decode('latin-1')
        except: continue
        refs += re.findall(r'"refreshToken":"([A-Za-z0-9_\-]{20,})"', txt)
        keys += re.findall(r'"apiKey":"(AIza[A-Za-z0-9_\-]{20,})"', txt)
    REFRESH_TOKEN = refs[-1] if refs else None
    API_KEY = keys[-1] if keys else None
    return REFRESH_TOKEN, API_KEY

_token_cache = {"tok": None, "exp": 0}

def get_token():
    global REFRESH_TOKEN
    if _token_cache["tok"] and time.time() < _token_cache["exp"] - 120:
        return _token_cache["tok"]
    if not REFRESH_TOKEN:
        _load_creds()
    url = f"https://securetoken.googleapis.com/v1/token?key={API_KEY}"
    data = f"grant_type=refresh_token&refresh_token={REFRESH_TOKEN}".encode()
    req = urllib.request.Request(url, data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"})
    with urllib.request.urlopen(req, timeout=30) as r:
        j = json.loads(r.read())
    tok = j["id_token"]
    _token_cache["tok"] = tok
    _token_cache["exp"] = time.time() + int(j.get("expires_in", 3600))
    # persist newest refresh token
    REFRESH_TOKEN = j.get("refresh_token", REFRESH_TOKEN)
    return tok

def _post(path, payload):
    req = urllib.request.Request(BASE+path, data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())

def _get(path):
    with urllib.request.urlopen(BASE+path, timeout=60) as r:
        return json.loads(r.read())

def queue(workflow, client_id="peakmedia"):
    extra = {"comfy_usage_source": "comfy_desktop"}
    if COMFY_API_KEY:
        extra["api_key_comfy_org"] = COMFY_API_KEY
    else:
        extra["auth_token_comfy_org"] = get_token()
    payload = {"prompt": workflow, "client_id": client_id, "extra_data": extra}
    return _post("/api/prompt", payload)["prompt_id"]

def wait(prompt_id, timeout=900, poll=6, label=""):
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            h = _get(f"/api/history/{prompt_id}")
        except Exception:
            time.sleep(poll); continue
        entry = h.get(prompt_id)
        if entry:
            st = entry.get("status", {})
            if st.get("status_str") == "error":
                for m in st.get("messages", []):
                    if m[0] == "execution_error":
                        raise RuntimeError(f"{label} ERROR: {m[1].get('exception_message','')[:300]}")
                raise RuntimeError(f"{label} failed: {st}")
            if st.get("completed"):
                return entry.get("outputs", {})
        time.sleep(poll)
    raise TimeoutError(f"{label} timed out after {timeout}s")

def download_outputs(outputs, dest_dir, prefix=""):
    os.makedirs(dest_dir, exist_ok=True)
    saved = []
    for node_id, out in outputs.items():
        for kind in ("images", "gifs", "videos"):
            for item in out.get(kind, []):
                fn = item["filename"]; sub = item.get("subfolder",""); typ = item.get("type","output")
                url = f"{BASE}/api/view?filename={urllib.parse.quote(fn)}&subfolder={urllib.parse.quote(sub)}&type={typ}"
                data = urllib.request.urlopen(url, timeout=120).read()
                name = (prefix+fn) if prefix else fn
                p = os.path.join(dest_dir, name)
                open(p, "wb").write(data)
                saved.append(p)
    return saved

import urllib.parse

if __name__ == "__main__":
    r, k = _load_creds()
    print("refresh token:", (r[:20]+"...") if r else None, "| apiKey:", k)
    tok = get_token()
    p = tok.split('.')[1]; p += '='*(-len(p)%4)
    payload = json.loads(base64.urlsafe_b64decode(p))
    print("Fresh idToken minted. exp in", int(payload['exp']-time.time()), "s; iss:", payload.get('iss'))

