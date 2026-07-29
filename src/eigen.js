// Eigendecomposition of a 3x3 complex Hermitian matrix.
//
// Uses the cyclic Jacobi method extended to complex (Hermitian) matrices.
// For a Hermitian H, eigenvalues are real and eigenvectors are orthonormal.
// A 3x3 converges in a few sweeps, which is plenty for real-time UI use.
//
// Returns { values: number[3], vectors: complex[3][3] } where vectors[k] is
// the k-th eigenvector (a length-3 array of complex numbers), paired with
// values[k]. Results are sorted ascending by eigenvalue.

import { c, cAbs, cMul, cConj, cAdd, cScale } from './complex.js';

const clone = (m) => m.map((row) => row.map((z) => ({ re: z.re, im: z.im })));

// Off-diagonal magnitude, used as the convergence measure.
const offNorm = (m) => {
  let s = 0;
  for (let i = 0; i < 3; i += 1)
    for (let j = 0; j < 3; j += 1)
      if (i !== j) s += m[i][j].re * m[i][j].re + m[i][j].im * m[i][j].im;
  return Math.sqrt(s);
};

export function eighHermitian3(input, { maxSweeps = 100, tol = 1e-14 } = {}) {
  const a = clone(input);

  // Accumulated eigenvectors: columns of v. Start as identity.
  const v = [
    [c(1, 0), c(0, 0), c(0, 0)],
    [c(0, 0), c(1, 0), c(0, 0)],
    [c(0, 0), c(0, 0), c(1, 0)],
  ];

  for (let sweep = 0; sweep < maxSweeps; sweep += 1) {
    if (offNorm(a) < tol) break;

    for (let p = 0; p < 2; p += 1) {
      for (let q = p + 1; q < 3; q += 1) {
        const apq = a[p][q];
        if (cAbs(apq) < tol) continue;

        // Build the 2x2 Hermitian rotation that zeros a[p][q].
        // absApq > 0 here: the `continue` above skips negligible entries.
        const absApq = cAbs(apq);
        const phase = { re: apq.re / absApq, im: apq.im / absApq };

        const app = a[p][p].re;
        const aqq = a[q][q].re;

        // Rotation angle for the real, phase-stripped problem.
        const theta = (aqq - app) / (2 * absApq);
        const t =
          Math.sign(theta || 1) /
          (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const cs = 1 / Math.sqrt(t * t + 1);
        const sn = t * cs;

        // Complex rotation entries: c is real, s carries the phase.
        const cosZ = c(cs, 0);
        const sinZ = cScale(phase, sn); // s * e^{i arg(apq)}
        const sinZconj = cConj(sinZ);

        // Apply J^dagger A J and update eigenvector accumulator V J.
        applyJacobi(a, v, p, q, cosZ, sinZ, sinZconj);
      }
    }
  }

  // Extract real eigenvalues from the (now near-diagonal) matrix.
  const values = [a[0][0].re, a[1][1].re, a[2][2].re];

  // Eigenvectors are the columns of v.
  const vectors = [0, 1, 2].map((k) => [v[0][k], v[1][k], v[2][k]]);

  // Sort ascending by eigenvalue, keeping vectors paired.
  const order = [0, 1, 2].sort((i, j) => values[i] - values[j]);
  return {
    values: order.map((i) => values[i]),
    vectors: order.map((i) => vectors[i]),
  };
}

// In-place application of a complex Jacobi rotation on the (p,q) plane to
// both the matrix `a` (as J^dagger A J) and the accumulator `v` (as V J).
function applyJacobi(a, v, p, q, cosZ, sinZ, sinZconj) {
  // Update rows p and q of A: A' = J^dagger A.
  for (let k = 0; k < 3; k += 1) {
    const akp = a[p][k];
    const akq = a[q][k];
    // new row p = cos * row_p + conj(sin) * row_q
    a[p][k] = cAdd(cMul(cosZ, akp), cMul(sinZconj, akq));
    // new row q = -sin * row_p + cos * row_q
    a[q][k] = cAdd(cScale(cMul(sinZ, akp), -1), cMul(cosZ, akq));
  }
  // Update columns p and q of A: A'' = A' J.
  for (let k = 0; k < 3; k += 1) {
    const apk = a[k][p];
    const aqk = a[k][q];
    // new col p = cos * col_p + sin * col_q
    a[k][p] = cAdd(cScale(cMul(cosZ, apk), 1), cMul(sinZ, aqk));
    // new col q = conj(sin)*(-1) * col_p + cos * col_q
    a[k][q] = cAdd(cScale(cMul(sinZconj, apk), -1), cMul(cosZ, aqk));
  }
  // Update eigenvector accumulator: V' = V J (columns p,q only).
  for (let k = 0; k < 3; k += 1) {
    const vkp = v[k][p];
    const vkq = v[k][q];
    v[k][p] = cAdd(cScale(cMul(cosZ, vkp), 1), cMul(sinZ, vkq));
    v[k][q] = cAdd(cScale(cMul(sinZconj, vkp), -1), cMul(cosZ, vkq));
  }
}
