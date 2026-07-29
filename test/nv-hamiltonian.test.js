import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cAbs, isHermitian, mMaxAbsDiff, mMul, identity3 } from '../src/complex.js';
import {
  D_ZFS,
  GAMMA,
  Sx,
  Sy,
  Sz,
  nvHamiltonian,
  levels,
  resonancesFromZero,
  matrixField,
  subspaceBloch,
} from '../src/nv-hamiltonian.js';

const close = (a, b, tol = 1e-6) => Math.abs(a - b) < tol;

// --- Spin operator algebra. -------------------------------------------------

test('spin-1 operators are Hermitian', () => {
  assert.ok(isHermitian(Sx()));
  assert.ok(isHermitian(Sy()));
  assert.ok(isHermitian(Sz()));
});

test('Sz has eigenvalues +1, 0, -1 on the diagonal', () => {
  const sz = Sz();
  assert.equal(sz[0][0].re, 1);
  assert.equal(sz[1][1].re, 0);
  assert.equal(sz[2][2].re, -1);
});

test('spin-1 commutator [Sx, Sy] = i Sz', () => {
  // [Sx,Sy] = Sx Sy - Sy Sx should equal i Sz.
  const sx = Sx();
  const sy = Sy();
  const sz = Sz();
  const comm = mMul(sx, sy).map((row, i) =>
    row.map((z, j) => ({
      re: z.re - mMul(sy, sx)[i][j].re,
      im: z.im - mMul(sy, sx)[i][j].im,
    }))
  );
  // i * Sz
  const iSz = sz.map((row) => row.map((z) => ({ re: -z.im, im: z.re })));
  assert.ok(mMaxAbsDiff(comm, iSz) < 1e-12);
});

test('S^2 = s(s+1) = 2 times identity for spin-1', () => {
  const sx = Sx();
  const sy = Sy();
  const sz = Sz();
  const s2 = mMul(sx, sx).map((row, i) =>
    row.map((z, j) => ({
      re: z.re + mMul(sy, sy)[i][j].re + mMul(sz, sz)[i][j].re,
      im: z.im + mMul(sy, sy)[i][j].im + mMul(sz, sz)[i][j].im,
    }))
  );
  const twoI = identity3().map((row) => row.map((z) => ({ re: z.re * 2, im: 0 })));
  assert.ok(mMaxAbsDiff(s2, twoI) < 1e-12);
});

// --- Hamiltonian structure. -------------------------------------------------

test('no-argument call uses NV defaults (D=2.87, no field)', () => {
  // Exercises the default-parameter branch: nvHamiltonian() with no object.
  const { values } = levels();
  assert.ok(close(values[0], 0));
  assert.ok(close(values[1], D_ZFS));
  assert.ok(close(values[2], D_ZFS));
  assert.ok(isHermitian(nvHamiltonian()));
});

test('Hamiltonian is Hermitian for arbitrary parameters', () => {
  const H = nvHamiltonian({ D: 2.87, E: 0.005, Bx: 0.001, By: 0.002, Bz: 0.003 });
  assert.ok(isHermitian(H));
});

test('zero-field splitting: at B=0, E=0 levels are {0, D, D}', () => {
  const { values } = levels({ D: D_ZFS, E: 0 });
  // |0> at energy 0; |+-1> degenerate at D.
  assert.ok(close(values[0], 0));
  assert.ok(close(values[1], D_ZFS));
  assert.ok(close(values[2], D_ZFS));
});

test('strain E lifts the +-1 degeneracy at zero field', () => {
  const E = 0.01;
  const { values } = levels({ D: D_ZFS, E });
  // The two upper levels split to D +- E; lowest stays at 0.
  assert.ok(close(values[0], 0));
  assert.ok(close(values[1], D_ZFS - E));
  assert.ok(close(values[2], D_ZFS + E));
});

test('axial Zeeman: Bz splits the +-1 levels by 2*gamma*Bz', () => {
  const Bz = 0.001; // Tesla -> 28.024 MHz shift each way
  const { values } = levels({ D: D_ZFS, E: 0, Bz });
  // Levels: 0 (the |0> state), D - gamma*Bz, D + gamma*Bz.
  const split = values[2] - values[1];
  assert.ok(close(split, 2 * GAMMA * Bz, 1e-5));
});

test('explicit gamma overrides the default gyromagnetic ratio', () => {
  // Passing gamma explicitly must scale the Zeeman splitting accordingly.
  const gamma = 10; // GHz/T, deliberately non-default
  const Bz = 0.002;
  const { values } = levels({ D: D_ZFS, E: 0, Bz, gamma });
  const split = values[2] - values[1];
  assert.ok(close(split, 2 * gamma * Bz, 1e-5));
});

// --- ODMR resonances. -------------------------------------------------------

test('ODMR at zero field: both resonances sit at D', () => {
  const [f1, f2] = resonancesFromZero({ D: D_ZFS, E: 0, Bz: 0 });
  assert.ok(close(f1, D_ZFS, 1e-4));
  assert.ok(close(f2, D_ZFS, 1e-4));
});

