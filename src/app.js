import { translate } from './i18n.js';
import { loadManifest, loadLocaleBundle, detectLocale } from './locale-loader.js';
import en from '../locales/en.js';

const LOCALE_STORAGE_KEY = 'nv-mag-locale';

// `en` is always the fallback bundle, so any locale — including a partial
// PR-contributed one — degrades to English per-key rather than breaking.
// `activeLocale` starts as `en` so the first paint is never blank while
// initLocale() resolves a saved preference or auto-detected match.
let activeLocale = en;

/** Shorthand for translate() against the currently active locale. */
function t(key, params) {
  return translate(activeLocale.strings, en.strings, key, params);
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
 * Applies every [data-i18n]-tagged static element in one pass, plus the two
 * document-level pieces (title, meta description) that aren't inside <body>
 * or don't use textContent. This page has no model-driven readouts, so this
 * is the entire render path — unlike bell-state-explorer's app.js, there is
 * no separate render() for slider-driven text.
 */
function applyStaticText() {
  document.title = t('ui.docTitle');
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('ui.metaDescription'));
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
}

function applyLocale(bundle) {
  activeLocale = bundle;
  document.documentElement.lang = bundle.meta.code;
  document.documentElement.dir = bundle.meta.direction;
  ensureOption(bundle);
  dom['locale-picker'].value = bundle.meta.code;
  applyStaticText();
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
    applyLocale(en);
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    return;
  }
  const bundle = await loadLocaleBundle(code);
  if (!bundle) {
    dom['locale-picker'].value = activeLocale.meta.code;
    return;
  }
  applyLocale(bundle);
  localStorage.setItem(LOCALE_STORAGE_KEY, code);
}

/**
 * Populates the picker from locales/manifest.json, then resolves the active
 * locale: an explicit saved preference wins over auto-detection, which in
 * turn is tried independently of the manifest (see locale-loader.js) so a
 * bundle file copied straight into locales/ is found even with no manifest
 * entry at all. Runs after the first synchronous English render, so a slow
 * or failed fetch never blocks the initial paint.
 */
async function initLocale() {
  const manifest = await loadManifest();
  populatePicker(manifest);

  const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (saved && saved !== 'en') {
    const bundle = await loadLocaleBundle(saved);
    if (bundle) {
      applyLocale(bundle);
      return;
    }
  }
  if (saved === 'en') return;

  const detected = await detectLocale(navigator.languages || [navigator.language]);
  if (detected) applyLocale(detected.bundle);
}

function init() {
  query();
  applyStaticText();
  dom['locale-picker'].addEventListener('change', (e) => onLocaleChange(e.target.value));
  initLocale();
}

document.addEventListener('DOMContentLoaded', init);
