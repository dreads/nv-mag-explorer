# NV Magnetometry — Rabi & Zeeman Visualizer

Interactive visualization of an NV-diamond quantum magnetometer: Rabi oscillations, the
Zeeman effect, and Ramsey interferometry. No build step for the app itself, plain static
files — same deploy pattern as [bell-state-explorer](https://github.com/dreads/bell-state-explorer),
which this repo's i18n architecture and deploy workflow were ported from. Companion piece
to a MagNav (magnetic-anomaly navigation) system diagram — see `doc/design/` for the
non-code research behind that framing; it doesn't affect the app's code.

**Read this before assuming the codebase is one uniform thing**: this repo is really two
different code styles wearing one repo. `index.html` follows bell-state-explorer's
convention closely — ES modules, i18n, tested pure functions. `index_rabi.html`,
`index_ramsey.html`, and `index_nv_bloch_golf.html` predate that architecture and remain
single-file, English-only, untested, canvas-rendered instrument panels. Don't assume a
pattern from one half applies to the other — check which file you're in first.

**The backlog lives in GitHub issues** (`dreads/nv-mag-explorer`), not in this file. Run
`gh issue list` before assuming what's tracked vs. only described here — this file
explains *why* things are the way they are; issues track *what's next*. Issue #18 (turn
`index.html`'s hand-copied nav cards into a data-driven catalog) is resolved — see
"Visualizer catalog" below for the `src/catalog.js` shape that replaced it. Issue #19
(bring `index_rabi.html`/`index_ramsey.html`'s accessibility up to
`index_nv_bloch_golf.html`'s baseline) is still open.
`index_nv_bloch_golf.html` (Bloch golf, a gate-navigation puzzle on the same Bloch sphere)
is the third peer visualizer, now a generated `src/catalog.js` entry like the other two
rather than the hand-added nav card it started as.

**Unresolved naming inconsistency, observed 2026-08-12, not normalized either
direction**: the repo/README call this project "NV Magnetometry," but
`index_nv_bloch_golf.html`'s `<title>`/`<h1>` say "NV Single Qubit Explorer" — a same-day
hand-edit, not something from an earlier session. Could be the start of a deliberate
rebrand (golf isn't about magnetometry at all, so a broader name would make sense as the
catalog grows) or just a one-page wording choice. Don't silently pick one and propagate it
— ask, or check for a GitHub issue about it first.

## Running locally

```bash
npm run serve   # serves on http://localhost:8000
npm test        # i18n engine + locale-bundle shape tests (index.html only, see below)
npm run lint:i18n
npm run screenshot -- <url> <out.png>   # real headless-Chrome screenshot, see .claude/skills/run/
```

**A `PostToolUse` hook in `.claude/settings.json` runs `npm test && npm run lint:i18n`
automatically whenever `index.html`/`locales/*`/`src/*` are edited via this tool** (blocks
on failure, exit 2, output fed back) — added 2026-08-12 after the content-drift bug (see
below) recurred once too often. Manual `npm test`/`lint:i18n` runs are still fine/harmless,
just redundant with the hook for those paths.

**`npm run screenshot`** (`scripts/screenshot.mjs`, driven by the `puppeteer-core`
devDependency + system Chrome) takes a real browser screenshot — use it, and read the
result with the `Read` tool, instead of trusting structural/`curl`-only checks for any
visual change. `.claude/skills/run/SKILL.md` has the full usage/gotchas; this exact
capability had been built ad hoc and lost across at least two earlier sessions before
being captured as a committed script + skill.

The physics-verification suite (`verify/`) is Python, not part of `npm test`:

```bash
python3 --version   # needs 3.10+ for QuTiP 5.x — check before the next line
pip install -r verify/requirements.txt
pytest verify/ -q
python verify/make_report.py   # writes verify/report.json (gitignored, regenerated)
```

The system default `python3` on the machine this was built on is 3.7 (too old — `pip
install` will fail or, worse, half-succeed with a broken environment). A working
interpreter was found via Homebrew at `/usr/local/opt/python@3.11/bin/python3.11`; if
`python3 --version` on whatever machine you're on is also too old, look for a similarly
Homebrew/pyenv-installed newer interpreter rather than assuming the environment is broken.

## File structure

```
index.html                              "Why Ramsey?" explainer + visualizer nav — the repo's front door; i18n'd, modular, tested
index_rabi.html                         Rabi/Zeeman visualizer — single-file, canvas-rendered, English-only, untested
index_ramsey.html                       Ramsey interferometry visualizer — same style as index_rabi.html
index_nv_bloch_golf.html                Bloch golf — gate-navigation puzzle, same style as the two above, with a baseline a11y pass (see "Accessibility" below)
src/app.js                              index.html's render/locale wiring, catalog render + spotlight logic — NOT used by the three visualizer pages
src/catalog.js                          single source of truth for index.html's nav cards + hero spotlight panel — see "Visualizer catalog" below
src/i18n.js                             translate()/getPath()/interpolate() — ported verbatim from bell-state-explorer
src/locale-loader.js                    locale discovery/fetch, fetch injectable — ported verbatim from bell-state-explorer
src/styles.css                          index.html's stylesheet only — the visualizer pages have their own inline <style>
locales/en.json                         source-of-truth English bundle for index.html's strings (fetched, no static .js copy)
locales/manifest.json                   picker option list only — not used for detection
locales/qaa.json, qab.json, qac.json    mock/test-only locales, commented out by default in manifest.json
schema/locale-bundle.schema.json        JSON Schema (draft 2020-12) for PR-contributed locale bundles — scoped to index.html's sections only
scripts/check-i18n-coverage.js          npm run lint:i18n — scans index.html + src/*.js only, wired into deploy.yml
test/i18n.test.js                       tests for i18n.js's lookup/fallback/interpolation
test/locale-loader.test.js              tests for locale-loader.js (candidate expansion, fetch orchestration)
test/locale-bundles.test.js             shape-validates every locales/*.json bundle
verify/                                 Python + QuTiP cross-check of the closed-form physics — see its own section below
.github/workflows/deploy.yml            npm test + lint:i18n, then deploy to GitHub Pages
.github/workflows/physics-verification.yml   pytest verify/ on changes to the visualizer HTML or verify/** — independent of deploy
doc/bloch_rabi.jpg, doc/bloch_ramsey.jpg     reference screenshots only — not referenced by src/catalog.js (Rabi's and Ramsey's spotlights are both videos now)
doc/bloch_golf.jpg                      spotlight image for the golf catalog entry AND src/catalog.js's DEFAULT_SPOTLIGHT (the hero panel's no-hover/no-focus default) — captured via `npm run screenshot -- <url> <out> --selector=#id`
doc/media/bloch-sweep.mp4               Rabi catalog entry's spotlight video — captured live from index_rabi.html, not a rendered mockup; shown only when the Rabi card is hovered/focused, not by default
doc/media/ramsey.mp4                    Ramsey catalog entry's spotlight video — remuxed from a supplied doc/media/ramsey.mov (already H.264, so a container-only conversion via ffmpeg, no re-encode); same hover/focus-only visibility as bloch-sweep.mp4
doc/design/                              mostly non-code MagNav story/verification research that doesn't affect the app, but also holds a couple of UI mockups that directly did: vector_indicator.png and aggregator.jpg were reference sketches for Bloch golf's travel-direction arcs and Qiskit circuit panel respectively — check a given file's actual use before assuming everything here is inert
```

## Architecture

### index_rabi.html, index_ramsey.html, index_nv_bloch_golf.html (self-contained, no modules)

Each is a single `<!DOCTYPE html>` file: its own inline `<style>` block (a dark
instrument-panel palette redeclared per file, not shared — see "Known duplication"
below), a global mutable state object (`S` for rabi/ramsey; a set of closured `let`s for
golf), a handful of draw functions called every `requestAnimationFrame` tick against one
or more `<canvas>` elements, and drag/slider/button event wiring at the bottom. There is
no build step and nothing here is an ES module — everything lives in one `<script>` tag
per file.

**Issue #28**: each of the three now opens with a slim `.back-nav` link
(`← Explore the visualizers`, styled small/muted with each page's own existing color
tokens) as the first element inside `.wrap`, before `<header>` — the only way back to
`index.html` from a visualizer page before this was the browser's own back button. Added
independently to each page (same markup/CSS pattern copied three times), consistent with
these three files having no shared module. The existing `<h1>`/description text on each
page was deliberately left alone — it's real explanatory content, not filler to trim.

**index_rabi.html** — five canvases (`bench`, `rabi`, `bloch`, `levels`, `odmr`):
- `fieldAtDistance(d)` — `S.polarity * S.sens * B_COEFF / (d*d*d)`, the dipole field
- `recompute()` — derives `fRes`/`fResMinus`/`det` (detuning) from `S.dist`/`S.mw`
- `drawRabi(det)` — the generalized-Rabi population curve, see "Physics conventions" below
- `drawBloch(rb, det)` — Rodrigues-rotation Bloch vector, exact unitary solution of the same Hamiltonian `drawRabi` uses
- `drawLevels`/`drawODMR` — Zeeman-split energy levels and the two-Lorentzian ODMR dip (the ODMR width/contrast numbers are a hand-tuned demo heuristic, not derived from a rate equation — see `verify/README.md`)

**index_ramsey.html** — four canvases (`seq`, `fringe`, `terrain`, `bloch`):
- `detuning()`/`detMHz()` — same Zeeman/detuning math as index_rabi.html, duplicated not shared
- `blochVec(u)` — Bloch vector at normalized sequence position `u`: RY(π/2) → free-Z-precession by `phi=d*tau*frac` → RY(π/2), matching the circuit drawn in the `.circwrap` markup
- `drawFringe()` — the Ramsey population formula, see "Physics conventions" below
- `fieldAt(x)`/`heightAt(x)` — a fixed sum-of-sines "terrain" standing in for crustal field strength along a route; explicitly illustrative, not tied to any real survey data

**index_nv_bloch_golf.html** — one canvas (`stage`), a gate-navigation puzzle rather than a
continuously-driven signal: `newHoleImpl()` picks a random reachable target Bloch vector by
composing 2–5 random gates from `GATES` (`X`/`Y` at 90°/180° about the drive frame, `Z` at
90° about the true N–V bond axis); `solve(from, to)` is a breadth-first search over the
same five gates, at their exact canonical (world-frame) angles, that both sets `par` and
powers "Show a solution"; `pulse(axis, deg)` / `applyGate` animate the chosen rotation with
an eased tween, not an instant jump. It arrived as a pasted Claude-Artifact export
(fragment only, no `<!DOCTYPE>`/`<head>`, an unloaded Tabler Icons font dependency, and CSS
custom properties referenced but never defined) and was wrapped into a proper standalone
page plus given a baseline accessibility pass — see "Accessibility" below for exactly what
changed and what's still worth revisiting.

Two deepenings of the golf analogy landed later (GitHub issues #14/#15), without adding a
6th gate or touching `GATES`/`solve()`/par:
- **Clubs (#14)**: `CLUBS` groups the same 5 gates into driver (`X`/`Y·π`, the two 180°
  gates) and putter (`X`/`Y`/`Z·π/2`, the three 90° gates) — a relabeling for the
  UI/tooltips, not new physics. An earlier three-tier version split `X`/`Y·π/2` into its
  own "iron" class, separate from `Z·π/2`'s "putter"; that tier was dropped as an
  unnecessary distinction — 90° is 90° regardless of which axis it's about, so all three
  90° gates are just "putter" now. Verified numerically (composing the actual rotation
  matrices) before landing club identity at all: the current 5-gate set keeps the ball
  confined to exactly 6 points on the sphere (the octahedral rotation group) no matter how
  many moves are made, which is *why* `solve()`'s BFS/par/exact win check all work — adding
  literally any other angle (tried `Y·60°`, `Y·45°`, `Y·120°`) blows the reachable set past
  5,000 distinct points almost immediately. That's the actual reason club identity comes
  from regrouping the existing 5 gates rather than adding new angles for a "putter."
- **Player figure (#15)**: a vague, semi-transparent grey silhouette (`drawPlayer()`,
  called from `render()`) standing at `vPos` (the same point the sphere-center marker
  uses), upright and fixed in screen space regardless of the drag-to-rotate camera — a 2D
  "billboard," not a real 3D-posed body, since this hand-rolled canvas renderer has no
  proper limb/mesh system. Only its arm+club line rotates, toward the same projected
  `driveAxis('X')` point the pink drive-axis line is drawn from, so it visibly re-aims
  exactly when that line does.
- **Travel-direction arcs** (also #15/#14 follow-up, per `doc/design/vector_indicator.png`):
  `drawTravelArc(axis)`, called once each for X, Y, and Z, draws a short curved arrow at
  the ball tangent to the great-circle path that axis's gate would carry it along —
  computed as `axis × ball position`, sampled with the existing `rotAxisV()` and the same
  `frameToWorld()`/`project()` pipeline everything else uses. Each arc hides itself when
  the cross product is ~0 (ball sits on that axis, so the gate would be a no-op from
  there) — generalized to all three axes, not special-cased for Z even though Z-at-a-pole
  (holes start there) is the case that comes up most.

**Issue #10 (Qiskit circuit aggregator)**: a panel below the canvas+sidebar row (matching
`doc/design/aggregator.jpg`'s marked location) shows a live-updating, copy-pasteable Qiskit
circuit — `qiskitLineFor(axis, deg, phaseAtPress)` maps one stroke to one gate-call line,
pushed into a `circuitLines` array from inside `applyGate()` itself (the single choke point
both manual clicks and `playSolution()`'s "Show a solution" autoplay already go through, so
the solving sequence appearing in the circuit is free — no special-casing needed) and popped
in `undo()`, reset in `newHoleImpl()`. `renderCircuit()` rebuilds the `<pre>` from
`circuitLines` after each of those three. Gate mapping: `Z` is always `qc.s(0)` (matches the
game's own phase-independent treatment of the putter's Z gate); `X`/`Y` use the friendly
named gate (`qc.x`/`qc.sx`/`qc.y`/`qc.ry(np.pi/2, ...)` — no standard named √Y gate in
Qiskit, hence `ry`) **only when the phase dial itself reads 0**, since that's the one
reading where `driveAxis()`'s constructed axis matches the world-frame `X`/`Y` `solve()`/
`rotP0()` assume (`driveAxis('Y')` bakes in a +90° offset already, so checking the axis
*angle* against 0 instead of checking `phase` itself is the wrong condition for Y — this was
a real bug caught by testing "Show a solution," which resets the dial to 0 before replaying
and kept getting the general-gate fallback for every Y step until the phase-based check
replaced the axis-angle-based one). Any other phase reading falls back to Qiskit's general
`qc.r(theta, phi, 0)` gate (rotation by `theta` about `cos(phi)X + sin(phi)Y`) with the true
axis angle, so the exported circuit stays correct rather than silently wrong whenever the
dial was actually turned. Copy button uses `navigator.clipboard.writeText()` with a
silent-catch fallback (no UI for unsupported browsers) — note for future testing: headless
Chrome via CDP denies clipboard writes even after `overridePermissions` (`NotAllowedError`,
reproduced under both legacy and `headless:'new'` launch modes) — a known automation
limitation, not a sign the button is broken; verify this one by hand in a real browser
rather than trusting a headless script's clipboard read-back.

**Issue #16 (terrain/wind noise) was implemented and then reverted, on this same pass.**
A fixed per-hole `terrainOffset` (disclosed exactly) and `windMagnitude` (disclosed as a
Calm/Breezy/Gusty label, exact per-swing jitter hidden) fed into `driveAxis()`, affecting
only the phase-driven X/Y gates (not `Z`), with `applyGate()`'s `ignoreNoise` flag keeping "Show a solution" exact
regardless — stress-tested across 25 randomized holes with no failures, so the mechanism
itself worked as designed. It was reverted anyway after real playtesting: starting a hole
already offset by terrain (e.g. drive axis at "15°" for no visible reason) read as
confusing rather than as a puzzle element, and the fidelity-percentage win condition made
"very close but not quite" (e.g. stuck at 99% match) a frustrating dead end rather than a
near-miss. If this is revisited, both of those UX problems — not just the underlying
math — need an answer, not only a correctness argument. Full historical detail (the design
reasoning, the safety-net analysis, the numeric verification) is in this file's git history
around the two commits that added and then reverted it, not repeated here.

All three pages predate the i18n work and are **not** wired into
`scripts/check-i18n-coverage.js` or any locale bundle — they remain English-only
single-file pages by design (see README's i18n/l10n/a11y section).

### Accessibility (status per page — read before assuming parity)

- **index.html**: the hero panel's `<video>`/`<img>` (the "spotlight," swapped by
  `setSpotlight()` in `src/app.js` as the visitor hovers/focuses a nav card) are both
  `aria-hidden="true"` — decorative, same convention as bell-state-explorer's SVG visuals.
  Its caption `<p aria-live="polite">` is the accessible equivalent, doubling as the visible
  caption; `setSpotlight()` updates its `textContent` on every hover/focus change, so a
  screen-reader user gets an equivalent announcement to what a sighted/mouse user sees.
  index.html no longer has any SVG visual (the Rabi-vs-Ramsey timeline diagram that used to
  need its own `aria-hidden`+`.sr-only` treatment was removed in the catalog refactor).
  Ramsey's card also uses a native `<details><summary>` disclosure for its
  `glossaryNote`-flagged note/detail pair (see "Visualizer catalog" below) — deliberately
  chosen over a floating tooltip/popover specifically because `<details>` gives correct
  keyboard operability (Enter/Space on the focused `<summary>`) and screen-reader
  expanded/collapsed semantics natively, with zero custom ARIA; `src/app.js` only adds
  `mouseenter`/`mouseleave` to toggle `.open` for mouse users, layered on top of that native
  behavior rather than replacing it.
- **index_nv_bloch_golf.html**: brought to a baseline pass — `<canvas id="stage">` is
  `aria-hidden="true"`; a `.sr-only` paragraph carries the original detailed description of
  the scene (vacancy site, lattice, target) and a separate `#golf-status`
  `.sr-only`/`aria-live="polite"` paragraph is updated every `updateHUD()` call with the
  current hole/par/strokes/match state; the win banner (`#win-banner`) is
  `role="status"`/`aria-live="polite"` so "holed out" is announced, not just shown; the
  `#phase` range input now has a real `<label for="phase">` (it didn't before); the two
  icon-only buttons (`undo`/`newHole`) that depended on an unloaded Tabler Icons font now
  use inline `aria-hidden` unicode glyphs (↺/↻) next to their existing visible text instead
  — removing an external font dependency this dependency-free repo was never supposed to
  have, not just an accessibility fix. **Not done**: no keyboard equivalent for the
  drag-to-rotate view control (the puzzle itself is fully solvable via the button controls
  without it, so this is a lesser gap); button `title` tooltips (phase-relative pulse
  descriptions) aren't exposed to assistive tech beyond their base visible label.
- **index_rabi.html / index_ramsey.html**: **still no `aria-hidden`/`sr-only`/`role`
  attribute anywhere** — this was true before the golf work and remains true; bringing
  these two up to the same baseline as golf is tracked as GitHub issue #19, not done here.
  Don't assume golf's pass means the other two got one too.

### index.html + src/app.js / i18n.js / locale-loader.js

This trio follows bell-state-explorer's i18n architecture closely, with one deliberate
deviation documented in the README: **no static `locales/en.js` copy**. Most of this page
has no model or `render()` — every other `[data-i18n]` element's static HTML text already
*is* the correct default-English render — so `en.json` is fetched lazily via
`ensureEnglish()`, the same way every contributed locale is, rather than shipped as a
duplicate JS module. `src/i18n.js` and `src/locale-loader.js` are otherwise ported
verbatim.

**The one exception, since the issue #18 catalog refactor**: the nav cards and hero
spotlight panel *do* have a render step now — `renderCatalog()`/`setSpotlight()` in
`src/app.js`, driven by `src/catalog.js`. This is a deliberate, issue-endorsed tradeoff
against the "zero JS for the English default" property above, scoped narrowly: a no-JS
visitor sees an empty nav (the `#catalog-cards` mount div renders nothing without JS), but
still sees a correct default spotlight panel (its `<img>`/caption keep a static HTML seed —
a Bloch golf still + `ui.toolboxCaption`, see "Visualizer catalog" below) and every other
part of the page. It is *not* a new network dependency — `src/app.js` builds a
`catalogFallback` object synchronously from `src/catalog.js`'s own English literals at
module load, so the catalog still needs no `en.json` round-trip to render correctly, only
JS execution. See `src/catalog.js`'s top comment and the "Visualizer catalog" section below
for the full shape.

`applyLocale(bundle)` (walk `[data-i18n]`, set `document.title`/meta description specially)
plus the picker wiring covers everything else — including the generated catalog cards,
since `renderCatalog()`/`setSpotlight()` tag every element they create with `data-i18n`
too, so they're picked up by `applyLocale()`'s existing generic sweep with no special-casing
needed there.

**Static HTML in `index.html` is authoritative over `locales/en.json` — not the other way
around** (one carve-out: the nav-card/spotlight text that used to live in `index.html`'s
static markup now lives in `src/catalog.js`'s literals instead, since the catalog refactor
moved it out of the HTML entirely — `src/catalog.js` is authoritative for that text
specifically, `scripts/check-i18n-coverage.js` enforces both halves independently). When a `[data-i18n]` element's visible text in `index.html` and its matching
`locales/en.json` string disagree, sync the JSON to the HTML. This isn't a hypothetical —
it happened live during this repo's Bloch-golf work (`ui.navGolfNote` was hand-edited in
`index.html` but the matching `en.json` key wasn't updated to match) and had happened
before that too. **As of 2026-08-12, `npm run lint:i18n` DOES catch this** — after the
second occurrence, `scripts/check-i18n-coverage.js` gained a content-diff check
(normalizes whitespace/entities, compares every `data-i18n` element's text against
`locales/en.json`'s value for that key, fails the build on any mismatch) specifically so
this stops being a manual discipline. If you're reading this and the check has since been
removed or weakened, that's worth noticing — it exists because the alternative (relying on
memory/vigilance) already failed twice. A default-English visitor still sees only the HTML
at runtime (`en.json` is fetched lazily, see above) — the check is what makes drift
visible at commit time instead of only when someone switches locales or falls back per-key.

### verify/ — physics cross-check (QuTiP, Python)

Not part of the deployed app; a separate, CI-gated correctness check for the closed-form
formulas in `index_rabi.html`/`index_ramsey.html`. This is nv-mag-explorer's answer to
the question bell-state-explorer answers with `test/state.test.js`'s 100%-math-coverage
Node unit tests — but the *mechanism* is different, described accurately below rather
than glossed as equivalent.

- `closed_form.py` — pure-Python transcription of the JS formulas, each function citing
  the exact source line(s) it mirrors
- `qutip_reference.py` — the ground-truth Lindblad master-equation simulation
  (`qutip.mesolve`/`qutip.steadystate`) for the same two-level model
- `test_physics.py` — pytest comparison suite, including a **source-canary** test that
  regex-pins literal snippets of the shipped JS and fails loudly if the HTML math changes
  without `closed_form.py` being updated to match — the closest thing this project has to
  bell's "keep the port in sync" discipline, since there's no shared module to import
- `make_report.py` — writes `verify/report.json` (gitignored, regenerated) with
  overlay curves and error grids
- `verify/README.md` — the findings: the Rabi/Ramsey population formulas match a full
  Lindblad simulation, but the Rabi visualizer's `×exp(-t/T2*)` damping envelope is a
  real, sizeable approximation (true resonant decay is `1/(2T2*)`, not `1/T2*`, and the
  true dynamics settle toward a mixed steady state rather than decaying to zero) — read
  it before changing any T2*/dephasing-related code, so a "fix" doesn't reintroduce a gap
  that was already characterized on purpose

Runs via `.github/workflows/physics-verification.yml`, triggered only on changes to
`index_rabi.html`, `index_ramsey.html`, or `verify/**` — independent of and does not gate
`deploy.yml`.

## Visualizer catalog

Resolved via GitHub issue #18 — this section is the context an issue title won't carry.
Before this, adding Bloch golf as the third nav entry meant touching three files by hand in
lockstep: the `<div class="card">` markup in `index.html`, `locales/en.json` (new
`navGolfLabel`/`navGolfNote`/`golfIntro.*` keys), and `schema/locale-bundle.schema.json`.

**Now**: `src/catalog.js` exports one `CATALOG` array, one object per visualizer, array
order is display order (currently golf, ramsey, rabi) — `id`/`href`/`label`/`note`/`detail`
(each with a literal English string and its `locales/en.json` key) plus a `spotlight`
(media type/src/caption for the hero panel — see "index.html + src/app.js" above).
`src/app.js`'s `renderCatalog()` builds the nav cards from it and `setSpotlight()` swaps
the hero panel's media/caption on hover or focus of a card. **To add a fifth visualizer**:
append one entry to `src/catalog.js` — that alone is enough for a correct English render.
`schema/locale-bundle.schema.json`'s `catalog` section uses `patternProperties` (any
`^[a-z][a-z0-9_-]*$` id), so it never needs a per-visualizer edit. A `locales/*.json`
translation is optional and can land whenever a translator gets to it — same "partial
bundles are fine, fall back per-key" philosophy as everything else here.
`scripts/check-i18n-coverage.js` fails the build if `src/catalog.js`'s literals and
`locales/en.json`'s values for the same keys ever drift apart, the same invariant the
static-HTML content-diff check already enforced for the rest of the page.

`src/catalog.js` also exports `DEFAULT_SPOTLIGHT` (same shape as an entry's `spotlight`,
keyed under `ui.toolboxCaption` rather than `catalog.*` since it's page-level chrome, not
about one visualizer) — shown when nothing is hovered/focused, so the hero panel doesn't
default to one visualizer over the others. Currently a Bloch golf still (`doc/bloch_golf.jpg`,
also golf's own catalog spotlight image — two different uses of the same file) with a
generic "this is a toolbox" caption.

An entry can set `glossaryNote: true` (currently just `ramsey`) to have `renderCatalog()`
render its note/detail as a `<details><summary>` disclosure instead of an always-visible
`<span>`+`<p>` — see the Accessibility section above for the a11y mechanics. This exists
because Ramsey's card needed a short one-line analogy up front with its longer mechanical
explanation available on demand rather than always taking up card space; any future entry
needing the same treatment just sets the same flag, no new plumbing required.

The Rabi-vs-Ramsey drive-timeline SVG comparison that used to sit below the nav cards was
**removed**, not folded into the catalog — Bloch golf's shape (a discrete puzzle) never fit
that two-way diagram, and generalizing a fixed A-vs-B comparison to an N-entry catalog
didn't have an obvious right answer, so it was dropped rather than force-fit.

`index.html`'s `<footer>` (a "Physics" note + a companion-piece note, `footer.physicsNote`/
`footer.companionNote`) was also removed outright, not relocated — the physics summary it
carried was redundant with `index_rabi.html`/`index_ramsey.html`'s own footers, and the
companion-piece framing didn't earn its keep as permanent page furniture. If you're looking
for the Ramsey coherence-budget explanation this used to gesture at, it's the `detail` text
on Ramsey's card (`catalog.ramsey.detail` — see above) and, in more compact form, appended
to `index_ramsey.html`'s own `<footer>`.

Rabi/Ramsey accessibility parity (issue #19) is independent of this refactor and remains
open — see "Accessibility" above for the exact baseline to match.

## Physics conventions

- Zero-field resonance `F0 = 2.87` GHz, `GAMMA = 28.0` MHz/mT — duplicated as literals in
  both index_rabi.html and index_ramsey.html, not shared
- Zeeman split: `f± = 2.87 GHz ± γB`
- Generalized Rabi: `Ω = √(Ω₀² + δ²)`, `P(t) = (Ω₀²/Ω²)·½(1−cos Ωt)·e^(−t/T₂*)` —
  the coherent part (no T2*) is an exact solution of `H=(δ/2)σz+(Ω₀/2)σx`, verified
  against QuTiP to ~1e-8; the `×e^(−t/T₂*)` envelope is a stylized approximation, verified
  and characterized (not just assumed) in `verify/`
- Ramsey: `P(τ) = ½(1+cos δτ)·e^(−τ/T₂*)` (blended with a decay-to-0.5 term in the actual
  code) — this one **is** the exact Lindblad solution when dephasing is confined to the
  free-evolution window, per `verify/`
- Dipole field vs. distance: `B(d) = B₀/d³` — real 1/d³ shape, `B₀`/`B_COEFF` is an
  arbitrarily tuned demo constant, not a characterized real magnet
- Two-level model only: no hyperfine triplet, no explicit laser-pumping rate equations.
  `verify/` proves this last omission isn't cosmetic — a real CW ODMR dip is
  mathematically impossible from this model's own stated decay channel (T2* dephasing
  alone) without an (unmodeled) population-relaxation channel standing in for the laser

## Known duplication (not yet unified — don't "fix" without checking first)

- **Four separate stylesheets** for a shared dark palette: `src/styles.css` (index.html),
  index_rabi.html and index_ramsey.html's own inline `<style>` blocks (`--bg`/`--panel`/
  `--ink`-style token names), and index_nv_bloch_golf.html's inline `<style>` block, which
  uses yet a **third naming scheme** (`--surface-1`/`--text-primary`/`--border`/`--radius`,
  inherited from wherever it was exported from) mapped by hand to the same color values
  rather than renamed to match its two peers. The palettes are visually consistent by
  hand-copying values, not by a shared file or CSS custom-property import — a color tweak
  in one does not propagate to the others. Unifying the token *names* (not just the
  values) across all three visualizer pages is a reasonable target for whenever the
  catalog refactor above touches these files anyway — not attempted here to keep the golf
  fix gentle/targeted.
- **Zeeman/detuning math** (`F0`, `GAMMA`, the `f±` formula) is written out independently
  in index_rabi.html and index_ramsey.html rather than factored into a shared module —
  consistent with both pages being deliberately dependency-free single files.
- **No shared export/state-persistence feature** — unlike bell-state-explorer, there is
  no "download state as JSON" or "export as a runnable circuit" feature anywhere in this
  repo; don't assume `schema/`'s only file (`locale-bundle.schema.json`) has a sibling for
  app state, because it doesn't.

## Code conventions

- **Readability is a standing requirement, not a one-time cleanup pass — applies repo-wide,
  not just JavaScript.** One statement per line (no dense `;`-chained one-liners), and a
  comment on anything non-obvious (a physics formula, a canvas-drawing step, a coordinate
  transform, a workaround). This applies to every language in this repo: the JS in
  `index.html`/`src/*.js` and in the three visualizer pages, the Python in `verify/`, CSS,
  build/lint scripts — all of it. Issue #17 brought `index_rabi.html`, `index_ramsey.html`,
  and `index_nv_bloch_golf.html` up to this bar once already (see git history around
  2026-08-12, commit "Add accessibility baseline to Rabi/Ramsey and reformat all three
  visualizer scripts") specifically because their embedded `<script>` blocks had drifted
  into unreadable chained-statement canvas code. Don't let new code — including new
  canvas-drawing blocks added to those same three files — drift back into that style; write
  it readable the first time instead of leaving it for a future cleanup pass. This rule
  does not conflict with those three pages' other documented constraints (no modules, no
  external dependencies, deliberate per-page duplication of shared formulas) — readability
  is about formatting and comments, not architecture.

- `index.html`'s stack: vanilla ES modules, no transpilation, Node's built-in `assert` for
  tests (`node --test`), no framework — same as bell-state-explorer.
- `index_rabi.html`/`index_ramsey.html`/`index_nv_bloch_golf.html`: no modules, no
  classes, one global state object/closure per file, canvas 2D drawing
  (`ctx.fillRect`/`ctx.arc`/etc.), not SVG — a deliberately different style from
  index.html and from bell-state-explorer's SVG-via-`createElementNS` convention. Don't
  port one page's rendering approach into the other.
- **No JS unit tests for the physics/puzzle math** in any of the three visualizer pages —
  the formulas/gate logic live inline inside draw/game functions, not exported as pure
  functions, so there's nothing for `node --test` to import. For Rabi/Ramsey, correctness
  is instead the job of `verify/`'s Python/QuTiP suite (see above); Bloch golf's `solve()`
  BFS and rotation math have no independent cross-check at all yet. If you extract a
  formula into a standalone JS function for some other reason, that would be the moment to
  also add a Node unit test for it, matching bell's "always test math" rule — but that
  extraction hasn't happened yet, so don't assume it has.
- **No external dependencies, including web fonts/icon fonts** — this was already the
  project's stated principle (README's "Why no Python") but was violated by
  index_nv_bloch_golf.html's Tabler Icons (`ti ti-*`) classes on arrival (the font was
  never actually loaded anywhere, so the icons silently rendered as nothing). Fixed by
  replacing them with inline `aria-hidden` unicode glyphs next to the buttons' existing
  visible text. Keep this in mind if you paste in another Artifact export — check for
  icon-font classes, CDN `<link>`/`<script>` tags, and undefined CSS custom properties
  before wiring it into this repo.
