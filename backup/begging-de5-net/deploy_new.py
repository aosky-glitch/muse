#!/usr/bin/env python3
"""Deploy worker-new.js to Worker cyber-begging (keeps KV binding)."""
import sys, urllib.request, urllib.error
from pathlib import Path
sys.path.insert(0, "/opt/muse/skills/custom-connector-setup/bin")
from dynamic_credentials import add_surrogate_to_request
ACCOUNT_ID = "adce1d3642ba25332cdb5f50a3071503"
BASE = "https://api.cloudflare.com/client/v4"
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args):
        raise RuntimeError("redirect refused")
body = (Path.home() / "workspace" / "0728-site" / "worker-new.js").read_bytes()
req = urllib.request.Request(BASE + f"/accounts/{ACCOUNT_ID}/workers/scripts/cyber-begging", data=body, method="PUT")
req.add_header("Content-Type", "application/javascript")
add_surrogate_to_request(req, "custom.cloudflare", allowed_hosts=["api.cloudflare.com"])
try:
    with urllib.request.build_opener(NoRedirect()).open(req, timeout=60) as resp:
        print("upload status:", resp.status, resp.read().decode()[:500])
except urllib.error.HTTPError as e:
    print("upload status:", e.code, e.read().decode()[:1000])
