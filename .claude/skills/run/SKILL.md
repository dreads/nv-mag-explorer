---
name: run
description: Launch and screenshot nv-mag-explorer's static pages (index.html, index_rabi.html, index_ramsey.html, index_nv_bloch_golf.html) via a real headless Chrome, driven by puppeteer-core. Use whenever asked to run, preview, or visually verify a change to this app instead of relying on structural/curl-based checks alone.
---

# Running & screenshotting nv-mag-explorer

This is a zero-build static site — `npm run serve` is enough to view it, but *seeing*
it requires a browser. This project has a working, tested path to real screenshots;
use it instead of re-discovering browser tooling from scratch (this has been solved
and lost at least twice before — see CLAUDE.md's Known duplication/history notes).

## Prerequisites (already set up in this repo)

- `puppeteer-core` is a devDependency (`npm install` pulls it in) — deliberately
  `-core`, not full `puppeteer`, so no ~200MB bundled Chromium download; it drives
  whatever Chrome/Chromium is already on the machine.
- `scripts/screenshot.mjs` finds Chrome at the usual install paths (macOS: `/Applications/Google
  Chrome.app/...`; Linux: `/usr/bin/google-chrome` or `/usr/bin/chromium*`) or via a
  `CHROME_PATH` env var override. It reports console errors (via `page.on('console'/'pageerror')`)
  and exits 2 if any occurred, even though the screenshot is still written — check exit
  code, don't just eyeball the PNG.

## Steps

1. Start the server and wait for it to actually respond (don't `sleep`, poll):
   ```bash
   npm run serve &
   for i in $(seq 1 20); do curl -sf http://localhost:8000/ >/dev/null && break; sleep 0.5; done
   ```
2. Screenshot the page(s) you touched:
   ```bash
   npm run screenshot -- http://localhost:8000/index.html /tmp/index.png
   npm run screenshot -- http://localhost:8000/index_nv_bloch_golf.html /tmp/golf.png --wait=800
   ```
   `--wait=N` (ms, default 400) pads after `networkidle0` before capturing — bump it for
   pages with a settle-in animation (Bloch golf's lattice/sphere, the Rabi/Ramsey canvases'
   `requestAnimationFrame` loops benefit from ~800ms).
3. **Read the screenshot** (the `Read` tool displays PNGs directly) — a written file is not
   proof of a correct render, look at it.
4. Stop the server: `lsof -ti:8000 -sTCP:LISTEN | xargs -r kill`

## Known-benign console noise

Every page 404s on `/favicon.ico` (Chrome auto-requests it; the repo defines no favicon
anywhere) — not a regression, don't chase it unless asked to add a favicon.

## Gotchas

- `screenshot.mjs` is a plain ESM script and must be run with Node's module resolution
  seeing this repo's `node_modules` — run it via `npm run screenshot --` or `node
  scripts/screenshot.mjs` from the repo root, not copied elsewhere.
- The installed Node on this machine (18.8 at time of writing) is below puppeteer-core's
  stated `>=20` engine requirement — `npm install` prints `EBADENGINE` warnings but the
  package still installs and works for basic `launch`/`goto`/`screenshot`. If a future
  puppeteer-core version stops working under an old Node, that's the first thing to check.
- No `chromium-cli` tool is installed in this environment, and this project's Node is too
  old for `npx playwright`. `puppeteer-core` + system Chrome is the path that's actually
  been verified to work here — don't spend time re-trying those two first.
