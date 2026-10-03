// scripts/audit.mjs — checks that are facts about the shipped file, run at the gates.
// Why a script: copy, type scale, colour budget and overflow must be measured, not eyeballed.
//
//   node scripts/audit.mjs [dist/index.html]      run every check, exit 1 on any FAIL
//   AUDIT_ONLY=copy,sizes node scripts/audit.mjs   run a subset
//   AUDIT_SHOTS=qa/desktop node scripts/audit.mjs  green budget over an existing screenshot folder
import { chromium } from 'playwright-core';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';

const file = resolve(process.argv[2] ?? 'dist/index.html');
const only = process.env.AUDIT_ONLY ? process.env.AUDIT_ONLY.split(',') : null;
const want = (name) => !only || only.includes(name);
const results = [];
const record = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${detail}`);
};

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers';
  if (!existsSync(root)) return undefined;
  const dir = readdirSync(root).find((d) => /^chromium-\d+$/.test(d));
  return dir ? `${root}/${dir}/chrome-linux/chrome` : undefined;
}

/** Arabic copy deck pieces, read from the brief so the audit can never drift from it. */
function deckPieces() {
  const brief = readFileSync('docs/BRIEF.md', 'utf8');
  const start = brief.indexOf('### 7.2 Copy deck');
  const end = brief.indexOf('### 7.3');
  const rows = brief.slice(start, end).split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| Where') && !l.startsWith('|---'));
  // §2 decides which column ships: the English column (index 3) when LANGUAGE is en.
  const english = /\| LANGUAGE \| `en`/.test(brief);
  const pieces = new Set();
  for (const row of rows) {
    const cells = row.split('|');
    // Numerals with units are language-neutral readouts (§7.3); they live in the Arabic cells.
    for (const m of cells[2].matchAll(/\d+ (?:KG|MM)/g)) pieces.add(m[0]);
    const arabic = cells[english ? 3 : 2].trim();
    const cleaned = arabic.replace(/\((four label and value rows|three labels)\)/g, '').replace(/\(reference; ships if LANGUAGE = en\)/, '');
    const placeholder = cleaned.match(/\(placeholder: (.*)\)/);
    if (placeholder) pieces.add(placeholder[1].trim());
    for (const part of cleaned.replace(/\(placeholder: .*\)/, '').split(/ · | \/ | — /)) {
      const p = part.trim();
      if (p) pieces.add(p);
    }
  }
  // Spec rows are "label value unit": the label and the value are separate elements.
  for (const p of [...pieces]) {
    const m = p.match(/^(\D+?) (\d+ (?:KG|MM))$/);
    if (m) {
      pieces.add(m[1]);
      pieces.add(m[2]);
    }
  }
  return [...pieces];
}

const norm = (s) => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

const browser = await chromium.launch({
  executablePath: chromePath(),
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

if (want('copy')) {
  // COPY-01: every text node is part of the deck, and every deck piece is on the page.
  const page = await browser.newPage({ javaScriptEnabled: false });
  await page.goto(`file://${file}`);
  const texts = await page.evaluate(() => {
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const t = walker.currentNode.textContent;
      if (t && t.trim()) out.push(t);
    }
    for (const el of document.querySelectorAll('[placeholder]')) out.push(el.getAttribute('placeholder'));
    for (const el of document.querySelectorAll('[data-busy],[data-label-on],[data-label-off],[data-label-open],[data-label-closed]')) {
      for (const a of ['data-busy', 'data-label-on', 'data-label-off', 'data-label-open', 'data-label-closed']) if (el.getAttribute(a)) out.push(el.getAttribute(a));
    }
    return { out, title: document.title, body: document.body.textContent + ' ' + out.join(' ') };
  });
  const pieces = deckPieces().map(norm);
  const stray = texts.out.map(norm).filter((t) => !pieces.some((p) => p.includes(t)));
  const fullText = norm(texts.body + ' ' + texts.out.join(' '));
  const missing = pieces.filter((p) => !fullText.includes(p));
  record('COPY-01 stray text', stray.length === 0, stray.length ? stray.join(' | ') : `${texts.out.length} text nodes all from the deck`);
  record('COPY-01 deck coverage', missing.length === 0, missing.length ? `missing: ${missing.join(' | ')}` : `${pieces.length} deck pieces present`);
  await page.close();
}

