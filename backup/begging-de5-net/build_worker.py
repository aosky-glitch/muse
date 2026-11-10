#!/usr/bin/env python3
"""Assemble the cyber-begging Worker: blog-as-homepage + API + TEMPLE + WALLPAPER + POSTOFFICE + old homepage at /tip."""
import json
import sys
from pathlib import Path

BASE = Path.home() / "workspace" / "0728-site"
CURRENT = BASE / "worker-current-2026-11-08.js"
NEW_HTML = BASE / "begging-single.html"
WALLPAPER_HTML = BASE / "wallpaper.html"
TEMPLE_HTML = BASE / "temple.html"
POSTOFFICE_HTML = BASE / "postoffice.html"
API_JS = BASE / "worker-api.js"
BLOG_HTML = Path.home() / "workspace" / "blog" / "index.html"
OUT = BASE / "worker-new.js"

NEW_HANDLER = """addEventListener('fetch', event => { const url = new URL(event.request.url); const p = url.pathname; if (p.startsWith('/api/')) { event.respondWith(handleApi(event.request, url)); return; } let html = BLOG; if (p === '/health') { event.respondWith(new Response('ok', {headers:{'content-type':'text/plain'}})); return; } else if (p === '/tip' || p.startsWith('/tip/')) { html = BEGGING; } else if (p === '/blog' || p.startsWith('/blog/')) { html = BLOG; } else if (p === '/simiao' || p.startsWith('/simiao/')) { html = TEMPLE; } else if (p === '/wallpaper' || p.startsWith('/wallpaper/')) { html = WALLPAPER; } else if (p === '/postoffice' || p.startsWith('/postoffice/')) { html = POSTOFFICE; } else if (p !== '/' && p !== '') { event.respondWith(new Response('404 - <a href="/">回首页</a>', {status:404, headers:{'content-type':'text/html;charset=utf-8'}})); return; } event.respondWith(new Response(html, {headers:{'content-type':'text/html;charset=utf-8','cache-control':'public, max-age=300'}})); });
"""

def main():
    lines = CURRENT.read_text(encoding="utf-8").split("\n")
    assert lines[0].startswith("const BEGGING = "), lines[0][:40]
    assert lines[1].startswith("const BLOG = "), lines[1][:40]
    assert lines[2].startswith("const TEMPLE = "), lines[2][:40]
    html = NEW_HTML.read_text(encoding="utf-8")
    blog = BLOG_HTML.read_text(encoding="utf-8")
    wp = WALLPAPER_HTML.read_text(encoding="utf-8")
    tp = TEMPLE_HTML.read_text(encoding="utf-8")
    po = POSTOFFICE_HTML.read_text(encoding="utf-8")
    api = API_JS.read_text(encoding="utf-8")
    new_begging = "const BEGGING = " + json.dumps(html, ensure_ascii=False) + ";"
    new_blog = "const BLOG = " + json.dumps(blog, ensure_ascii=False) + ";"
    new_wallpaper = "const WALLPAPER = " + json.dumps(wp, ensure_ascii=False) + ";"
    new_temple = "const TEMPLE = " + json.dumps(tp, ensure_ascii=False) + ";"
    new_postoffice = "const POSTOFFICE = " + json.dumps(po, ensure_ascii=False) + ";"
    out = "\n".join([new_begging, new_blog, new_temple, new_wallpaper, new_postoffice, api, NEW_HANDLER])
    OUT.write_text(out, encoding="utf-8")
    print("wrote", OUT, len(out), "bytes")

if __name__ == "__main__":
    main()
