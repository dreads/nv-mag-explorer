import { translate } from './i18n.js';
import { loadManifest, loadLocaleBundle, detectLocale } from './locale-loader.js';

const LOCALE_STORAGE_KEY = 'nv-mag-locale';

// This page has no model/render() — every [data-i18n] element's static HTML
// text IS the default English render, already correct on arrival. So unlike
// a model-driven app, the default (English, no saved/detected preference)
// case needs *zero* JS work: no fetch, no textContent writes, nothing to
// flash-then-replace. `activeLocale` stays null in that case; the DOM is
// simply left alone.
let activeLocale = null;

// English is fetched lazily — from locales/en.json, same as every other
// locale — only once it's actually needed as translate()'s fallback bundle
// (a non-English locale is applied, or the picker switches back to "en").
// initLocale() fires a background prefetch so this is normally warm before
// anyone touches the picker; nothing blocks on it either way.
let englishBundle = null;
let englishPromise = null;
function ensureEnglish() {
  if (englishBundle) return Promise.resolve(englishBundle);
  if (!englishPromise) {
    englishPromise = loadLocaleBundle('en').then((bundle) => {
      englishBundle = bundle;
      englishPromise = null;
      return bundle;
    });
  }
  return englishPromise;
}

const dom = {};

function query() {
  ['locale-picker'].forEach((id) => {
    dom[id] = document.getElementById(id);
  });
}

/** Add `bundle` as a picker option if it isn't already listed (covers a
 * locale that was auto-detected or manually loaded but never made it into
 * locales/manifest.json). */
function ensureOption(bundle) {
  const select = dom['locale-picker'];
  const exists = Array.from(select.options).some((o) => o.value === bundle.meta.code);
  if (!exists) {
    const option = document.createElement('option');
    option.value = bundle.meta.code;
    option.textContent = bundle.meta.endonym || bundle.meta.englishName || bundle.meta.code;
    select.appendChild(option);
  }
}

/**
 * Applies `bundle` to every [data-i18n]-tagged element plus the two
 * document-level pieces (title, meta description) that don't use
 * textContent. `fallback` degrades a partial bundle per-key; falls back to
 * `bundle` itself (a no-op fallback) if English hasn't finished loading yet
 * — translate() already degrades to the raw key if a lookup misses both.
 */
function applyLocale(bundle) {
  activeLocale = bundle;
  document.documentElement.lang = bundle.meta.code;
  document.documentElement.dir = bundle.meta.direction;
  ensureOption(bundle);
  dom['locale-picker'].value = bundle.meta.code;

  const fallback = englishBundle || bundle;
  document.title = translate(bundle.strings, fallback.strings, 'ui.docTitle');
  document.querySelector('meta[name="description"]')?.setAttribute('content', translate(bundle.strings, fallback.strings, 'ui.metaDescription'));
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = translate(bundle.strings, fallback.strings, el.dataset.i18n);
  });
}

function populatePicker(manifestEntries) {
  const select = dom['locale-picker'];
  const existing = new Set(Array.from(select.options).map((o) => o.value));
  manifestEntries.forEach((entry) => {
    if (existing.has(entry.code)) return;
    const option = document.createElement('option');
    option.value = entry.code;
    option.textContent = entry.endonym || entry.englishName || entry.code;
    select.appendChild(option);
  });
}

async function onLocaleChange(code) {
  if (code === 'en') {
    const bundle = await ensureEnglish();
    if (!bundle) return; // fetch failed; leave whatever's currently applied alone
    applyLocale(bundle);
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    return;
  }
  const bundle = await loadLocaleBundle(code);
  if (!bundle) {
    dom['locale-picker'].value = activeLocale ? activeLocale.meta.code : 'en';
    return;
  }
  await ensureEnglish(); // best-effort: have the fallback ready before applying
  applyLocale(bundle);
  localStorage.setItem(LOCALE_STORAGE_KEY, code);
}

/**
 * Populates the picker from locales/manifest.json, then resolves the active
 * locale: an explicit saved preference wins over auto-detection, which in
 * turn is tried independently of the manifest (see locale-loader.js) so a
 * bundle file copied straight into locales/ is found even with no manifest
 * entry at all. None of this blocks the initial paint — the static HTML
 * already is the correct default-English render.
 */
async function initLocale() {
  const manifest = await loadManifest();
  populatePicker(manifest);
  ensureEnglish(); // background prefetch; ignored if it fails, retried on next ensureEnglish() call

  const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (saved && saved !== 'en') {
    const bundle = await loadLocaleBundle(saved);
    if (bundle) {
      await ensureEnglish();
      applyLocale(bundle);
      return;
    }
  }
  if (saved === 'en') {
    const bundle = await ensureEnglish();
    if (bundle) {
      activeLocale = bundle; // DOM already matches; just sync state + picker
      dom['locale-picker'].value = 'en';
    }
    return;
  }

  const detected = await detectLocale(navigator.languages || [navigator.language]);
  if (detected) {
    await ensureEnglish();
    applyLocale(detected.bundle);
  }
}

function init() {
  query();
  dom['locale-picker'].addEventListener('change', (e) => onLocaleChange(e.target.value));
  initLocale();
}

document.addEventListener('DOMContentLoaded', init);
