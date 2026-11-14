#!/usr/bin/env python3
"""Build the deployable Worker: inject showcase.html into worker.js."""
import json

html = open("showcase.html", encoding="utf-8").read()
src = open("worker.js", encoding="utf-8").read()
assert "__SHOWCASE_HTML__" in src, "placeholder missing"
out = src.replace("__SHOWCASE_HTML__", json.dumps(html, ensure_ascii=False), 1)
open("worker.deploy.js", "w", encoding="utf-8").write(out)
print("built worker.deploy.js,", len(out), "bytes")
