import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  flattenStrings,
  unflattenStrings,
  diffMissingKeys,
  diffStaleKeys,
} from '../scripts/translate-locale.mjs';

// Pure-logic tests for scripts/translate-locale.mjs's helper functions, with
// plain fixtures -- no network mocking. The network-calling part (the
// actual translate() call) is verified manually per the issue #4 plan, the
// same "correctness of anything touching a live external system is
// verified by hand, pure logic gets a unit test" split used for the
// buildExportPayload() functions added for issue #3.

const NESTED = {
  ui: { heading: 'Hello', subtitle: 'World' },
  footer: { note: 'Bye' },
};
const FLAT = {
  'ui.heading': 'Hello',
  'ui.subtitle': 'World',
  'footer.note': 'Bye',
};

test('flattenStrings turns a nested strings tree into dot-path keys', () => {
  assert.deepEqual(flattenStrings(NESTED), FLAT);
});

test('unflattenStrings is the exact inverse of flattenStrings', () => {
  assert.deepEqual(unflattenStrings(FLAT), NESTED);
  assert.deepEqual(unflattenStrings(flattenStrings(NESTED)), NESTED);
});

test('flattenStrings only descends into plain objects, not other types', () => {
  // defensive: a locale bundle's strings tree should only ever contain
  // nested objects and strings, but a malformed bundle shouldn't crash the
  // script -- non-string/non-object values are simply skipped.
  const withJunk = { ui: { heading: 'Hi', count: 3, missing: null } };
  assert.deepEqual(flattenStrings(withJunk), { 'ui.heading': 'Hi' });
});

test('diffMissingKeys finds only keys present in en but absent from the target', () => {
  const en = { 'ui.a': '1', 'ui.b': '2', 'ui.c': '3' };
  const target = { 'ui.a': 'uno' };
  assert.deepEqual(diffMissingKeys(en, target), ['ui.b', 'ui.c']);
});

test('diffMissingKeys returns every en key when force is true, even if already present', () => {
  const en = { 'ui.a': '1', 'ui.b': '2' };
  const target = { 'ui.a': 'uno' };
  assert.deepEqual(diffMissingKeys(en, target, true), ['ui.a', 'ui.b']);
});

test('diffMissingKeys returns nothing when the target already covers every en key', () => {
  const en = { 'ui.a': '1' };
  const target = { 'ui.a': 'uno', 'ui.b': 'dos' };
  assert.deepEqual(diffMissingKeys(en, target), []);
});

test('diffStaleKeys finds target keys no longer present in en', () => {
  const en = { 'ui.a': '1' };
  const target = { 'ui.a': 'uno', 'ui.removed': 'old' };
  assert.deepEqual(diffStaleKeys(en, target), ['ui.removed']);
});

test('diffStaleKeys returns nothing when every target key still exists in en', () => {
  const en = { 'ui.a': '1', 'ui.b': '2' };
  const target = { 'ui.a': 'uno' };
  assert.deepEqual(diffStaleKeys(en, target), []);
});
