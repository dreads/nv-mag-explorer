import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPath } from '../src/i18n.js';

// This is the shape check a contributed locale PR is expected to pass (see
// README's i18n/l10n/a11y section): every locales/*.json file gets
// validated here, the same way bell-state-explorer hand-checks its own
// locale bundles — no schema-validation library, zero-dependency project.

const LOCALES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'locales');
const REQUIRED_META = ['code', 'endonym', 'englishName', 'direction', 'targetsVersion'];

function bundleFiles() {
  return fs.readdirSync(LOCALES_DIR).filter((file) => file.endsWith('.json') && file !== 'manifest.json');
}

function readBundle(file) {
  return JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, file), 'utf8'));
}

// Visits every leaf (string, number, whatever) in a strings tree, calling
// visit(dotPath, value) for each. Recurses to any depth so both 2-level
// sections (footer.physicsNote) and 3-level ones (catalog.rabi.label) are
// covered without hardcoding a nesting depth here.
function walkStrings(node, prefix, visit) {
  Object.entries(node).forEach(([key, value]) => {
    const dotPath = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      walkStrings(value, dotPath, visit);
    } else {
      visit(dotPath, value);
    }
  });
}

// en.json is the single source of truth for English strings — no separate
// .js copy to keep in sync (see README's i18n/l10n/a11y section).
const en = readBundle('en.json');

test('at least one locale bundle exists to validate', () => {
  assert.ok(bundleFiles().length > 0);
});

test('every locale bundle file is valid JSON with the required top-level shape', () => {
  bundleFiles().forEach((file) => {
    const bundle = readBundle(file);
    assert.ok(bundle.meta, `${file} is missing "meta"`);
    assert.ok(bundle.strings, `${file} is missing "strings"`);
  });
});

test('every locale bundle has all required meta fields, a valid direction, and a plausible BCP-47 code', () => {
  bundleFiles().forEach((file) => {
    const { meta } = readBundle(file);
    REQUIRED_META.forEach((key) => {
      assert.ok(key in meta, `${file} is missing meta.${key}`);
    });
    assert.ok(['ltr', 'rtl'].includes(meta.direction), `${file} has an invalid meta.direction: ${meta.direction}`);
    assert.match(meta.code, /^[a-z]{2,3}(-[A-Z][a-z]{3})?(-[A-Z]{2})?$/, `${file}'s meta.code "${meta.code}" isn't a plausible BCP-47 tag`);
  });
});

test('every locale bundle only references sections/keys that exist in locales/en.json (catches typos)', () => {
  bundleFiles().forEach((file) => {
    if (file === 'en.json') return; // it IS the reference, nothing to check against itself
    const { strings } = readBundle(file);
    walkStrings(strings, '', (dotPath) => {
      assert.ok(
        getPath(en.strings, dotPath) !== undefined,
        `${file} has an unknown key "${dotPath}" (not in locales/en.json — check for a typo)`
      );
    });
  });
});

test('every value in every locale bundle is a string (no accidental objects/numbers)', () => {
  bundleFiles().forEach((file) => {
    const { strings } = readBundle(file);
    walkStrings(strings, '', (dotPath, value) => {
      assert.equal(typeof value, 'string', `${file}'s strings.${dotPath} should be a string, got ${typeof value}`);
    });
  });
});

test('the qaa and qab mock bundles are complete (cover every key in locales/en.json)', () => {
  ['qaa.json', 'qab.json'].forEach((file) => {
    if (!fs.existsSync(path.join(LOCALES_DIR, file))) return;
    const { strings } = readBundle(file);
    walkStrings(en.strings, '', (dotPath) => {
      assert.ok(
        getPath(strings, dotPath) !== undefined,
        `${file} is missing strings.${dotPath} — it's meant to be a complete bundle`
      );
    });
  });
});
