# NV-Diamond MagNav — Rabi & Zeeman Visualizer

An interactive, single-file visualizer showing how an NV-diamond quantum magnetometer turns *position over terrain* into a *quantum signal*. Drag a vehicle across a magnetic landscape and watch the spin resonance shift (Zeeman), the microwave drive detune, and the Rabi oscillation change shape in real time.

Companion piece to the MagNav system diagram. This is v1 — the Rabi/Zeeman core. The Bloch-geometry refactor comes next.

## Deploy to GitHub Pages

No build step, no server. It's one static file.

1. Put `index.html` at the repo root (or in `/docs`).
2. Repo **Settings → Pages → Source**: deploy from branch, pick `main` and `/root` (or `/docs`).
3. Live at `https://<user>.github.io/<repo>/` within a minute.

That's the whole deploy. Same pattern as the bell-visualizer.

## Why no Python

Rabi oscillations and the Zeeman effect are **closed-form** — there's an exact formula, no differential-equation solver needed. Everything is computed in the browser in JavaScript. A quantum library like QuTiP would be overkill *and* can't run on GitHub Pages (it needs a Python runtime). If a future feature needs full density-matrix simulation (e.g. Lindblad decoherence, multi-level dynamics beyond the two-level model), that's the point where you'd pre-compute data or add a backend — not before.

## What each panel shows

- **Terrain & local field** — Drag the vehicle. Elevation is a stand-in for local crustal field magnitude B. The cyan arrow is the field vector the sensor feels; the green dashed line is the laser reading the diamond.
- **Rabi oscillation** — The spin-flip probability P(t). On resonance it swings 0→1 (full flip). Detune it and the amplitude shrinks while the frequency rises — the two signatures of `Ω = √(Ω₀²+δ²)`.
- **Bloch sphere** — The spin state as a vector precessing about the (tilted) drive axis. On resonance the axis is equatorial and the vector reaches both poles; off resonance the axis tilts toward vertical and the vector traces a shrinking cone.
- **Energy levels** — The ground-state triplet. m=±1 are degenerate at 2.87 GHz until the field splits them by ±γB. The amber microwave line is fixed; the gap between it and the nearest level is the detuning.
- **ODMR** — What the photodetector sees: red fluorescence dips at each spin resonance. Field splits one dip into two. The amber line is your drive; its distance to the nearest dip is the detuning.

## Controls

| Control | What it changes |
|---|---|
| Microwave amplitude | Ω₀, the on-resonance Rabi frequency (drive strength) |
| Microwave frequency | Your fixed drive tone — move it onto a dip to null the detuning |
| Coherence time T₂* | How quickly the oscillation damps out |
| Field sensitivity | Terrain-height → B scaling (how "magnetically dramatic" the landscape is) |
| Pause time | Freeze/resume the simulation clock |
| Auto-drive | Vehicle sweeps the route on its own |
| Snap to resonance | Sets the drive exactly onto the nearest resonance for the current B |
| Reset | Back to defaults |

## The physics (verified)

- Generalized Rabi frequency: **Ω = √(Ω₀² + δ²)**
- Population: **P(t) = (Ω₀²/Ω²)·½(1 − cos Ωt)·e^(−t/T₂\*)**
- Zeeman split of the NV ground-state triplet: **f± = 2.87 GHz ± γB**, with **γ ≈ 28 MHz/mT**
- Detuning: **δ = f_drive − f_nearest-resonance**

These were checked numerically: the amplitude term halves at δ=Ω₀ and the Zeeman split is linear at 2γB. Terrain→field mapping is illustrative; the spin physics is faithful to the two-level NV model.

Values in the sensible NV range: 2.87 GHz zero-field resonance, ~1–20 MHz Rabi, µs-scale T₂\*. The two-level model ignores hyperfine structure (the real 14N triplet) and optical-pumping dynamics — fine for building intuition, and the natural things to add if you want more realism later.

## Known-simple / next steps

- Two-level model only (no hyperfine triplet, no explicit laser-pumping rate equations).
- Terrain is a fixed deterministic profile (sum of sines), not a real anomaly map.
- **Next:** refactor the Bloch-sphere geometry into an alternate projected shape — the conceptual experiment you flagged.
