// NV-center ground-state Hamiltonian (electronic spin S = 1).
//
// This module is the single source of truth. Both demos derive from it:
//   - Demo 1 (spin state) reads eigenvectors and the 3x3 matrix itself.
//   - Demo 2 (ODMR) reads eigenvalue gaps as resonance positions.
//
// Basis order is { |+1>, |0>, |-1> } throughout.
//
// Hamiltonian:  H = D Sz^2 + E (Sx^2 - Sy^2) + gamma (Bx Sx + By Sy + Bz Sz)
//   D     zero-field splitting        ~ 2.87 GHz
//   E     transverse strain           lifts the +1/-1 degeneracy (complex-ish terms)
//   gamma electron gyromagnetic ratio ~ 28.024 GHz/T
//   B     magnetic field vector (Tesla); Bz is the projection on the NV axis
//
// Energies are carried in GHz. Field in Tesla. This keeps numbers human-sized.

import {
  c,
  zeros3,
  mAdd,
  mMul,
  mScaleReal,
  cAbs,
  cArg,
} from './complex.js';
import { eighHermitian3 } from './eigen.js';

// Physical constants.
export const D_ZFS = 2.87; // GHz, zero-field splitting
export const GAMMA = 28.024; // GHz/T, electron gyromagnetic ratio

// --- Spin-1 operators in the { |+1>, |0>, |-1> } basis. ---------------------
// Sz = diag(+1, 0, -1).
export const Sz = () => {
  const m = zeros3();
  m[0][0] = c(1, 0);
  m[2][2] = c(-1, 0);
  return m;
};

// Sx = (1/sqrt2) [[0,1,0],[1,0,1],[0,1,0]].
export const Sx = () => {
  const r = 1 / Math.SQRT2;
  const m = zeros3();
  m[0][1] = c(r, 0);
  m[1][0] = c(r, 0);
  m[1][2] = c(r, 0);
  m[2][1] = c(r, 0);
  return m;
};

// Sy = (i/sqrt2) [[0,-1,0],[1,0,-1],[0,1,0]].
export const Sy = () => {
  const r = 1 / Math.SQRT2;
  const m = zeros3();
  m[0][1] = c(0, -r);
  m[1][0] = c(0, r);
  m[1][2] = c(0, -r);
  m[2][1] = c(0, r);
  return m;
};

const square = (m) => mMul(m, m);

// --- The Hamiltonian. -------------------------------------------------------
// params: { D, E, Bx, By, Bz, gamma }
// All optional; sensible NV defaults fill in.
export function nvHamiltonian({
  D = D_ZFS,
  E = 0,
  Bx = 0,
  By = 0,
  Bz = 0,
  gamma = GAMMA,
} = {}) {
  const sz = Sz();
  const sx = Sx();
  const sy = Sy();

  const sz2 = square(sz);
  const sx2 = square(sx);
  const sy2 = square(sy);

  // D * Sz^2
  let H = mScaleReal(sz2, D);
  // + E * (Sx^2 - Sy^2)
  const sxy = mAdd(sx2, mScaleReal(sy2, -1));
  H = mAdd(H, mScaleReal(sxy, E));
  // + gamma * (Bx Sx + By Sy + Bz Sz)
  H = mAdd(H, mScaleReal(sx, gamma * Bx));
  H = mAdd(H, mScaleReal(sy, gamma * By));
  H = mAdd(H, mScaleReal(sz, gamma * Bz));

  return H;
}

// Eigen-energies (ascending, GHz) and eigenstates of the Hamiltonian.
export function levels(params) {
  return eighHermitian3(nvHamiltonian(params));
}

// Faithful ODMR: find the eigenstate with the largest overlap on the bare |0>
// state (index 1 in our basis), then report transition frequencies from it to
// the other two eigenstates. Those are the microwave resonances that appear as
// fluorescence dips.
export function resonancesFromZero(params) {
  const { values, vectors } = levels(params);
  let zeroIdx = 0;
  let best = -1;
  for (let k = 0; k < 3; k += 1) {
    const overlap = cAbs(vectors[k][1]); // amplitude on bare |0>
    if (overlap > best) {
      best = overlap;
      zeroIdx = k;
    }
  }
  const e0 = values[zeroIdx];
  const others = [0, 1, 2].filter((k) => k !== zeroIdx);
  const freqs = others.map((k) => Math.abs(values[k] - e0)).sort((a, b) => a - b);
  return freqs;
}

// --- Domain-coloring readout for the matrix view. ---------------------------
// Each complex entry maps to { magnitude, phase } so the UI can render
// magnitude as brightness/size and phase as hue. This is the faithful,
// lossless view of the qutrit that the single Bloch sphere cannot provide.
export function matrixField(params) {
  const H = nvHamiltonian(params);
  return H.map((row) =>
    row.map((z) => ({
      magnitude: cAbs(z),
      phase: cArg(z), // radians in (-pi, pi]
      re: z.re,
      im: z.im,
    }))
  );
}

// --- Bloch vector for the driven two-level subspace. ------------------------
// We project onto the { |0>, |-1> } subspace (the transition typically driven)
// and return the Bloch vector of that qubit for the lowest eigenstate.
// This is explicitly a projection: it is honest about being partial.
export function subspaceBloch(params, options = {}) {
  const subspace = options.subspace || ['0', '-1'];
  const idx = { '+1': 0, '0': 1, '-1': 2 };
  const i = idx[subspace[0]];
  const j = idx[subspace[1]];
  const { vectors } = levels(params);
  // Use the ground eigenstate (lowest energy) as the state to display.
  const psi = vectors[0];
  const a = psi[i];
  const b = psi[j];
  // Renormalize within the 2D subspace.
  const norm = Math.hypot(cAbs(a), cAbs(b)) || 1;
  const ar = { re: a.re / norm, im: a.im / norm };
  const br = { re: b.re / norm, im: b.im / norm };
  // Bloch components for qubit (a|0> + b|1>):
  //   x = 2 Re(a* b), y = 2 Im(a* b), z = |a|^2 - |b|^2
  const aStarB = {
    re: ar.re * br.re + ar.im * br.im,
    im: ar.re * br.im - ar.im * br.re,
  };
  const x = 2 * aStarB.re;
  const y = 2 * aStarB.im;
  const z = (ar.re * ar.re + ar.im * ar.im) - (br.re * br.re + br.im * br.im);
  return { x, y, z };
}
