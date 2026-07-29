import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  c,
  cAdd,
  cSub,
  cMul,
  cScale,
  cConj,
  cAbs,
  cArg,
  zeros3,
  identity3,
  mAdd,
  mScaleReal,
  mDagger,
  mMul,
  mMaxAbsDiff,
  isHermitian,
} from '../src/complex.js';

const close = (a, b, tol = 1e-12) => Math.abs(a - b) < tol;

test('complex arithmetic basics', () => {
  const a = c(1, 2);
  const b = c(3, -1);
  assert.deepEqual(cAdd(a, b), { re: 4, im: 1 });
  assert.deepEqual(cSub(a, b), { re: -2, im: 3 });
  // (1+2i)(3-i) = 3 - i + 6i - 2i^2 = 3 +5i +2 = 5 +5i
  assert.deepEqual(cMul(a, b), { re: 5, im: 5 });
  assert.deepEqual(cScale(a, 2), { re: 2, im: 4 });
  assert.deepEqual(cConj(a), { re: 1, im: -2 });
});

test('complex modulus and argument', () => {
  assert.ok(close(cAbs(c(3, 4)), 5));
  assert.ok(close(cArg(c(0, 1)), Math.PI / 2));
  assert.ok(close(cArg(c(-1, 0)), Math.PI));
  assert.ok(close(cArg(c(1, 0)), 0));
});

test('zeros and identity constructors', () => {
  const z = zeros3();
  assert.equal(z.length, 3);
  assert.equal(z[0].length, 3);
  assert.ok(z.every((row) => row.every((e) => e.re === 0 && e.im === 0)));
  const id = identity3();
  for (let i = 0; i < 3; i += 1)
    for (let j = 0; j < 3; j += 1)
      assert.equal(id[i][j].re, i === j ? 1 : 0);
});

test('matrix add and real scale', () => {
  const a = identity3();
  const b = mScaleReal(identity3(), 2);
  const s = mAdd(a, b);
  assert.equal(s[0][0].re, 3);
  assert.equal(s[1][1].re, 3);
  assert.equal(s[0][1].re, 0);
});

test('dagger is conjugate transpose', () => {
  const m = zeros3();
  m[0][1] = c(2, 3);
  const d = mDagger(m);
  assert.deepEqual(d[1][0], { re: 2, im: -3 });
  assert.deepEqual(d[0][1], { re: 0, im: 0 });
});

test('matrix multiply against identity', () => {
  const a = zeros3();
  a[0][0] = c(2, 0);
  a[1][2] = c(0, 1);
  a[2][1] = c(0, -1);
  const prod = mMul(a, identity3());
  assert.ok(mMaxAbsDiff(prod, a) < 1e-12);
});

test('matrix multiply numeric check', () => {
  // [[i,0,0],[0,0,0],[0,0,0]]^2 = [[-1,0,0],...]
  const a = zeros3();
  a[0][0] = c(0, 1);
  const sq = mMul(a, a);
  assert.ok(close(sq[0][0].re, -1));
  assert.ok(close(sq[0][0].im, 0));
});

test('isHermitian detects Hermitian and non-Hermitian', () => {
  const h = zeros3();
  h[0][0] = c(1, 0);
  h[0][1] = c(2, 3);
  h[1][0] = c(2, -3); // conjugate -> Hermitian
  assert.ok(isHermitian(h));

  const nh = zeros3();
  nh[0][1] = c(2, 3);
  nh[1][0] = c(2, 3); // not conjugate -> not Hermitian
  assert.ok(!isHermitian(nh));
});

test('mMaxAbsDiff zero for identical matrices', () => {
  assert.equal(mMaxAbsDiff(identity3(), identity3()), 0);
});