if (want('sizes')) {
  // TYPE-03: every rendered font size is one of the scale's values at that viewport.
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 2560, height: 1440 }, { width: 360, height: 740 }]) {
    const page = await browser.newPage({ viewport: vp });
    await page.goto(`file://${file}#qa`);
    await page.waitForFunction(() => window.__qa !== undefined);
    await page.evaluate(() => window.__qa.ready);
    const res = await page.evaluate(() => {
      const probe = document.createElement('span');
      document.body.append(probe);
      const allowed = new Set();
      for (const t of ['display', 'title', 'lede', 'body', 'label', 'numeral']) {
        probe.style.fontSize = `var(--text-${t})`;
        allowed.add(getComputedStyle(probe).fontSize);
      }
      for (const v of ['1rem', '1.125rem']) {
        probe.style.fontSize = v;
        allowed.add(getComputedStyle(probe).fontSize);
      }
      probe.remove();
      const bad = new Map();
      for (const el of document.body.querySelectorAll('*')) {
        const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        const field = el.matches('input, button');
        if (!own && !field) continue;
        const fs = getComputedStyle(el).fontSize;
        if (!allowed.has(fs)) bad.set(`${el.tagName.toLowerCase()}.${el.className}`, fs);
      }
      return { allowed: [...allowed], bad: [...bad.entries()] };
    });
    record(`TYPE-03 sizes @${vp.width}`, res.bad.length === 0, res.bad.length ? JSON.stringify(res.bad) : `allowed ${res.allowed.join(', ')}`);
    await page.close();
  }
}

if (want('overflow')) {
  // LAYOUT-06: no horizontal scroll from 360 to 2560 px, with and without JavaScript.
  for (const width of [360, 390, 768, 1024, 1440, 2560]) {
    for (const js of [false, true]) {
      const page = await browser.newPage({ viewport: { width, height: 800 }, javaScriptEnabled: js });
      await page.goto(`file://${file}${js ? '#qa' : ''}`);
      if (js) {
        await page.waitForFunction(() => window.__qa !== undefined);
        await page.evaluate(() => window.__qa.ready);
      }
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      record(`LAYOUT-06 overflow @${width} ${js ? 'js' : 'nojs'}`, over <= 0, `scrollWidth - innerWidth = ${over}`);
      await page.close();
    }
  }
}

