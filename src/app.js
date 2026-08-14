import { translate } from './i18n.js';
import { loadManifest, loadLocaleBundle, detectLocale } from './locale-loader.js';
import { CATALOG, DEFAULT_SPOTLIGHT } from './catalog.js';

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
  ['locale-picker', 'catalog-cards', 'spotlight-video', 'spotlight-image', 'spotlight-caption'].forEach((id) => {
    dom[id] = document.getElementById(id);
  });
}

// Mirrors locales/en.json's shape ({ catalog: { <id>: { label, note, detail,
// spotlightCaption } }, ui: { toolboxCaption } }) but built synchronously
// from src/catalog.js's own literals -- so catalog text (and the default
// spotlight's caption) renders correctly the instant renderCatalog() runs,
// with no dependency on en.json's fetch ever completing.
const catalogFallback = { catalog: {}, ui: { toolboxCaption: DEFAULT_SPOTLIGHT.caption } };
CATALOG.forEach((entry) => {
  catalogFallback.catalog[entry.id] = {
    label: entry.label,
    note: entry.note,
    detail: entry.detail,
    spotlightCaption: entry.spotlight.caption,
  };
});

/** Looks up `key` in the active locale, falling back to catalogFallback's English literal. */
function catalogText(key) {
  return translate(activeLocale ? activeLocale.strings : {}, catalogFallback, key);
}

function findCatalogEntry(id) {
  return CATALOG.find((entry) => entry.id === id);
}

/**
 * Builds one detail <p> (always a plain paragraph; the caller decides
 * whether it's always-visible or lives inside a <details>).
 */
function buildDetailParagraph(entry) {
  const detail = document.createElement('p');
  detail.className = 'note-detail';
  detail.dataset.i18n = entry.detailKey;
  detail.textContent = catalogText(entry.detailKey);
  return detail;
}

/**
 * Builds one .card per CATALOG entry into #catalog-cards. Each generated
 * element gets a data-i18n attribute too, so the existing applyLocale()
 * sweep (which walks every [data-i18n] element in the document) picks these
 * up on every locale switch with no changes needed there.
 *
 * Entries with `glossaryNote: true` render their note/detail as a
 * <details><summary> disclosure instead of an always-visible <span>+<p> --
 * native keyboard/AT semantics for free (Enter/Space on the focused summary
 * toggles it, screen readers announce expanded/collapsed), with hover-to-open
 * layered on top in wireSpotlight() below for mouse users. See
 * src/catalog.js's top comment for the field.
 */
function renderCatalog() {
  const mount = dom['catalog-cards'];
  mount.innerHTML = '';
  CATALOG.forEach((entry) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.catalogId = entry.id;

    const link = document.createElement('a');
    link.href = entry.href;

    const label = document.createElement('span');
    label.className = 'label';
    label.dataset.i18n = entry.labelKey;
    label.textContent = catalogText(entry.labelKey);
    link.append(label);

    if (entry.glossaryNote) {
      const summary = document.createElement('summary');
      summary.className = 'note';
      summary.dataset.i18n = entry.noteKey;
      summary.textContent = catalogText(entry.noteKey);

      const details = document.createElement('details');
      details.className = 'note-gloss';
      details.append(summary, buildDetailParagraph(entry));
      details.addEventListener('mouseenter', () => { details.open = true; });
      details.addEventListener('mouseleave', () => { details.open = false; });

      card.append(link, details);
    } else {
      const note = document.createElement('span');
      note.className = 'note';
      note.dataset.i18n = entry.noteKey;
      note.textContent = catalogText(entry.noteKey);
      link.append(note);

      card.append(link, buildDetailParagraph(entry));
    }

    mount.appendChild(card);
  });
}

/** Swaps the hero panel's media + caption to `spotlight` (an entry's
 * `.spotlight` field, or DEFAULT_SPOTLIGHT). */
function setSpotlight(spotlight) {
  const isVideo = spotlight.type === 'video';
  const video = dom['spotlight-video'];
  const image = dom['spotlight-image'];
  video.hidden = !isVideo;
  image.hidden = isVideo;
  if (isVideo) {
    // More than one CATALOG entry can be type: 'video' (e.g. Rabi and
    // Ramsey both are), so the <source> may need to point at a different
    // clip than whatever it currently has -- swap it and reload only when
    // it actually changes, to avoid restarting the same clip on every
    // hover. load() doesn't resume autoplay on its own in every browser,
    // so play() is called explicitly; its promise is ignored since a
    // rejection here (e.g. a stray focus/blur race) isn't actionable.
    const source = video.querySelector('source');
    if (source.getAttribute('src') !== spotlight.src) {
      source.src = spotlight.src;
      video.load();
      video.play().catch(() => {});
    }
  } else {
    image.src = spotlight.src;
  }
  const caption = dom['spotlight-caption'];
  caption.dataset.i18n = spotlight.captionKey;
  caption.textContent = catalogText(spotlight.captionKey);
}

/**
 * Delegated hover/focus wiring on #catalog-cards, rather than one listener
 * pair per card. mouseover/mouseout bubble from a card's inner spans/<p>
 * too, so relatedTarget is checked to ignore moves that stay inside the
 * same card -- otherwise crossing from the <a> to the .note-detail <p>
 * within one card would flicker the spotlight back to default. focusin/
 * focusout don't need that check: a card's only focusable element is its
 * one <a>.
 */
function wireSpotlight() {
  const mount = dom['catalog-cards'];

  mount.addEventListener('mouseover', (e) => {
    const card = e.target.closest('.card');
    if (!card || (e.relatedTarget && card.contains(e.relatedTarget))) return;
    const entry = findCatalogEntry(card.dataset.catalogId);
    if (entry) setSpotlight(entry.spotlight);
  });
  mount.addEventListener('mouseout', (e) => {
    const card = e.target.closest('.card');
    if (!card || (e.relatedTarget && card.contains(e.relatedTarget))) return;
    setSpotlight(DEFAULT_SPOTLIGHT);
  });
  mount.addEventListener('focusin', (e) => {
    const card = e.target.closest('.card');
    const entry = card && findCatalogEntry(card.dataset.catalogId);
    if (entry) setSpotlight(entry.spotlight);
  });
  mount.addEventListener('focusout', (e) => {
    if (e.target.closest('.card')) setSpotlight(DEFAULT_SPOTLIGHT);
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
  renderCatalog();
  wireSpotlight();
  dom['locale-picker'].addEventListener('change', (e) => onLocaleChange(e.target.value));
  initLocale();
}

document.addEventListener('DOMContentLoaded', init);
