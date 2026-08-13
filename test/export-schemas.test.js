import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Shape check for the two export schemas added for issue #3
// (schema/rabi-export.schema.json, schema/ramsey-export.schema.json).
// index_rabi.html/index_ramsey.html are deliberately non-module single
// files (see CLAUDE.md), so node --test can't import their
// buildExportPayload() the way bell-state-explorer's test/export.test.js
// imports src/export.js — there's nothing to import from an HTML file.
// This test instead hand-validates the schema files themselves, the same
// "no schema-validation library, zero-dependency project" style
// test/locale-bundles.test.js already uses for schema/locale-bundle.schema.json.
// Whether the in-browser payload actually matches these schemas is verified
// manually (see the plan for issue #3): correctness of the underlying
// physics is verify/'s job, not a JS unit test, matching how this repo
// already treats every other formula in these two pages.

const SCHEMA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'schema');

function readSchema(file) {
  return JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, file), 'utf8'));
}

const REQUIRED_TOP_LEVEL = ['$schema', 'schemaVersion', 'exportedAt', 'settings', 'measurements'];

const EXPECTED = {
  'rabi-export.schema.json': {
    settings: [
      'distanceCm', 'polarity', 'rabiFreqMHz', 'driveFreqGHz', 't2StarUs',
      'magnetStrength', 'simTimeUs',
    ],
    measurements: [
      'fieldMt', 'resonancePlusGHz', 'resonanceMinusGHz', 'detuningMHz', 'onResonance',
      'rabiFreqEffectiveMHz', 'amplitudeFraction', 'populationNow', 'blochVector', 'odmr',
    ],
  },
  'ramsey-export.schema.json': {
    settings: [
      'tauUs', 'driveFreqGHz', 't2StarUs', 'fieldSensitivity', 'vehiclePosition',
      'sequencePosition',
    ],
    measurements: [
      'fieldMt', 'detuningMHz', 'detuningRadPerUs', 'phaseAtTauRad', 'populationAtTau',
      'stage', 'blochVector',
    ],
  },
};

test('both export schema files exist and are valid JSON', () => {
  Object.keys(EXPECTED).forEach((file) => {
    assert.doesNotThrow(() => readSchema(file), `${file} is not valid JSON`);
  });
});

test('both export schemas declare draft 2020-12 and a matching $id', () => {
  Object.keys(EXPECTED).forEach((file) => {
    const schema = readSchema(file);
    assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
    assert.equal(
      schema.$id,
      `https://raw.githubusercontent.com/dreads/nv-mag-explorer/main/schema/${file}`
    );
  });
});

test('both export schemas require the same bell-state-explorer-aligned top-level shape', () => {
  Object.keys(EXPECTED).forEach((file) => {
    const schema = readSchema(file);
    assert.deepEqual([...schema.required].sort(), [...REQUIRED_TOP_LEVEL].sort(), `${file}'s required list drifted`);
    assert.equal(schema.additionalProperties, false, `${file} should reject unknown top-level keys`);
  });
});

test('each schema\'s settings/measurements $defs require exactly the documented fields', () => {
  Object.entries(EXPECTED).forEach(([file, expected]) => {
    const schema = readSchema(file);
    ['settings', 'measurements'].forEach((section) => {
      const def = schema.$defs[section];
      assert.ok(def, `${file} is missing $defs.${section}`);
      assert.deepEqual(
        [...def.required].sort(),
        [...expected[section]].sort(),
        `${file}'s $defs.${section}.required drifted from what index_${file.startsWith('rabi') ? 'rabi' : 'ramsey'}.html exports`
      );
      assert.equal(def.additionalProperties, false, `${file}'s $defs.${section} should reject unknown keys`);
    });
  });
});

test('schemaVersion pattern matches semantic versioning', () => {
  Object.keys(EXPECTED).forEach((file) => {
    const schema = readSchema(file);
    assert.equal(schema.properties.schemaVersion.pattern, '^[0-9]+\\.[0-9]+\\.[0-9]+$');
  });
});
