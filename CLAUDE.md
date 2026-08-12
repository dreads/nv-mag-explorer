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

**Where this is headed**: `index.html` is planned to become a data-driven catalog of
educational NV-center visualizers, not a hand-maintained "Why Ramsey?" page with a
hardcoded two- (now three-) card nav. `index_nv_bloch_golf.html` (Bloch golf, a
gate-navigation puzzle on the same Bloch sphere) was added as the third peer visualizer
ahead of that refactor — its nav card in `index.html` is marked with an HTML comment as an
interim, hand-added entry to be replaced once the catalog scheme exists. See "Planned:
visualizer catalog" below before adding a fourth visualizer by hand-copying that pattern
again.

## Running locally

```bash
npm run serve   # serves on http://localhost:8000
npm test        # i18n engine + locale-bundle shape tests (index.html only, see below)
npm run lint:i18n
```

The physics-verification suite (`verify/`) is Python, not part of `npm test`:

```bash
pip install -r verify/requirements.txt
pytest verify/ -q
python verify/make_report.py   # writes verify/report.json (gitignored, regenerated)
```

## File structure

```
index.html                              "Why Ramsey?" explainer + visualizer nav — the repo's front door; i18n'd, modular, tested
index_rabi.html                         Rabi/Zeeman visualizer — single-file, canvas-rendered, English-only, untested
index_ramsey.html                       Ramsey interferometry visualizer — same style as index_rabi.html
index_nv_bloch_golf.html                Bloch golf — gate-navigation puzzle, same style as the two above, with a baseline a11y pass (see "Accessibility" below)
src/app.js                              index.html's render/locale wiring only — NOT used by the three visualizer pages
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
doc/bloch_rabi.jpg, doc/bloch_ramsey.jpg     reference screenshots
doc/media/bloch-sweep.mp4               hero video on index.html — captured live from index_rabi.html, not a rendered mockup
doc/design/                             non-code MagNav story/verification research; doesn't affect the app
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
same five gates that both sets `par` and powers "Show a solution"; `pulse(axis, deg)` /
`applyGate` animate the chosen rotation with an eased tween, not an instant jump. No T2*,
no detuning, no measurement noise — every move is an exact rotation, deliberately unlike
the other two pages (see its footer and `golfIntro` strings). It arrived as a pasted
Claude-Artifact export (fragment only, no `<!DOCTYPE>`/`<head>`, an unloaded Tabler Icons
font dependency, and CSS custom properties referenced but never defined) and was wrapped
into a proper standalone page plus given a baseline accessibility pass — see
"Accessibility" below for exactly what changed and what's still worth revisiting.

All three pages predate the i18n work and are **not** wired into
`scripts/check-i18n-coverage.js` or any locale bundle — they remain English-only
single-file pages by design (see README's i18n/l10n/a11y section).

### Accessibility (status per page — read before assuming parity)

- **index.html**: full `aria-hidden` + `.sr-only`-equivalent treatment for its one SVG
  visual and hero video, per bell-state-explorer's convention (see README).
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
  these two up to the same baseline as golf is explicitly still open, see "Planned:
  visualizer catalog" below. Don't assume golf's pass means the other two got one too.

### index.html + src/app.js / i18n.js / locale-loader.js

This trio follows bell-state-explorer's i18n architecture closely, with one deliberate
deviation documented in the README: **no static `locales/en.js` copy**. Because this page
has no model or `render()` — every `[data-i18n]` element's static HTML text already *is*
the correct default-English render — `en.json` is fetched lazily via `ensureEnglish()`,
the same way every contributed locale is, rather than shipped as a duplicate JS module.
`src/i18n.js` and `src/locale-loader.js` are otherwise ported verbatim. `src/app.js` is
much thinner than bell's equivalent: no model, no slider-driven readouts, so
`applyLocale(bundle)` (walk `[data-i18n]`, set `document.title`/meta description
specially) plus the picker wiring is the entire render path.

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

## Planned: visualizer catalog

Goal, not yet built: refactor `index.html` so each visualizer (Rabi, Ramsey, Bloch golf,
and whatever comes after) is a declarative entry — title, note, detail paragraph, href,
i18n keys — in one list, rendered into the `.explore-col` nav by `src/app.js`, instead of
a hand-copied `<div class="card">` block per page. Concretely, that means:
- A data structure (plain array of objects, in `src/app.js` or a new `src/catalog.js`) is
  the single place a new visualizer gets registered, instead of touching `index.html`'s
  markup, `locales/en.json`, and `schema/locale-bundle.schema.json` by hand each time (all
  three needed manual edits to add the Bloch golf card — see the "golfIntro"/"navGolf*"
  keys throughout this repo for what that manual process looked like, and the HTML comment
  above the golf `<div class="card">` in index.html marking it as the interim pattern).
- Card rendering (label/note/detail paragraph markup) moves from static HTML into a small
  render function, still going through `t(key, params)` per the i18n rule below — no
  regression on translatability.
- Worth deciding at that point, not before: whether the timeline-diagram SVG (Rabi vs.
  Ramsey drive-timeline comparison) stays a fixed two-way comparison or becomes part of
  the catalog data too; Bloch golf doesn't fit that comparison's shape (a discrete
  puzzle, not a drive-timeline shape) and wasn't force-fit into it.
- Bringing `index_rabi.html`/`index_ramsey.html` up to the same accessibility baseline
  `index_nv_bloch_golf.html` now has (see "Accessibility" above) is independent of the
  catalog refactor and doesn't need to wait for it.

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
