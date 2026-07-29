// Minimal complex-number and 3x3 complex-matrix utilities.
// Kept dependency-free and small: only what the NV Hamiltonian needs.
//
// A complex number is { re, im }. A matrix is a 3x3 array of complex numbers.

export const c = (re = 0, im = 0) => ({ re, im });

export const cAdd = (a, b) => ({ re: a.re + b.re, im: a.im + b.im });
export const cSub = (a, b) => ({ re: a.re - b.re, im: a.im - b.im });
export const cMul = (a, b) => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});
export const cScale = (a, s) => ({ re: a.re * s, im: a.im * s });
// Normalize -0 to 0 so downstream phase (atan2) never flips hue at zero.
export const cConj = (a) => ({ re: a.re, im: a.im === 0 ? 0 : -a.im });
export const cAbs = (a) => Math.hypot(a.re, a.im);
export const cArg = (a) => Math.atan2(a.im, a.re);

// Zero and identity builders for 3x3.
export const zeros3 = () =>
  Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => c(0, 0)));

export const identity3 = () => {
  const m = zeros3();
  for (let i = 0; i < 3; i += 1) m[i][i] = c(1, 0);
  return m;
};

// Matrix addition (element-wise).
export const mAdd = (a, b) => {
  const out = zeros3();
  for (let i = 0; i < 3; i += 1)
    for (let j = 0; j < 3; j += 1) out[i][j] = cAdd(a[i][j], b[i][j]);
  return out;
};

// Scalar multiply a matrix by a real number.
export const mScaleReal = (a, s) => {
  const out = zeros3();
  for (let i = 0; i < 3; i += 1)
    for (let j = 0; j < 3; j += 1) out[i][j] = cScale(a[i][j], s);
  return out;
};

// Conjugate transpose.
export const mDagger = (a) => {
  const out = zeros3();
  for (let i = 0; i < 3; i += 1)
    for (let j = 0; j < 3; j += 1) out[i][j] = cConj(a[j][i]);
  return out;
};

// Matrix multiply (3x3 by 3x3).
export const mMul = (a, b) => {
  const out = zeros3();
  for (let i = 0; i < 3; i += 1)
    for (let j = 0; j < 3; j += 1) {
      let acc = c(0, 0);
      for (let k = 0; k < 3; k += 1) acc = cAdd(acc, cMul(a[i][k], b[k][j]));
      out[i][j] = acc;
    }
  return out;
};

// Largest absolute difference between two matrices — used by tests.
export const mMaxAbsDiff = (a, b) => {
  let worst = 0;
  for (let i = 0; i < 3; i += 1)
    for (let j = 0; j < 3; j += 1) {
      worst = Math.max(worst, cAbs(cSub(a[i][j], b[i][j])));
    }
  return worst;
};

// Is this matrix Hermitian to within tol?
export const isHermitian = (a, tol = 1e-9) => mMaxAbsDiff(a, mDagger(a)) < tol;
