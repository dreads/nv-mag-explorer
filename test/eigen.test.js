import { test } from 'node:test';
import assert from 'node:assert/strict';
import { c, zeros3, cAbs, cMul, cAdd, cSub, mMul, identity3 } from '../src/complex.js';
import { eighHermitian3 } from '../src/eigen.js';

const close = (a, b, tol = 1e-8) => Math.abs(a - b) < tol;

// Helper: multiply matrix by a column vector (array of complex).
const matVec = (m, v) =>
  m.map((row) => row.reduce((acc, z, k) => cAdd(acc, cMul(z, v[k])), c(0, 0)));

test('diagonal matrix returns its diagonal, sorted', () => {
  const m = zeros3();
  m[0][0] = c(5, 0);
  m[1][1] = c(-2, 0);
  m[2][2] = c(1, 0);
  const { values } = eighHermitian3(m);
  assert.ok(close(values[0], -2));
  assert.ok(close(values[1], 1));
  assert.ok(close(values[2], 5));
});

test('eigenvalues are real and correct for a known real-symmetric matrix', () => {
  // [[2,1,0],[1,2,0],[0,0,3]] has eigenvalues 1, 3, 3.
  const m = zeros3();
  m[0][0] = c(2, 0);
  m[1][1] = c(2, 0);
  m[2][2] = c(3, 0);
  m[0][1] = c(1, 0);
  m[1][0] = c(1, 0);
  const { values } = eighHermitian3(m);
  assert.ok(close(values[0], 1));
  assert.ok(close(values[1], 3));
  assert.ok(close(values[2], 3));
});

test('complex Hermitian: eigenvalues match analytic result', () => {
  // [[0, i, 0], [-i, 0, 0], [0,0,7]] -> Pauli-Y-like block has eigenvalues -1,+1
  const m = zeros3();
  m[0][1] = c(0, 1);
  m[1][0] = c(0, -1);
  m[2][2] = c(7, 0);
  const { values } = eighHermitian3(m);
  assert.ok(close(values[0], -1));
  assert.ok(close(values[1], 1));
  assert.ok(close(values[2], 7));
});

test('eigenvectors satisfy H v = lambda v', () => {
  const m = zeros3();
  m[0][0] = c(1, 0);
  m[1][1] = c(2, 0);
  m[2][2] = c(3, 0);
  m[0][1] = c(0, 0.5);
  m[1][0] = c(0, -0.5);
  const { values, vectors } = eighHermitian3(m);
  for (let k = 0; k < 3; k += 1) {
    const lhs = matVec(m, vectors[k]);
    const rhs = vectors[k].map((z) => ({
      re: z.re * values[k],
      im: z.im * values[k],
    }));
    for (let i = 0; i < 3; i += 1) {
      assert.ok(close(lhs[i].re, rhs[i].re, 1e-7));
      assert.ok(close(lhs[i].im, rhs[i].im, 1e-7));
    }
  }
});

test('eigenvectors are normalized', () => {
  const m = zeros3();
  m[0][0] = c(1, 0);
  m[0][1] = c(0.3, 0.4);
  m[1][0] = c(0.3, -0.4);
  m[1][1] = c(-1, 0);
  m[2][2] = c(2, 0);
  const { vectors } = eighHermitian3(m);
  for (const v of vectors) {
    const norm2 = v.reduce((s, z) => s + cAbs(z) ** 2, 0);
    assert.ok(close(norm2, 1, 1e-8));
  }
});

test('eigenvectors are mutually orthogonal', () => {
  const m = zeros3();
  m[0][0] = c(2, 0);
  m[0][1] = c(0, 1);
  m[1][0] = c(0, -1);
  m[1][1] = c(0, 0);
  m[2][2] = c(-3, 0);
  const { vectors } = eighHermitian3(m);
  const inner = (u, v) =>
    u.reduce(
      (acc, z, k) => cAdd(acc, cMul({ re: z.re, im: -z.im }, v[k])),
      c(0, 0)
    );
  for (let i = 0; i < 3; i += 1)
    for (let j = i + 1; j < 3; j += 1) {
      assert.ok(cAbs(inner(vectors[i], vectors[j])) < 1e-7);
    }
});

test('equal diagonal with complex coupling (theta=0 rotation branch)', () => {
  // app == aqq forces the rotation angle theta to 0, exercising the
  // Math.sign(theta || 1) fallback. [[3,i],[-i,3]] has eigenvalues 2 and 4.
  const m = zeros3();
  m[0][0] = c(3, 0);
  m[1][1] = c(3, 0);
  m[0][1] = c(0, 1);
  m[1][0] = c(0, -1);
  m[2][2] = c(9, 0);
  const { values } = eighHermitian3(m);
  assert.ok(close(values[0], 2));
  assert.ok(close(values[1], 4));
  assert.ok(close(values[2], 9));
});

test('already-diagonal input needs no sweeps but still returns correctly', () => {
  const m = identity3();
  const { values } = eighHermitian3(m);
  assert.ok(values.every((v) => close(v, 1)));
});