test('ODMR splitting is linear in axial field (magnetometry law)', () => {
  const D = D_ZFS;
  const readSplit = (Bz) => {
    const [f1, f2] = resonancesFromZero({ D, E: 0, Bz });
    return f2 - f1;
  };
  const s1 = readSplit(0.001);
  const s2 = readSplit(0.002);
  // Splitting = 2 gamma Bz, so doubling Bz doubles the split.
  assert.ok(close(s2 / s1, 2, 1e-3));
  // And the absolute value matches 2 gamma Bz.
  assert.ok(close(s1, 2 * GAMMA * 0.001, 1e-4));
});

test('ODMR resonances centered on D under axial field', () => {
  const D = D_ZFS;
  const Bz = 0.0015;
  const [f1, f2] = resonancesFromZero({ D, E: 0, Bz });
  assert.ok(close((f1 + f2) / 2, D, 1e-4));
});

// --- Matrix field readout. --------------------------------------------------

test('matrixField returns magnitude and phase for every entry', () => {
  const field = matrixField({ D: D_ZFS, E: 0.01, Bx: 0.001 });
  assert.equal(field.length, 3);
  for (const row of field)
    for (const cell of row) {
      assert.ok(typeof cell.magnitude === 'number');
      assert.ok(typeof cell.phase === 'number');
      assert.ok(cell.magnitude >= 0);
      assert.ok(cell.phase >= -Math.PI - 1e-9 && cell.phase <= Math.PI + 1e-9);
    }
});

test('matrixField diagonal magnitudes reflect D on the +-1 states', () => {
  const field = matrixField({ D: D_ZFS, E: 0 });
  // Basis { |+1>, |0>, |-1> }: diagonal is D, 0, D.
  assert.ok(close(field[0][0].magnitude, D_ZFS));
  assert.ok(close(field[1][1].magnitude, 0));
  assert.ok(close(field[2][2].magnitude, D_ZFS));
});

// --- Subspace Bloch vector. -------------------------------------------------

test('subspace Bloch vector is a unit vector', () => {
  const b = subspaceBloch({ D: D_ZFS, E: 0.005, Bx: 0.002, Bz: 0.001 });
  const len = Math.hypot(b.x, b.y, b.z);
  assert.ok(len <= 1 + 1e-9);
  assert.ok(len > 0.5); // pure state projected -> near the surface
});

test('matrixField encodes nonzero phase when By is present (hue channel)', () => {
  // Sy has purely imaginary entries, so a By term produces complex off-diagonals
  // whose phase is +-pi/2 -> this is exactly what the hue channel must show.
  const field = matrixField({ D: D_ZFS, By: 0.01 });
  const offDiag = field[0][1];
  assert.ok(offDiag.magnitude > 0);
  assert.ok(Math.abs(Math.abs(offDiag.phase) - Math.PI / 2) < 1e-6);
});

test('transverse field tilts the subspace Bloch vector off the pole', () => {
  // A strong-ish transverse field mixes |0> with |-1>, pulling the Bloch
  // vector toward the equator (nonzero x/y).
  const b = subspaceBloch({ D: D_ZFS, Bx: 0.05 });
  assert.ok(Math.hypot(b.x, b.y) > 1e-3);
});

test('subspaceBloch accepts an explicit subspace argument', () => {
  const b = subspaceBloch({ D: D_ZFS, Bz: 0.001 }, { subspace: ['0', '+1'] });
  const len = Math.hypot(b.x, b.y, b.z);
  assert.ok(len <= 1 + 1e-9 && len > 0.5);
});

test('subspaceBloch guards against a zero-norm projection', () => {
  // At zero field the ground state is pure |0>. Projecting onto the
  // { |+1>, |-1> } subspace has zero amplitude, so the norm is 0 and the
  // `|| 1` guard prevents a divide-by-zero. Result must be finite.
  const b = subspaceBloch({ D: D_ZFS, E: 0, Bx: 0, By: 0, Bz: 0 }, {
    subspace: ['+1', '-1'],
  });
  assert.ok(Number.isFinite(b.x));
  assert.ok(Number.isFinite(b.y));
  assert.ok(Number.isFinite(b.z));
  // With zero amplitude in the subspace, all Bloch components collapse to 0.
  assert.ok(Math.abs(b.x) < 1e-9);
  assert.ok(Math.abs(b.y) < 1e-9);
  assert.ok(Math.abs(b.z) < 1e-9);
});

test('subspaceBloch handles all three call shapes (options defaulting)', () => {
  // no options object at all
  const a = subspaceBloch({ D: D_ZFS });
  // empty options object -> falls back to default subspace
  const b = subspaceBloch({ D: D_ZFS }, {});
  // explicit subspace
  const c = subspaceBloch({ D: D_ZFS }, { subspace: ['0', '-1'] });
  // no-options and empty-options must agree (same default subspace)
  assert.ok(Math.abs(a.z - b.z) < 1e-12);
  assert.ok(Math.abs(a.z - c.z) < 1e-12);
});

test('subspace Bloch: pure |0> ground state points to a pole', () => {
  // With no transverse coupling the ground state is essentially |0>,
  // so within the {|0>,|-1>} subspace it is a pole (|z| ~ 1).
  const b = subspaceBloch({ D: D_ZFS, E: 0, Bz: 0 });
  assert.ok(Math.abs(b.z) > 0.99);
  assert.ok(Math.abs(b.x) < 1e-6);
  assert.ok(Math.abs(b.y) < 1e-6);
});