- **Never hardcode a user-visible string in `index.html`** — same non-negotiable rule as
  bell-state-explorer: `data-i18n="namespace.key"` for static HTML, `t(key, params)` for
  anything computed at render time, `data-i18n-exempt` for deliberate exceptions. **This
  rule does not extend to `index_rabi.html`/`index_ramsey.html`/`index_nv_bloch_golf.html`**
  — they are English-only by design and contain plenty of hardcoded strings;
  `npm run lint:i18n` does not scan them and never has.
- `verify/`'s Python: no classes, module-level functions, pytest with parametrized grids
  rather than a custom test runner — the closest Python equivalent to the property-based/
  grid-sampling style bell-state-explorer's JS tests use for physics invariants.

## Writing conventions

- Never use the phrase "full stop" in prose (docs, PRs, commit messages, chat) — rephrase
  or just end the sentence with a period.
- Avoid use of "sharp edge" in prose to describe risk (docs, PRs, commit messages, chat).
- PR descriptions: terse, neutral voice — no marketing language, no "This PR..."
  throat-clearing, state what changed and why in as few words as accurate. When the branch
  turned up real bugs or was verified locally beyond `npm test`/`lint:i18n`, give those
  their own `## Bugs found` / `## Local verification` sections rather than folding them
  into the summary.