if (want('green') && process.env.AUDIT_SHOTS) {
  // COLOR-04: signal-green pixels cover at most 8 % of any frame.
  const dir = resolve(process.env.AUDIT_SHOTS);
  const page = await browser.newPage();
  let worst = { name: '', share: 0 };
  for (const name of readdirSync(dir).filter((f) => extname(f) === '.png')) {
    const b64 = readFileSync(join(dir, name)).toString('base64');
    const share = await page.evaluate(async (src) => {
      const img = new Image();
      img.src = `data:image/png;base64,${src}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let green = 0;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], gg = d[i + 1], b = d[i + 2];
        if (gg > 90 && gg - r > 40 && gg - b > 30) green += 1;
      }
      return green / (d.length / 4);
    }, b64);
    if (share > worst.share) worst = { name, share };
  }
  record('COLOR-04 green budget', worst.share <= 0.08, `worst ${worst.name} ${(worst.share * 100).toFixed(2)} %`);
  await page.close();
}

if (want('contrast')) {
  // COLOR-08: unblended text (panels, chrome) against the world it sits on, in static mode.
  // Blended stage text is white ink with difference blending: 21:1 on either world by construction.
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport: vp });
    await page.goto(`file://${file}#qa`);
    await page.waitForFunction(() => window.__qa !== undefined);
    await page.evaluate(() => window.__qa.ready);
    await page.evaluate(() => window.__qa.set({ staticMode: true }));
    const ids = await page.$$eval('section.chapter', (els) => els.map((e) => e.id));
    let worst = { ratio: 99, where: '' };
    const failures = [];
    for (const id of ids) {
      await page.evaluate((sid) => document.getElementById(sid).scrollIntoView({ block: 'start', behavior: 'instant' }), id);
      await page.waitForTimeout(500);
      const res = await page.evaluate((sid) => {
        const c = document.createElement('canvas');
        c.width = c.height = 1;
        const g = c.getContext('2d', { willReadFrequently: true });
        const rgb = (css) => {
          g.clearRect(0, 0, 1, 1);
          g.fillStyle = '#000';
          g.fillStyle = css;
          g.fillRect(0, 0, 1, 1);
          const d = g.getImageData(0, 0, 1, 1).data;
          return [d[0], d[1], d[2], d[3]];
        };
        const lum = ([r, gg, b]) => {
          const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
          return 0.2126 * f(r) + 0.7152 * f(gg) + 0.0722 * f(b);
        };
        const bgOf = (el) => {
          for (let n = el; n && n !== document.body; n = n.parentElement) {
            const bg = getComputedStyle(n).backgroundColor;
            const v = rgb(bg);
            if (v[3] > 250 && bg !== 'rgba(0, 0, 0, 0)') return v;
            if (n.classList?.contains('chapter')) break;
          }
          const w = parseFloat(getComputedStyle(el).getPropertyValue('--world')) || 0;
          return w > 0.5 ? [255, 255, 255, 255] : [0, 0, 0, 255];
        };
        const scope = [...document.querySelectorAll(`#${sid} .panel *, .chrome-actions *, .rail *`)];
        const out = [];
        for (const el of scope) {
          const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
          if (!own) continue;
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0 || !el.getClientRects().length || el.closest('.sr-only') || el.closest('[style*="opacity: 0"]')) continue;
          const fg = rgb(cs.color);
          const bg = bgOf(el);
          const L1 = lum(fg), L2 = lum(bg);
          const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
          const large = parseFloat(cs.fontSize) >= 24 && parseInt(cs.fontWeight, 10) >= 700;
          out.push({ where: `${sid} ${el.tagName.toLowerCase()}.${el.className}`, ratio, need: large ? 3 : 4.5 });
        }
        return out;
      }, id);
      for (const r of res) {
        if (r.ratio < worst.ratio) worst = r;
        if (r.ratio < r.need) failures.push(`${r.where} ${r.ratio.toFixed(2)}`);
      }
    }
    record(`COLOR-08 contrast @${vp.width}`, failures.length === 0, failures.join(' | ') || `lowest ${worst.ratio.toFixed(2)}:1 (${worst.where})`);
    await page.close();
  }
}

if (want('source')) {
  // Static facts about the source tree.
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
  const src = walk('src');
  const read = (f) => readFileSync(f, 'utf8');
  const hexFiles = src.filter((f) => !f.endsWith('tokens.css') && !f.endsWith('gl/materials.ts')).filter((f) => /#[0-9a-fA-F]{3,8}\b/.test(read(f).replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, '')));
  record('COLOR-01 hex outside tokens', hexFiles.length === 0, hexFiles.join(', ') || 'none');
  const css = src.filter((f) => f.endsWith('.css'));
  const physical = css.flatMap((f) => read(f).split('\n').map((l, i) => [f, i + 1, l])).filter(([, , l]) => /(^|\s|;)(left|right|top|bottom|margin-(left|right|top|bottom)|padding-(left|right|top|bottom)|border-(left|right|top|bottom)[a-z-]*|text-align:\s*(left|right))\s*:/.test(l));
  const allowed = physical.filter(([, , l]) => /left: var\(--bar-x|left: 0;/.test(l));
  const disallowed = physical.filter((p) => !allowed.includes(p)).map(([f, n, l]) => `${f}:${n} ${l.trim()}`);
  record('LAYOUT-01 logical properties', disallowed.length === 0, disallowed.join(' | ') || `only projected anchors use left (${allowed.length})`);
  const motionCss = css.filter((f) => /@keyframes|(^|[\s;{])transition\s*:|(^|[\s;{])animation\s*:/m.test(read(f).replace(/\/\*[\s\S]*?\*\//g, '')));
  const dist = readFileSync(file, 'utf8');
  record('MOTION-01 no CSS motion', motionCss.length === 0 && !/@keyframes/.test(dist), motionCss.join(', ') || 'no @keyframes, transition or animation in src or dist');
  const fonts = (dist.match(/data:font\/woff2/g) ?? []).length;
  // The brief's TYPE-01 states how many files ship ("only four files are inlined").
  const words = { two: 2, three: 3, four: 4, five: 5, six: 6 };
  const stated = readFileSync('docs/BRIEF.md', 'utf8').match(/\[TYPE-01\][^\n]*only (\w+) files/);
  const expected = stated ? words[stated[1]] : 0;
  record('TYPE-01 font files', fonts === expected, `${fonts} woff2 data URIs in dist (expected ${expected})`);
  const lines = src.map((f) => [f, read(f).split('\n').length]).sort((a, b) => b[1] - a[1]);
  record('ARCH-03 file length', lines[0][1] <= 400, `largest ${lines[0][0]} ${lines[0][1]} lines`);
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`audit: ${results.length - failed.length}/${results.length} pass`);
process.exit(failed.length ? 1 : 0);
