#!/usr/bin/env node
/**
 * Generates or updates a locales/<code>.json bundle by machine-translating
 * whatever strings in locales/en.json aren't in it yet (issue #4's "generate
 * bundles using Google translation" step, kept generic rather than
 * hardcoded to Spanish).
 *
 * Uses google-translate-api-x (free, unofficial, no API key/billing —
 * pinned to an exact version in package.json, see the comment there) to hit
 * the same endpoint translate.google.com itself uses. Google Translate only
 * accepts base ISO 639-1 target codes ("es"), not regional variants, so a
 * bundle for "es-MX" or "es-PR" starts from identical machine-translated
 * text to plain "es" — the regional distinction is expected to come from a
 * human verifier for that specific variant, not from this script.
 *
 * Deliberately does NOT touch locales/manifest.json — adding a locale to
 * the picker is a separate, human "this is ready" decision (see README's
 * i18n/l10n/a11y section on the PR contribution model), and
 * src/locale-loader.js already finds a bundle file dropped into locales/
 * independent of the manifest.
 *
 * Usage:
 *   node scripts/translate-locale.mjs <code> --endonym "<text>" --english-name "<text>"
 *   node scripts/translate-locale.mjs es-MX --endonym "Español (México)" --english-name "Spanish (Mexico)"
 *   node scripts/translate-locale.mjs es --force      # re-translate every key, not just new ones
 *   node scripts/translate-locale.mjs es --dry-run    # preview without writing or calling the network
 *
 * Re-running with no changes to en.json is a safe, cheap no-op (0 new keys
 * -> no network call, no file write) -- that's the actual "automate *new*
 * strings" behavior this script exists for, not just one-shot generation.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { translate } from 'google-translate-api-x';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const LOCALES_DIR = path.join(ROOT, 'locales');

/** Flatten a nested strings tree ({ui: {heading: "..."}}) into dot-path keys
 * ({"ui.heading": "..."}). Recurses on any plain object; a string value ends
 * the recursion. Mirrors the dot-path addressing src/i18n.js's getPath()
 * already uses at runtime. */
export function flattenStrings(strings, prefix = '') {
  const out = {};
  for (const [key, value] of Object.entries(strings)) {
    const dotPath = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      out[dotPath] = value;
    } else if (value && typeof value === 'object') {
      Object.assign(out, flattenStrings(value, dotPath));
    }
  }
  return out;
}

/** Inverse of flattenStrings: rebuild the nested strings tree from dot-path keys. */
export function unflattenStrings(flat) {
  const out = {};
  for (const [dotPath, value] of Object.entries(flat)) {
    const parts = dotPath.split('.');
    let node = out;
    parts.forEach((part, i) => {
      if (i === parts.length - 1) {
        node[part] = value;
      } else {
        node[part] = node[part] || {};
        node = node[part];
      }
    });
  }
  return out;
}

/** Keys present in en but not yet in the target bundle -- or every en key
 * when force-regenerating a bundle from scratch. */
export function diffMissingKeys(enFlat, targetFlat, force = false) {
  const enKeys = Object.keys(enFlat);
  return force ? enKeys : enKeys.filter((key) => !(key in targetFlat));
}

/** Keys present in the target bundle that no longer exist in en -- orphaned
 * by a rename/removal upstream. Reported, then dropped from the output so a
 * regenerated bundle keeps passing test/locale-bundles.test.js's "no
 * unknown keys" check instead of accumulating stale translations. */
export function diffStaleKeys(enFlat, targetFlat) {
  return Object.keys(targetFlat).filter((key) => !(key in enFlat));
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--force') args.force = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--endonym') args.endonym = argv[++i];
    else if (arg === '--english-name') args.englishName = argv[++i];
    else if (arg === '--target') args.target = argv[++i];
    else if (arg === '--direction') args.direction = argv[++i];
    else args._.push(arg);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const code = args._[0];
  if (!code) {
    console.error(
      'Usage: node scripts/translate-locale.mjs <code> [--endonym "..."] ' +
      '[--english-name "..."] [--target <lang>] [--direction ltr|rtl] [--force] [--dry-run]'
    );
    process.exit(1);
  }

  const en = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'en.json'), 'utf8'));
  const enFlat = flattenStrings(en.strings);

  const targetPath = path.join(LOCALES_DIR, `${code}.json`);
  const existing = fs.existsSync(targetPath)
    ? JSON.parse(fs.readFileSync(targetPath, 'utf8'))
    : null;
  const targetFlat = existing ? flattenStrings(existing.strings) : {};

  const missing = diffMissingKeys(enFlat, targetFlat, args.force);
  const stale = diffStaleKeys(enFlat, targetFlat);

  if (stale.length) {
    console.log(`${stale.length} stale key(s) in ${code}.json no longer in en.json (will be dropped): ${stale.join(', ')}`);
  }

  if (!missing.length) {
    console.log(`0 new keys to translate for "${code}"; ${Object.keys(targetFlat).length - stale.length} already covered. Nothing to do.`);
    return;
  }

  const endonym = args.endonym ?? existing?.meta?.endonym;
  const englishName = args.englishName ?? existing?.meta?.englishName;
  if (!endonym || !englishName) {
    console.error(
      `Missing --endonym/--english-name -- required the first time "${code}" is generated ` +
      '(no lookup table; pass them explicitly rather than risk guessing wrong).'
    );
    process.exit(1);
  }
  const direction = args.direction ?? existing?.meta?.direction ?? 'ltr';
  const targetsVersion = existing?.meta?.targetsVersion ?? '1';
  const targetLang = args.target ?? code.split('-')[0];

  console.log(`Translating ${missing.length} key(s) from en to "${targetLang}" for "${code}"...`);

  if (args.dryRun) {
    missing.forEach((key) => console.log(`  [dry-run] ${key}: ${enFlat[key]}`));
    return;
  }

  const toTranslate = {};
  missing.forEach((key) => { toTranslate[key] = enFlat[key]; });
  const results = await translate(toTranslate, { from: 'en', to: targetLang });

  const merged = { ...targetFlat };
  stale.forEach((key) => delete merged[key]);
  missing.forEach((key) => { merged[key] = results[key].text; });

  const bundle = {
    meta: {
      code,
      endonym,
      englishName,
      direction,
      targetsVersion,
      // Marks this bundle (or the keys just added to it) as machine-translated
      // and not yet human-reviewed -- see schema/locale-bundle.schema.json.
      // A verifier should remove this field (or set it to "human") once
      // they've checked the content, per issue #4's verification step.
      translationStatus: 'machine',
    },
    strings: unflattenStrings(merged),
  };

  fs.writeFileSync(targetPath, JSON.stringify(bundle, null, 2) + '\n');
  console.log(
    `Wrote ${targetPath}: ${missing.length} translated, ` +
    `${Object.keys(targetFlat).length - stale.length} preserved, ${stale.length} dropped.`
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
