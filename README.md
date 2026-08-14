# NV Magnetometry — Rabi & Zeeman Visualizer

An interactive, single-file visualizer showing how an NV-diamond quantum magnetometer's spin resonance responds to a nearby magnet. Slide the magnet toward or away from a fixed sensor and watch the spin resonance shift (Zeeman), the microwave drive detune, and the Rabi oscillation change shape in real time — a lab bench for a dynamic most references only ever show as a static plot, not a navigation demo.

Companion piece to the MagNav system diagram, and to [bell-state-explorer](https://github.com/dreads/bell-state-explorer)'s density-matrix explorer — see the i18n/l10n/a11y section below for how this repo's shared architecture came from there.

## What's in this repo

| File | What it is |
|---|---|
| `index.html` | **"Why Ramsey?"** — an explainer page on why a real magnetometer measures with Ramsey interferometry instead of reading Rabi oscillations directly, and the coherence budget that limits it. Also the repo's visualizer nav — the current front door of the repo. |
| `index_rabi.html` | The interactive Rabi/Zeeman visualizer (formerly `index.html`) — slide a magnet toward or away from a fixed sensor, watch the Rabi oscillation and ODMR spectrum respond. |
| `index_ramsey.html` | The interactive Ramsey interferometry visualizer — pulse-sequence timeline, fringe plot, phase-accumulating Bloch sphere, play/stage-jump controls. Fully wired up (this table previously called it an unbuilt "design mockup"; that was stale — it's functional, see the commit history). `index.html`'s nav card used to still say "In design" despite this; that's been fixed as part of the catalog refactor below. |
| `index_nv_bloch_golf.html` | Bloch golf — a gate-navigation puzzle on the same ground-state Bloch sphere: pulse X/Y/Z rotations to walk the spin to a randomly placed target in as few strokes as par allows. The third peer visualizer — now a generated catalog entry (see below) rather than the interim hand-added nav card it started as. |

## Where this is headed

Tracked as GitHub issues on this repo, not as a list here — see
[issue #19](https://github.com/dreads/nv-mag-explorer/issues/19) (bring
`index_rabi.html`/`index_ramsey.html` accessibility up to `index_nv_bloch_golf.html`'s
baseline) for current status.

[Issue #18](https://github.com/dreads/nv-mag-explorer/issues/18) (turn `index.html`'s
hand-copied nav cards into a data-driven catalog) is resolved: `src/catalog.js` is now the
single place a visualizer's nav-card text and hero-panel "spotlight" media live, rendered by
`renderCatalog()`/`setSpotlight()` in `src/app.js` — see "i18n / l10n / a11y" below for the
locale-key side of that refactor. Adding a fifth visualizer means appending one entry to
`src/catalog.js` and (optionally, whenever a translator gets to it) a matching
`catalog.<id>.*` block per `locales/*.json` file — no more hand-editing `index.html` or
`schema/locale-bundle.schema.json` in lockstep, since the schema's `catalog` section uses
`patternProperties` to accept any id.

## Deploy to GitHub Pages

No build step, no server — everything here is static files, matching [bell-state-explorer](https://github.com/dreads/bell-state-explorer)'s deploy pattern exactly:

1. `.github/workflows/deploy.yml` runs on every push to `main`: `npm test` + `npm run lint:i18n` gate the deploy, then `actions/deploy-pages` publishes the repo root.
2. One-time repo setting: **Settings → Pages → Source** → "GitHub Actions" (not "Deploy from a branch" — the workflow handles that).
3. Live at `https://<user>.github.io/<repo>/` within a minute of a push.

Run the same checks locally before pushing:

```bash
npm run serve   # serves on http://localhost:8000
npm test        # i18n engine + locale-bundle shape tests
npm run lint:i18n
```

## Why no Python

Rabi oscillations, the Zeeman effect, and Ramsey fringes are all **closed-form** — there's an exact formula, no differential-equation solver needed. Everything is computed in the browser in JavaScript. A quantum library like QuTiP would be overkill *and* can't run on GitHub Pages (it needs a Python runtime). If a future feature needs full density-matrix simulation (e.g. Lindblad decoherence, multi-level dynamics beyond the two-level model), that's the point where you'd pre-compute data or add a backend — not before.

This is still true for the deployed app. It's *not* the whole story anymore: `verify/` (next
section) runs QuTiP in CI, offline, to check the closed-form formulas above are actually
correct — a Python dependency that never ships to the browser and never gates deploy.

## Physics verification (QuTiP)

`verify/` cross-checks the Rabi/Ramsey/ODMR formulas above against a full QuTiP Lindblad
master-equation simulation of the same two-level model — independent proof the closed-form
shortcuts are physically correct, not just plausible-looking. Runs via
`.github/workflows/physics-verification.yml` on any change to `index_rabi.html`,
`index_ramsey.html`, or `verify/**`; separate from and doesn't gate `deploy.yml` (installing
QuTiP is slower than this repo's usual `npm test`).

```bash
pip install -r verify/requirements.txt
pytest verify/ -q
python verify/make_report.py   # writes verify/report.json (gitignored) with overlay curves + error grids
```

Findings, in brief (full writeup in `verify/README.md`):
- **Rabi, coherent** (no T₂*): exact match to QuTiP (~1e-8) — the generalized-Rabi formula
  really is the textbook-exact solution it claims to be.
- **Rabi, with T₂\* dephasing**: the `×e^(−t/T₂*)` envelope is a real approximation. On
  resonance the true decay rate is `1/(2T₂*)`, not `1/T₂*`, and the true dynamics settle
  toward a mixed steady state rather than decaying to zero — a sizeable gap even at this
  page's own default slider settings, not an edge case.
- **Ramsey, coherent and with T₂\***: both exact (~1e-7) — dephasing confined to the
  free-evolution window turns out to be analytically solvable, so the closed form isn't
  approximating anything there.
- **ODMR**: with only this model's stated T₂* channel (no T1), a CW ODMR dip is provably
  impossible — the Lindblad steady state is exactly the maximally-mixed population for any
  drive/detuning. Real ODMR needs the laser's optical repumping, which this two-level model
  never includes (see "Known-simple / next steps" below).

## index_rabi.html — what each panel shows

- **Sensor & magnet distance** — Drag the magnet along the rail, or use the distance slider. A fixed NV sensor sits at one end; the magnet's standoff distance sets the local field via a real inverse-cube dipole law. The cyan arrow is the field vector the sensor feels; the shaded zone nearest the sensor is a keep-out region (the sensor housing's physical size).
- **Rabi oscillation** — The spin-flip probability P(t). On resonance it swings 0→1 (full flip). Detune it and the amplitude shrinks while the frequency rises — the two signatures of `Ω = √(Ω₀²+δ²)`.
- **Bloch sphere** — The spin state as a vector precessing about the (tilted) drive axis. On resonance the axis is equatorial and the vector reaches both poles; off resonance the axis tilts toward vertical and the vector traces a shrinking cone.
- **Energy levels** — The ground-state triplet. m=±1 are degenerate at 2.87 GHz until the field splits them by ±γB. The amber microwave line is fixed; the gap between it and the nearest level is the detuning.
- **ODMR** — What the photodetector sees: red fluorescence dips at each spin resonance. Field splits one dip into two. The amber line is your drive; its distance to the nearest dip is the detuning.

### Controls

| Control | What it changes |
|---|---|
| Magnet distance d | Standoff distance in cm — the primary sensing lever, field falls off as 1/d³ |
| Microwave amplitude | Ω₀, the on-resonance Rabi frequency (drive strength) |
| Microwave frequency | Your fixed drive tone — move it onto a dip to null the detuning |
| Coherence time T₂* | How quickly the oscillation damps out |
| Magnet strength | Scales the dipole moment — swap in a weaker/stronger magnet |
| Pause time | Freeze/resume the simulation clock |
| Auto-sweep | Magnet distance sweeps the rail on its own |
| Snap to resonance | Sets the drive exactly onto the nearest resonance for the current B |
| Flip polarity | Reverses which pole faces the sensor, flipping the sign of B |
| Reset | Back to defaults |

### The physics (verified)

- Generalized Rabi frequency: **Ω = √(Ω₀² + δ²)**
- Population: **P(t) = (Ω₀²/Ω²)·½(1 − cos Ωt)·e^(−t/T₂\*)**
- Zeeman split of the NV ground-state triplet: **f± = 2.87 GHz ± γB**, with **γ ≈ 28 MHz/mT**
- Detuning: **δ = f_drive − f_nearest-resonance**
- Dipole field vs. distance: **B(d) = B₀/d³** (axial field of a small bar magnet), `B₀` chosen for a clear demo range

These were checked numerically: the amplitude term halves at δ=Ω₀ and the Zeeman split is linear at 2γB. The 1/d³ shape is real dipole physics; `B₀`'s magnitude is an arbitrarily tuned demo constant, not a characterized real magnet. The spin physics itself is faithful to the two-level NV model — and, more rigorously than the self-consistency checks in this paragraph, cross-checked against a full QuTiP master-equation simulation in `verify/` (see "Physics verification" above), which is also where the T₂*/ODMR caveats below the model actually get quantified rather than just asserted.

Values in the sensible NV range: 2.87 GHz zero-field resonance, ~1–20 MHz Rabi, µs-scale T₂\*. The two-level model ignores hyperfine structure (the real 14N triplet) and optical-pumping dynamics — fine for building intuition, and the natural things to add if you want more realism later.

## i18n / l10n / a11y

`index.html` (the "Why Ramsey?" page) follows the same internationalization and accessibility architecture as [bell-state-explorer](https://github.com/dreads/bell-state-explorer), ported over as directly as the content allows:

- **Every user-visible string is externalized, with a single JSON source of truth.** `locales/en.json` holds every English string, split into `ui` (chrome: heading, subtitle, nav heading, language picker, `toolboxCaption` — the default hero-panel caption, page-level rather than about one visualizer) and `catalog` (one `catalog.<id>.{label,note,detail,spotlightCaption}` block per `src/catalog.js` visualizer entry — `<id>` is a free-form pattern-matched key, not an enumerated list, so a new visualizer never needs a schema edit). `locales/manifest.json` lists picker options only, independent of auto-detection.
  - **Deliberate deviation from bell-state-explorer**: bell keeps a static-imported `locales/en.js` alongside its JSON so the default language never costs a network round-trip. Most of this page doesn't need that duplication — every other `[data-i18n]` element's static HTML text already *is* the correct default English render, so `en.json` is fetched lazily, the same way every contributed locale is, only once it's actually needed as `translate()`'s fallback bundle. The one exception is the catalog: `src/catalog.js` carries each entry's English literal alongside its key, and `src/app.js` synthesizes a `catalogFallback` object from those literals at module load — so the catalog cards and spotlight caption also render correct English with zero network dependency, even though (unlike the rest of the page) rendering them does require JS to run at all, not just to translate them. See CLAUDE.md's Architecture section for the tradeoff that comes with that.
- **`src/i18n.js`** (`translate`/`getPath`/`interpolate`) and **`src/locale-loader.js`** (`expandCandidates`/`loadManifest`/`loadLocaleBundle`/`detectLocale`) are copied verbatim from bell-state-explorer — both are pure, project-agnostic string-lookup/locale-discovery code with no dependency on what the page actually says. Same silent per-key fallback to English, same `locales/<code>.json`-dropped-in-locally auto-detection, same `qaa`–`qtz` mock-locale convention for manual QA.
- **`src/app.js`**: `renderCatalog()` builds the nav cards from `src/catalog.js` and `setSpotlight()` swaps the hero panel's media/caption on hover or focus of a card, resetting to `DEFAULT_SPOTLIGHT` (a Bloch golf still with a generic "this is a toolbox" caption — not tied to any one visualizer) when nothing's hovered/focused (mouse and keyboard both land on the same delegated listeners); `applyLocale(bundle)` (walk every `[data-i18n]`, set `document.title`/meta description specially) plus the locale picker wiring covers everything else — there's no separate `render()` beyond `renderCatalog()`.
- **Static HTML text**: `data-i18n="namespace.key"` on every text-bearing element (generated catalog cards get this attribute set by `renderCatalog()`/`setSpotlight()` too, so `applyLocale()`'s sweep picks them up like any other element); `data-i18n-exempt` on the one deliberately untranslated element (the language picker's own-language `<option>`), same convention as bell's index.html.
- **Accessibility (aria-hidden + sr-only)**: the spotlight panel's `<video>`/`<img>` are `aria-hidden="true"` (decorative — the interactive original lives on the linked visualizer page), and its caption `<p aria-live="polite">` is both the visible description and the accessible announcement when hovering/focusing a card swaps it. A skip-link and visible `:focus-visible` rings are also in `src/styles.css`. A `CATALOG` entry can also set `glossaryNote: true` (currently just Ramsey's) to render its note as a native `<details><summary>` disclosure instead of an always-visible paragraph — Enter/Space and screen-reader expand/collapse semantics come free from the native element, `src/app.js` just layers a `mouseenter`/`mouseleave` open/close on top for mouse users.
- **`index_nv_bloch_golf.html` got the same aria-hidden/sr-only *pattern* applied independently of this i18n system** (it's still English-only, see below): its `<canvas>` is `aria-hidden="true"`, a `.sr-only` paragraph carries the scene description, a live `#golf-status` region announces hole/par/strokes/match as they change, and the win banner is `role="status"`/`aria-live="polite"`. It also arrived with an unloaded Tabler Icons font dependency (icon glyphs that silently rendered as nothing) and several undefined CSS custom properties — both fixed as part of the same pass, not left as a follow-up, since a page that looks broken is its own accessibility problem. Full detail in CLAUDE.md's Accessibility section.
- **Single dark theme, by design** — unlike bell-state-explorer's light/dark toggle via `prefers-color-scheme`, this page reuses `index_rabi.html`/`index_ramsey.html`'s fixed dark instrument-panel palette (`--bg`, `--ink`, `--cyan`, etc. as CSS custom properties) for visual consistency across the repo's three pages. All text colors are light-on-near-black with generous contrast margin; no light theme is offered.
- **`scripts/check-i18n-coverage.js`** (`npm run lint:i18n`, zero dependencies, wired into `.github/workflows/deploy.yml` after `npm test`) is bell's heuristic scanner adapted to this repo: untagged text-bearing tags, `<title>`/meta-description drift from `locales/en.json`, unresolvable `data-i18n` keys, hardcoded `.textContent` literals in `src/*.js`, **content drift** (added 2026-08-12, after this exact bug happened twice) between `index.html`'s static text and `locales/en.json`, and — since the catalog refactor moved nav-card/spotlight text out of static HTML — the same drift check re-run against `src/catalog.js`'s literals (imported directly, not regex-matched). Static content (HTML for everything else, `catalog.js` for the catalog) stays authoritative; this check just makes that enforced instead of a manual discipline.
- **`test/i18n.test.js`** / **`test/locale-loader.test.js`** are the same generic engine tests as bell-state-explorer (they test pure lookup/discovery logic, not this page's content). **`test/locale-bundles.test.js`** shape-validates every `locales/*.json` against `locales/en.json` (unknown sections/keys, valid `direction`, all-string values, recursively at any nesting depth so `catalog.<id>.<field>` and flatter sections like `ui.*` are both covered by the same walk), same as bell's `npm test` contribution gate.
- **`schema/locale-bundle.schema.json`** documents the contributed-bundle shape (JSON Schema draft 2020-12), scoped to this page's actual `ui`/`catalog` sections — `catalog` uses `patternProperties` rather than an enumerated id list.
- Only English ships as a maintained locale — same contribution model as bell-state-explorer: open a PR adding `locales/<code>.json` + one `locales/manifest.json` entry, pass `npm test` + `npm run lint:i18n`, verify locally before requesting review.

**Not yet built**, same caveat bell-state-explorer's own README carries: `dir="rtl"`-driven CSS logical-property fixes beyond the cheap ones already in `src/styles.css` (`margin-inline`/`inset-inline-start`), and `Intl.NumberFormat` at any display boundary (this page has no live numeric readouts to format). None of the three visualizer pages (`index_rabi.html`, `index_ramsey.html`, `index_nv_bloch_golf.html`) have been ported to the **i18n** half of this architecture — they predate it and remain single-file, English-only pages for now, and `npm run lint:i18n` doesn't scan any of them. The **accessibility** half is now split across the three: `index_nv_bloch_golf.html` has the aria-hidden/sr-only baseline (see above); `index_rabi.html`/`index_ramsey.html` still have neither — see "Where this is headed" above.

## Known-simple / next steps

- `index_rabi.html`: two-level model only (no hyperfine triplet, no explicit laser-pumping rate equations); the dipole falloff shape is real, but `B_COEFF` is an arbitrarily tuned demo constant, not a characterized real magnet. `verify/` (see "Physics verification" above) additionally shows the Rabi panel's T₂* damping is a stylized approximation, not the true master-equation solution, and that a real ODMR dip needs a population-relaxation channel this model never defines.
- A further follow-on will let the Ramsey visualizer's T₂* become an explicit, dial-in-able noise channel — closer to bell-state-explorer's dephasing model than today's fixed slider. Not filed as an issue yet.
- `index_nv_bloch_golf.html`'s `solve()` breadth-first search and rotation math have no independent test coverage yet (unlike Rabi/Ramsey, which now have `verify/`'s QuTiP cross-check) — worth a look if the puzzle's par values ever seem off. Not filed as an issue yet.

The catalog refactor and Rabi/Ramsey accessibility parity — the two biggest open items —
are tracked as GitHub issues, see "Where this is headed" above rather than restated here.
