# NV Magnetometry — Rabi & Zeeman Visualizer

An interactive, single-file visualizer showing how an NV-diamond quantum magnetometer's spin resonance responds to a nearby magnet. Slide the magnet toward or away from a fixed sensor and watch the spin resonance shift (Zeeman), the microwave drive detune, and the Rabi oscillation change shape in real time — a lab bench for a dynamic most references only ever show as a static plot, not a navigation demo.

Companion piece to the MagNav system diagram, and to [bell-state-explorer](https://github.com/dreads/bell-state-explorer)'s density-matrix explorer — see the i18n/l10n/a11y section below for how this repo's shared architecture came from there.

## What's in this repo

| File | What it is |
|---|---|
| `index.html` | **"Why Ramsey?"** — an explainer page on why a real magnetometer measures with Ramsey interferometry instead of reading Rabi oscillations directly, and the coherence budget that limits it. The current front door of the repo. |
| `index_rabi.html` | The interactive Rabi/Zeeman visualizer (formerly `index.html`) — slide a magnet toward or away from a fixed sensor, watch the Rabi oscillation and ODMR spectrum respond. |
| `index_ramsey.html` | Design mockup for the interactive Ramsey visualizer — pulse-sequence timeline, fringe plot, phase-accumulating Bloch sphere. Not yet wired up; will replace `index.html` once built. |

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

These were checked numerically: the amplitude term halves at δ=Ω₀ and the Zeeman split is linear at 2γB. The 1/d³ shape is real dipole physics; `B₀`'s magnitude is an arbitrarily tuned demo constant, not a characterized real magnet. The spin physics itself is faithful to the two-level NV model.

Values in the sensible NV range: 2.87 GHz zero-field resonance, ~1–20 MHz Rabi, µs-scale T₂\*. The two-level model ignores hyperfine structure (the real 14N triplet) and optical-pumping dynamics — fine for building intuition, and the natural things to add if you want more realism later.

## i18n / l10n / a11y

`index.html` (the "Why Ramsey?" page) follows the same internationalization and accessibility architecture as [bell-state-explorer](https://github.com/dreads/bell-state-explorer), ported over as directly as the content allows:

- **Every user-visible string is externalized.** `locales/en.js` is the source-of-truth bundle (static ES module import, no network round-trip, never blank on first paint), split into `ui` (chrome: heading, subtitle, nav links, language picker), `purpose`/`rabiProblem`/`ramseyPayoff`/`coherenceBudget` (the narrative sections), `diagram` (the Rabi-vs-Ramsey timeline SVG's labels and its accessible description), and `footer`. `locales/en.json` mirrors it for the fetch-based loader; `locales/manifest.json` lists picker options only, independent of auto-detection.
- **`src/i18n.js`** (`translate`/`getPath`/`interpolate`) and **`src/locale-loader.js`** (`expandCandidates`/`loadManifest`/`loadLocaleBundle`/`detectLocale`) are copied verbatim from bell-state-explorer — both are pure, project-agnostic string-lookup/locale-discovery code with no dependency on what the page actually says. Same silent per-key fallback to English, same `locales/<code>.json`-dropped-in-locally auto-detection, same `qaa`–`qtz` mock-locale convention for manual QA.
- **`src/app.js`** is simpler than bell's: this page has no model or slider-driven readouts, so `applyStaticText()` (walk every `[data-i18n]`, set `document.title`/meta description specially) plus the locale picker wiring is the entire render path — there's no separate `render()`.
- **Static HTML text**: `data-i18n="namespace.key"` on every text-bearing element; `data-i18n-exempt` on the one deliberately untranslated element (the language picker's own-language `<option>`), same convention as bell's index.html.
- **Accessibility (aria-hidden + sr-only)**: the one SVG visual on this page — the Rabi-vs-Ramsey drive-timeline comparison — gets `aria-hidden="true"` (it's a bar-length/label comparison with no faithful ARIA mapping) plus a `.sr-only` `<p>` (`data-i18n="diagram.srDescription"`) stating the same comparison in prose, directly following bell-state-explorer's SVG convention. A skip-link and visible `:focus-visible` rings are also in `src/styles.css`.
- **Single dark theme, by design** — unlike bell-state-explorer's light/dark toggle via `prefers-color-scheme`, this page reuses `index_rabi.html`/`index_ramsey.html`'s fixed dark instrument-panel palette (`--bg`, `--ink`, `--cyan`, etc. as CSS custom properties) for visual consistency across the repo's three pages. All text colors are light-on-near-black with generous contrast margin; no light theme is offered.
- **`scripts/check-i18n-coverage.js`** (`npm run lint:i18n`, zero dependencies, wired into `.github/workflows/deploy.yml` after `npm test`) is bell's heuristic scanner adapted to this repo: untagged text-bearing tags, `<title>`/meta-description drift from `locales/en.js`, unresolvable `data-i18n` keys, hardcoded `.textContent` literals in `src/*.js`.
- **`test/i18n.test.js`** / **`test/locale-loader.test.js`** are the same generic engine tests as bell-state-explorer (they test pure lookup/discovery logic, not this page's content). **`test/locale-bundles.test.js`** shape-validates every `locales/*.json` against `locales/en.js` (unknown sections/keys, valid `direction`, all-string values), same as bell's `npm test` contribution gate.
- **`schema/locale-bundle.schema.json`** documents the contributed-bundle shape (JSON Schema draft 2020-12), scoped to this page's actual `ui`/`purpose`/`rabiProblem`/`ramseyPayoff`/`coherenceBudget`/`diagram`/`footer` sections.
- Only English ships as a maintained locale — same contribution model as bell-state-explorer: open a PR adding `locales/<code>.json` + one `locales/manifest.json` entry, pass `npm test` + `npm run lint:i18n`, verify locally before requesting review.

**Not yet built**, same caveat bell-state-explorer's own README carries: `dir="rtl"`-driven CSS logical-property fixes beyond the cheap ones already in `src/styles.css` (`margin-inline`/`inset-inline-start`), and `Intl.NumberFormat` at any display boundary (this page has no live numeric readouts to format). `index_rabi.html` and `index_ramsey.html` have not been ported to this i18n/a11y architecture — they predate it and remain single-file, English-only, canvas-rendered pages for now.

## Known-simple / next steps

- `index_rabi.html`: two-level model only (no hyperfine triplet, no explicit laser-pumping rate equations); the dipole falloff shape is real, but `B_COEFF` is an arbitrarily tuned demo constant, not a characterized real magnet.
- **Next:** build out `index_ramsey.html` into the real interactive Ramsey visualizer and promote it to `index.html`, retiring today's static explainer (or keeping it as a "why" primer linked from the new page). A further follow-on will let the Ramsey visualizer's T₂* become an explicit, dial-in-able noise channel — closer to bell-state-explorer's dephasing model than today's fixed slider.
