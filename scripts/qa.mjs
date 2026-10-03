// scripts/qa.mjs — deterministic screenshot + health harness.
// Why a script and not manual checks: every phase gate must produce the same evidence
// (screenshots, console errors, render stats) from the exact file that ships.
import { chromium } from 'playwright-core';
import { mkdirSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const file = resolve(process.argv[2] ?? 'dist/index.html');
const outDir = resolve(process.argv[3] ?? 'qa');
// Fixed stops only when QA_STOPS is set; otherwise every chapter at 10/50/90 % (QA-04).
const fixedStops = process.env.QA_STOPS ? process.env.QA_STOPS.split(',').map(Number) : null;
const onlyChapters = process.env.QA_CHAPTERS ? process.env.QA_CHAPTERS.split(',') : null;
// QA_MODE: 'reduced' emulates prefers-reduced-motion, 'static' forces static mode (P6 frames).
const mode = process.env.QA_MODE ?? '';
const pcts = (process.env.QA_PCTS ?? '10,50,90').split(',').map(Number);
const viewports = [
  { name: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false },
  { name: 'mobile', width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
].filter((v) => !process.env.QA_VIEWPORTS || process.env.QA_VIEWPORTS.split(',').includes(v.name));

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH; // local machines: point at an installed Chrome
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers';
  if (!existsSync(root)) return undefined; // fall back to Playwright's own lookup
  const dir = readdirSync(root).find((d) => /^chromium-\d+$/.test(d));
  return dir ? `${root}/${dir}/chrome-linux/chrome` : undefined;
}

const browser = await chromium.launch({
  executablePath: chromePath(),
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
    // QA_MODE=nowebgl proves the static fallback when no WebGL context can be created (ARCH-12).
    .concat(mode === 'nowebgl' ? ['--disable-webgl', '--disable-3d-apis'] : []),
});
const report = { file, generatedAt: new Date().toISOString(), runs: [], ok: true };

for (const vp of viewports) {
  const { name, ...contextOptions } = vp;
  // QA_MODE=nojs proves the page reads completely without JavaScript (P1 gate, LAYOUT-05).
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, ...contextOptions, javaScriptEnabled: mode !== 'nojs' });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  // The shipped file makes zero network requests (ARCH-02): anything but file: and data: fails.
  page.on('request', (r) => {
    const url = r.url();
    if (!url.startsWith('file:') && !url.startsWith('data:') && !url.startsWith('blob:')) consoleErrors.push(`network request: ${url}`);
  });
  if (mode === 'reduced') await page.emulateMedia({ reducedMotion: 'reduce' });
  if (mode === 'nojs') {
    await page.goto(`file://${file}`);
    await page.evaluate(() => document.fonts.ready);
    mkdirSync(`${outDir}/${name}-nojs`, { recursive: true });
    const shot = `${outDir}/${name}-nojs/full.png`;
    await page.screenshot({ path: shot, fullPage: true });
    const sections = await page.$$eval('section.chapter, footer', (els) => els.map((el) => el.id || 'footer'));
    for (const id of sections) await page.locator(id === 'footer' ? 'footer' : `#${id}`).screenshot({ path: `${outDir}/${name}-nojs/${id}.png` });
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const run = { viewport: `${name}-nojs`, consoleErrors, appErrors: [], frames: [{ stop: 0, label: 'full', shot, overflowX, stats: {} }] };
    if (consoleErrors.length || overflowX > 0) report.ok = false;
    report.runs.push(run);
    await context.close();
    continue;
  }
  await page.goto(`file://${file}#qa`);
  await page.waitForFunction(() => window.__qa !== undefined, null, { timeout: 30_000 });
  await page.evaluate(() => window.__qa.ready);
  if (mode === 'static') await page.evaluate(() => window.__qa.set({ staticMode: true }));
  // QA_MODE=lost drops the WebGL context mid-session; the page must fall back, not go blank.
  if (mode === 'lost') {
    await page.evaluate(() => document.getElementById('gl').getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext());
    await page.waitForFunction(() => document.documentElement.classList.contains('is-static'), null, { timeout: 10_000 });
  }
  const folder = mode ? `${name}-${mode}` : name;
  mkdirSync(`${outDir}/${folder}`, { recursive: true });
  const chapters = await page.evaluate(() => window.__qa.chapters);
  const stops = fixedStops
    ? fixedStops.map((stop) => ({ stop, label: `p${String(Math.round(stop * 1000)).padStart(4, '0')}` }))
    : chapters
        .filter((c) => !onlyChapters || onlyChapters.includes(c.id))
        .flatMap((c) => pcts.map((pct) => ({ stop: c.start + ((c.end - c.start) * pct) / 100, label: `${c.id}-${pct}` })));
  const frames = [];
  for (const { stop, label } of stops) {
    await page.evaluate((p) => window.__qa.seek(p), stop);
    const shot = `${outDir}/${folder}/${label}.png`;
    await page.screenshot({ path: shot });
    const probe = await page.evaluate(() => ({
      stats: window.__qa.stats(),
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
    }));
    frames.push({ stop, label, shot, ...probe });
  }
  const appErrors = await page.evaluate(() => window.__qa.errors);
  const run = { viewport: folder, chapters, consoleErrors, appErrors, frames };
  if (consoleErrors.length || appErrors.length || frames.some((f) => f.overflowX > 0)) report.ok = false;
  report.runs.push(run);
  await context.close();
}
await browser.close();
writeFileSync(`${outDir}/report${process.env.QA_VIEWPORTS ? `-${process.env.QA_VIEWPORTS}` : ''}${mode ? `-${mode}` : ''}.json`, JSON.stringify(report, null, 2));
for (const run of report.runs) {
  console.log(`[${run.viewport}] errors=${run.consoleErrors.length + run.appErrors.length}`);
  for (const f of run.frames) console.log(`  ${f.label} p=${f.stop.toFixed(3)} calls=${f.stats.calls} tris=${f.stats.triangles} tex=${f.stats.textures} prog=${f.stats.programs} tier=${f.stats.tier} world=${f.stats.world} chapter=${f.stats.chapter} overflowX=${f.overflowX}`);
  run.consoleErrors.concat(run.appErrors).forEach((e) => console.log('  ERROR:', e));
}
process.exit(report.ok ? 0 : 1);
