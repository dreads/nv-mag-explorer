#!/usr/bin/env node
/**
 * Headless-screenshot a local page of this repo via puppeteer-core, driving
 * the system-installed Chrome (no bundled Chromium download -- this repo's
 * app stays dependency-free; puppeteer-core here is dev/verification
 * tooling only, never imported by anything under index*.html/src/).
 *
 * Usage: node scripts/screenshot.mjs <url> <out.png> [--width=1280] [--height=900] [--wait=400] [--selector=#id]
 * Requires `npm run serve` (or any static server) already running for the
 * <url> to resolve -- this script does not start one itself. --selector
 * crops the shot to one element (e.g. a <canvas>), matching how
 * doc/bloch_rabi.jpg / doc/bloch_ramsey.jpg were captured, instead of the
 * full viewport.
 */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
  '/usr/bin/google-chrome', // Linux
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
];

function findChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const found = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!found) {
    throw new Error(
      'No Chrome/Chromium found. Set CHROME_PATH, or install Google Chrome, or install a ' +
      'headless-chromium build and point CHROME_PATH at it.'
    );
  }
  return found;
}

const [, , url, outPath, ...rest] = process.argv;
if (!url || !outPath) {
  console.error('Usage: node scripts/screenshot.mjs <url> <out.png> [--width=1280] [--height=900] [--wait=400] [--selector=#id]');
  process.exit(1);
}
const opt = (name, def) => {
  const flag = rest.find((a) => a.startsWith(`--${name}=`));
  return flag ? Number(flag.split('=')[1]) : def;
};
const width = opt('width', 1280);
const height = opt('height', 900);
const wait = opt('wait', 400);
const selectorFlag = rest.find((a) => a.startsWith('--selector='));
const selector = selectorFlag ? selectorFlag.split('=')[1] : null;

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: true,
  args: ['--no-sandbox'],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });
  if (wait) await new Promise((r) => setTimeout(r, wait));
  if (selector) {
    const handle = await page.$(selector);
    if (!handle) throw new Error(`--selector="${selector}" matched no element on ${url}`);
    await handle.screenshot({ path: outPath });
  } else {
    await page.screenshot({ path: outPath });
  }
  console.log(`Screenshot written: ${outPath}`);
  if (consoleErrors.length) {
    console.error(`Console errors on page (${consoleErrors.length}):`);
    consoleErrors.forEach((e) => console.error(' -', e));
    process.exitCode = 2; // screenshot still written; exit code flags console errors worth reading
  }
} finally {
  await browser.close();
}
