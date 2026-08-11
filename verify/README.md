# Physics verification

Cross-checks the closed-form quantum formulas in `index_rabi.html` and
`index_ramsey.html` against a full QuTiP Lindblad master-equation
simulation, so the app's physics claims aren't just hand-derived and
hoped-correct. Runs in CI on every change to either HTML file (see
`.github/workflows/physics-verification.yml`).

```
pip install -r verify/requirements.txt
pytest verify/ -q          # the gate
python verify/make_report.py  # writes verify/report.json (curves + error grids)
```

- `closed_form.py` — pure-Python port of the JS formulas, each function
  citing the exact source line(s) it mirrors.
- `qutip_reference.py` — the QuTiP ground truth (unitary + Lindblad
  `mesolve`, `steadystate`).
- `test_physics.py` — the comparison suite, including a source-canary
  check that fails loudly if the HTML math changes without this suite
  being updated to match.

## Findings

1. **Rabi, coherent** (no T2*): the generalized-Rabi formula
   `P(t)=(Ω₀²/Ω²)·½(1−cos Ωt)` is **exact** — matches QuTiP to ~1e-8.
2. **Rabi, with continuous T2\* dephasing**: the app's `×exp(-t/T2*)`
   envelope is an approximation, not the true Lindblad solution. On
   resonance the real oscillation decays at `1/(2·T2*)`, not `1/T2*`
   (confirmed both by QuTiP and by the Bloch-matrix eigenvalues directly),
   and settles toward a mixed steady state (~0.5) instead of decaying back
   to 0. At the app's own defaults (Ω₀=6 MHz, T2\*=2 µs, on resonance) the
   two curves differ by up to ~0.47 in population within the visible 3 µs
   window — a real, sizeable gap, not numerical noise.
3. **Ramsey, coherent**: **exact** match (~1e-7).
4. **Ramsey, with T2\* dephasing confined to the free-evolution window**
   (matching the app's own "microwave OFF during τ" framing): **exact**
   match (~1e-7) — this case is analytically solvable because the
   dephasing generator commutes with the free-evolution Hamiltonian.
5. **ODMR steady state**: with *only* the app's stated T2\* channel (no
   T1), the Lindblad steady state is **exactly** the maximally-mixed state
   for any nonzero drive/detuning — provably (the Bloch matrix is
   full-rank whenever Ω₀≠0). A CW ODMR dip is fundamentally impossible
   without a population-relaxation channel, which this two-level model
   never defines (matches README.md's own "no explicit laser-pumping rate
   equations" caveat). Adding an illustrative, clearly-not-in-the-app T1
   produces a comparable dip, but its physical linewidth grows far faster
   with Ω₀ than the app's linear power-broadening heuristic assumes.

None of this changes the deployed app — it's a separate, offline check.
The visualizers' closed-form shortcuts remain intentional design choices
for a client-side, dependency-free demo (see README.md); this suite exists
to make sure *where* they simplify is known and tracked, not accidental.
