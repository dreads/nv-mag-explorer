# NV-Center Magnetometry Explorer

Interactive, faithful-physics demos of how a nitrogen-vacancy (NV) center in
diamond senses a magnetic field. A follow-on to the Bell State Explorer: same
"visualize what's actually happening between input and output" philosophy, one
level of physics deeper.

The engine models the real NV ground-state Hamiltonian and every visual is a
readout of it — no cartoons, no hand-waving.

## Status

| Piece | State |
|-------|-------|
| Physics engine (`src/`) | Built, 100% test coverage |
| Demo 1 — Spin state & the qutrit | **Built** — `demo1-spin-state.html` |
| Demo 2 — ODMR & Zeeman splitting | Engine ready; UI next |
| Demo 3 — Ramsey / spin precession | **Further work** |
| Demo 4 — Magnetography pixel map | **Further work** |

## The physics engine

Everything derives from one function: the NV ground-state spin-1 Hamiltonian

```
H = D·Sz² + E·(Sx² − Sy²) + γ·(Bx·Sx + By·Sy + Bz·Sz)
```

in the basis { |+1⟩, |0⟩, |−1⟩}, energies in GHz, field in Tesla.

- **D ≈ 2.87 GHz** — zero-field splitting, separates |0⟩ from |±1⟩
- **E** — transverse strain, lifts the |±1⟩ degeneracy and introduces the
  complex-valued, phase-carrying terms that make the *hue* channel necessary
- **γ ≈ 28.024 GHz/T** — electron gyromagnetic ratio; the Zeeman term is the
  sensing knob
- **B** — the field being sensed; its projection on the NV axis (Bz) does the
  measurable work

From this single object:
- `levels()` → the three energy eigenvalues and eigenstates
- `resonancesFromZero()` → the two ODMR microwave resonances (Demo 2)
- `matrixField()` → per-entry magnitude + phase for the domain-colored 3×3 view
- `subspaceBloch()` → an *honest projection* onto a driven two-level subspace
  (Demo 1's Bloch sphere)

## The teaching beat: why one Bloch sphere isn't enough

The NV ground state is a **qutrit** (spin-1, three levels), not a qubit. That
costs you something visual, and confronting it is the point of Demo 1:

- A **qubit** has 2 free real parameters after normalization and global phase →
  the Bloch sphere surface holds it losslessly.
- A **qutrit** pure state has 4 free real parameters; a mixed one has 8 (the
  SU(3) / Gell-Mann generalized Bloch vector lives in 8 dimensions). No sphere,
  and no finite pile of spheres, holds that faithfully.

So the division of labor is deliberate:
- the **3×3 matrix** (hue = phase, brightness = magnitude) is the complete,
  faithful readout — the source of truth;
- the **single Bloch sphere** is an intuitive but explicitly *partial*
  projection onto the two-level subspace you actually drive with microwaves.

We show one sphere, labeled as a projection, and let the matrix carry the full
qutrit truth.

## Development

Requires Node 18+ (uses the built-in test runner; no dependencies).

```bash
npm test          # run all tests
npm run coverage  # run with coverage report (targets 100% on src/)
```

Opens cleanly in PyCharm (JavaScript). Point the Node.js test configuration at
`--test` to run the suite from the IDE.

### Running Demo 1

`demo1-spin-state.html` imports the engine as an ES module, so it must be served
over http (opening the file directly will hit a CORS block on the import). From
the project root:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/demo1-spin-state.html
```

In PyCharm, right-click the HTML file and choose "Open in Browser" with the
built-in web server, which serves over http automatically.

**What it shows.** Five controls (field strength, polar angle to the NV axis,
transverse azimuth φ, strain E, and D) drive two synchronized views: a Bloch
sphere of the driven |0⟩↔|−1⟩ subspace (the lossy projection) and the full 3×3
Hamiltonian rendered with fill = magnitude and hue = phase (the faithful qutrit).
Sweeping φ walks the off-diagonal phase through the full circle, moving the hue
while magnitude stays fixed — the cleanest demonstration that the sphere throws
phase away and the matrix keeps it. The matrix is always magnitude-symmetric and
hue-antisymmetric across the diagonal: a visible signature of Hermiticity.

## Layout

```
demo1-spin-state.html  Demo 1 UI — Bloch projection + hue-colored qutrit matrix
src/
  complex.js         complex-number + 3×3 complex-matrix utilities
  eigen.js           Hermitian 3×3 eigensolver (complex Jacobi rotations)
  nv-hamiltonian.js  the NV Hamiltonian and all physical readouts
test/
  complex.test.js
  eigen.test.js
  nv-hamiltonian.test.js
```

## License

MIT
