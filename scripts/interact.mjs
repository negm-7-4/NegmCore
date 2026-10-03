// scripts/interact.mjs — exercises every control in every state (UI-01..UI-12) on the shipped
// file, outside QA mode so pointer-only features are live, and writes qa/interact/report.json
// plus a screenshot per state. Why a script: "no un-animated change" must be re-checkable at
// every later gate, not remembered.
//
//   node scripts/interact.mjs [dist/index.html] [qa/interact]
import { chromium } from 'playwright-core';
import { PerspectiveCamera, Vector3 } from 'three';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = resolve(process.argv[2] ?? 'dist/index.html');
const out = resolve(process.argv[3] ?? 'qa/interact');
mkdirSync(out, { recursive: true });

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers';
  if (!existsSync(root)) return undefined;
  const dir = readdirSync(root).find((d) => /^chromium-\d+$/.test(d));
  return dir ? `${root}/${dir}/chrome-linux/chrome` : undefined;
}

const browser = await chromium.launch({
  executablePath: chromePath(),
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const checks = [];
const check = (id, name, ok, detail = '') => {
  checks.push({ id, name, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${name}${detail ? ` — ${detail}` : ''}`);
};
// Software WebGL renders a frame in seconds; tweens are time-based, so wait in real time.
const settle = (page, ms = 3000) => page.waitForTimeout(Math.max(ms, 3000));

async function open(options) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('request', (r) => {
    const url = r.url();
    if (!url.startsWith('file:') && !url.startsWith('data:') && !url.startsWith('blob:')) errors.push(`network request: ${url}`);
  });
  await page.goto(`file://${file}`);
  await page.waitForFunction(() => window.__qa !== undefined, null, { timeout: 60_000 });
  await page.evaluate(() => window.__qa.ready);
  await page.waitForFunction(() => document.documentElement.classList.contains('is-ready'), null, { timeout: 60_000 });
  return { context, page, errors };
}
const seekTo = async (page, id, pct) => {
  const c = await page.evaluate((chapter) => window.__qa.chapters.find((x) => x.id === chapter), id);
  await page.evaluate((p) => window.__qa.seek(p), c.start + ((c.end - c.start) * pct) / 100);
};
const transform = (page, sel) => page.$eval(sel, (el) => getComputedStyle(el).transform);
const attr = (page, sel, name) => page.$eval(sel, (el, n) => el.getAttribute(n), name);
const center = async (page, sel) => {
  const b = await page.locator(sel).first().boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2, box: b };
};

// ---------------- desktop, fine pointer ----------------
{
  const { context, page, errors } = await open({ viewport: { width: 1280, height: 800 } });

  // Real load and backward jumps: every timeline rewinds in page order, but only the chapter
  // that owns the scroll position may drive the camera and the world (SCENE-05, FX-02).
  const pose = () => page.evaluate(() => ({ pos: window.__qa.debug().pose.pos, world: window.__qa.stats().world, chapter: window.__qa.stats().chapter }));
  const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 0.02);
  const atLoad = await pose();
  // FX-05: the preloader's SVG bar sat exactly on the 3D bar's screen rectangle at the swap.
  const cut = await page.evaluate(() => {
    const svg = document.querySelector('.preloader-bar');
    const v = (n) => parseFloat(svg.style.getPropertyValue(n));
    const gl = document.getElementById('gl');
    return { x: v('--bar-x'), y: v('--bar-y'), w: v('--bar-w'), h: v('--bar-h'), pose: window.__qa.debug().pose, size: [gl.clientWidth, gl.clientHeight] };
  });
  {
    const [cw, ch] = cut.size;
    const cam = new PerspectiveCamera(cut.pose.fov, cw / ch, 0.1, 100);
    cam.position.fromArray(cut.pose.pos);
    cam.lookAt(new Vector3().fromArray(cut.pose.look));
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    const end = (x) => {
      const p = new Vector3(x, 0, 0).project(cam);
      return [((p.x + 1) / 2) * cw, ((1 - p.y) / 2) * ch];
    };
    const [l, r] = [end(-1.1), end(1.1)];
    const diff = Math.max(Math.abs(l[0] - cut.x), Math.abs(r[0] - (cut.x + cut.w)), Math.abs(l[1] - (cut.y + cut.h / 2)));
    check('FX-05', 'match cut: SVG bar on the 3D bar within 4 px', diff <= 4, `${diff.toFixed(2)} px`);
  }
  check('SCENE-05', 'first view: hero camera, black world', near(atLoad.pos, [0, 0.28, 3.3]) && atLoad.world === 0 && atLoad.chapter === 'hero', JSON.stringify(atLoad));
  await page.screenshot({ path: `${out}/desktop-load.png` });
  await seekTo(page, 'join', 80);
  await settle(page, 2500);
  await seekTo(page, 'programs', 50);
  await settle(page, 2500);
  const backToWhite = await pose();
  check('SCENE-05', 'jump back from join to programs: programs camera, white world', backToWhite.pos[0] > 40 && backToWhite.pos[0] < 50 && backToWhite.world === 1, JSON.stringify(backToWhite));
  await seekTo(page, 'hero', 0);
  await settle(page, 2500);
  const backToTop = await pose();
  check('SCENE-05', 'jump back to the top: hero camera, black world', near(backToTop.pos, [0, 0.28, 3.3]) && backToTop.world === 0, JSON.stringify(backToTop));

  // UI-01 cursor: appears on move, grows on links, becomes a bar on text, presses to 0.85.
  await page.mouse.move(640, 400);
  await settle(page, 1200);
  check('UI-01', 'cursor shows on pointer move', (await page.$eval('.cursor', (el) => getComputedStyle(el).opacity)) === '1');
  check('UI-01', 'native cursor hidden while the custom one is active', await page.evaluate(() => document.documentElement.classList.contains('has-cursor')));
  const action = await center(page, '.chrome .action');
  await page.mouse.move(action.x, action.y, { steps: 4 });
  await settle(page, 1200);
  const ringLink = await transform(page, '.cursor-ring');
  check('UI-01', 'ring grows over a link', /matrix\(1\.[45]/.test(ringLink), ringLink);

  // UI-02 magnet + hover + press.
  await page.mouse.move(action.box.x - 40, action.y, { steps: 3 });
  await settle(page, 1200);
  const pulled = await page.$eval('.chrome .action', (el) => new DOMMatrix(getComputedStyle(el).transform).m41);
  check('UI-02', 'magnet pulls within 80 px by at most 10 px', pulled < 0 && pulled >= -10, `x ${pulled.toFixed(2)}`);
  await page.mouse.move(action.x, action.y);
  await settle(page, 800);
  // PERF-04: the lift tweens a 0..1 custom property; the stylesheet mixes the colour from it.
  const lifted = await page.$eval('.chrome .action', (el) => ({ lift: el.style.getPropertyValue('--lift'), bg: getComputedStyle(el).backgroundColor, inline: el.style.backgroundColor }));
  check('UI-02', 'hover lifts the fill (--lift tweened, no inline colour)', Number(lifted.lift) > 0.99 && lifted.inline === '', JSON.stringify(lifted));
  await page.mouse.down();
  await settle(page, 800);
  const pressed = await page.$eval('.chrome .action', (el) => new DOMMatrix(getComputedStyle(el).transform).a);
  check('UI-02', 'pressed scales to 0.96', Math.abs(pressed - 0.96) < 0.01, pressed.toFixed(3));
  const ringPressed = await page.$eval('.cursor-ring', (el) => new DOMMatrix(getComputedStyle(el).transform).a);
  check('UI-01', 'pressed cursor scales by 0.85', Math.abs(ringPressed - 1.5 * 0.85) < 0.05, ringPressed.toFixed(3));
  // Leave before releasing, so the press does not become a click (which would scroll to join).
  await page.mouse.move(640, 500);
  await page.mouse.up();
  await settle(page, 1200);

  // UI-03 brand mark morph.
  const starBefore = await attr(page, '.wordmark .mark-star', 'd');
  const mark = await center(page, '.wordmark');
  await page.mouse.move(mark.x, mark.y, { steps: 3 });
  await settle(page, 1500);
  const starAfter = await attr(page, '.wordmark .mark-star', 'd');
  check('UI-03', 'brand star morphs to a circle on hover', starAfter !== starBefore && /C/.test(starAfter));
  await page.screenshot({ path: `${out}/desktop-brand-hover.png` });
  await page.mouse.move(640, 500);

  // UI-04 rail: hover shows the name and draws the underline; pin and aria-current follow.
  const plate = await center(page, '.rail-link[href="#orbit"] .rail-plate');
  await page.mouse.move(plate.x, plate.y, { steps: 3 });
  await settle(page, 1500);
  const labelOpacity = await page.$eval('.rail-link[href="#orbit"] .rail-label', (el) => getComputedStyle(el).opacity);
  const dash = await page.$eval('.rail-link[href="#orbit"] .u-bar', (el) => getComputedStyle(el).strokeDasharray);
  check('UI-04', 'hover shows the chapter name', labelOpacity === '1', labelOpacity);
  check('UI-03', 'underline drawn with DrawSVG', dash !== 'none', dash);
  await page.screenshot({ path: `${out}/desktop-rail-hover.png` });
  const pinBefore = await page.$eval('.rail-pin', (el) => el.getBoundingClientRect().top);
  await page.mouse.move(640, 500);
  await seekTo(page, 'orbit', 50);
  await settle(page, 2500);
  const pinAfter = await page.$eval('.rail-pin', (el) => el.getBoundingClientRect().top);
  check('UI-04', 'pin travels along the rail to the current chapter', pinAfter > pinBefore + 100, `${pinBefore.toFixed(0)} -> ${pinAfter.toFixed(0)}`);
  check('UI-04', 'aria-current on the current plate', (await attr(page, '.rail-link[href="#orbit"]', 'aria-current')) === 'true');
  const lit = await page.$$eval('.rail-plate', (els) => els.map((el) => Number(el.style.getPropertyValue('--lit') || 0)));
  check('UI-04', 'only the current plate is lit (--lit tweened)', lit[4] > 0.99 && lit.filter((v) => v > 0.01).length === 1, lit.join(','));

  // UI-09 ambient toggle.
  await page.click('.ambient-btn');
  await settle(page, 1500);
  check('UI-09', 'aria-pressed true after pausing', (await attr(page, '.ambient-btn', 'aria-pressed')) === 'true');
  check('UI-09', 'icon morphs to play', /19 12|19,12/.test(await attr(page, '.ambient-icon', 'd')) || !/h3v12/.test(await attr(page, '.ambient-icon', 'd')));
  // The drift eases to a stop over a few frames; software WebGL frames are seconds apart.
  await settle(page, 6000);
  const marquee1 = await transform(page, '.marquee-track');
  await settle(page, 2500);
  const marquee2 = await transform(page, '.marquee-track');
  check('UI-09', 'marquee drift frozen while paused', marquee1 === marquee2);
  // PERF-06: paused and untouched, the page stops rendering; a pointer move wakes it; a hidden
  // tab renders nothing even when woken.
  const renders = () => page.evaluate(() => window.__qa.debug().renders);
  const idle1 = await renders();
  await settle(page, 3000);
  const idle2 = await renders();
  check('PERF-06', 'idle page (ambient paused, no input) renders nothing', idle2 === idle1, `${idle1} -> ${idle2}`);
  await page.mouse.move(600, 420, { steps: 3 });
  await settle(page, 3000);
  const woke = await renders();
  check('PERF-06', 'pointer movement renders on demand', woke > idle2, `${idle2} -> ${woke}`);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const hidden1 = await renders();
  await page.mouse.move(640, 400, { steps: 3 });
  await settle(page, 3000);
  const hidden2 = await renders();
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  check('PERF-06', 'hidden tab renders nothing', hidden2 === hidden1, `${hidden1} -> ${hidden2}`);
  await page.click('.ambient-btn');
  await settle(page, 1500);
  check('UI-09', 'aria-pressed false after resuming', (await attr(page, '.ambient-btn', 'aria-pressed')) === 'false');

  // UI-10 programs: drag the station, it turns, then settles back.
  await seekTo(page, 'programs', 17);
  await settle(page, 2500);
  const proxy = await center(page, '#programs .drag-proxy');
  await page.screenshot({ path: `${out}/desktop-drag-before.png` });
  await page.mouse.move(proxy.x, proxy.y);
  await page.mouse.down();
  await page.mouse.move(proxy.x + 160, proxy.y, { steps: 6 });
  await page.evaluate(() => window.__qa.seek(window.scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)));
  await page.screenshot({ path: `${out}/desktop-drag-during.png` });
  await page.mouse.up();
  await settle(page, 4000);
  await page.screenshot({ path: `${out}/desktop-drag-after.png` });
  check('UI-10', 'drag proxy present and focusable', (await attr(page, '#programs .drag-proxy', 'tabindex')) === '0');

  // UI-05 plans: hover tilts the card and lights the ring; choosing moves the marker with Flip.
  await seekTo(page, 'gravity', 62);
  await settle(page, 2500);
  const card = await center(page, '.plan[data-plan="15"]');
  await page.mouse.move(card.x + card.box.width * 0.3, card.y - card.box.height * 0.3, { steps: 4 });
  await settle(page, 1500);
  const tilt = await transform(page, '.plan[data-plan="15"]');
  check('UI-05', 'hover tilts the card (matrix3d)', tilt.startsWith('matrix3d'), tilt.slice(0, 40));
  const ring = await page.$eval('.plan[data-plan="15"] .plan-ring', (el) => ({ hot: el.style.getPropertyValue('--hot'), border: getComputedStyle(el).borderTopColor }));
  check('UI-05', 'ring lit on hover (--hot tweened)', Number(ring.hot) > 0.99, JSON.stringify(ring));
  await page.screenshot({ path: `${out}/desktop-plan-hover.png` });
  await page.click('.plan[data-plan="15"]');
  await settle(page, 1500);
  await page.click('.plan[data-plan="20"]');
  await settle(page, 2500);
  check('UI-05', 'Flip marker sits in the chosen card', await page.$eval('.plan[data-plan="20"]', (el) => el.querySelector('.plan-marker') !== null));
  check('UI-05', 'chosen radio checked', await page.$eval('input[name="plan-pick"][value="20"]', (el) => el.checked));
  await page.screenshot({ path: `${out}/desktop-plan-chosen.png` });
  await page.focus('input[name="plan-pick"][value="20"]');
  await page.keyboard.press('ArrowLeft');
  await settle(page, 1500);
  check('UI-05', 'arrow keys move between plans', await page.$eval('input[name="plan-pick"][value="15"]', (el) => el.checked));

  // UI-06 form: float label, bar, error shake, valid accent; UI-02 busy and success icon.
  await seekTo(page, 'join', 80);
  await settle(page, 2500);
  const restY = await page.$eval('#f-name', (el) => {
    const label = el.closest('.field').querySelector('.field-label');
    return new DOMMatrix(getComputedStyle(label).transform).m42;
  });
  check('UI-06', 'label rests inside the empty field', restY > 8, `y ${restY.toFixed(1)}`);
  await page.click('#f-name');
  await settle(page, 1200);
  const upY = await page.$eval('#f-name', (el) => new DOMMatrix(getComputedStyle(el.closest('.field').querySelector('.field-label')).transform).m42);
  const bar = await page.$eval('#f-name', (el) => new DOMMatrix(getComputedStyle(el.closest('.field').querySelector('.field-bar-fill')).transform).a);
  check('UI-06', 'label floats on focus', Math.abs(upY) < 1, `y ${upY.toFixed(1)}`);
  check('UI-06', 'underline bar grows on focus', bar > 0.99, bar.toFixed(2));
  const ringText = await transform(page, '.cursor-ring');
  check('UI-01', 'cursor over a text field (state applied)', ringText !== 'none');
  await page.click('.submit');
  await settle(page, 1500);
  // The 6 px rattle itself is too fast to sample under software rendering; the invalid state
  // that starts it is checked here, the shake is in form.ts mark().
  check('UI-06', 'invalid field marked (aria-invalid)', (await attr(page, '#f-phone', 'aria-invalid')) === 'true');
  check('UI-06', 'error message slides in', (await page.$eval('#e-phone', (el) => getComputedStyle(el).opacity)) === '1');
  await page.screenshot({ path: `${out}/desktop-form-invalid.png` });
  await page.fill('#f-name', 'Ahmed Ali');
  await page.fill('#f-phone', '01012345678');
  await settle(page, 1200);
  const accent = await page.$eval('#f-phone', (el) => {
    const fill = el.closest('.field').querySelector('.field-bar-fill');
    return { ok: fill.style.getPropertyValue('--ok'), bg: getComputedStyle(fill).backgroundColor };
  });
  check('UI-06', 'valid field turns its bar to the accent (--ok tweened)', Number(accent.ok) > 0.99, JSON.stringify(accent));
  await page.click('.submit');
  await page.waitForTimeout(400);
  check('UI-02', 'busy state (aria-busy)', (await attr(page, '.submit', 'aria-busy')) === 'true');
  await settle(page, 4000);
  const iconD = await attr(page, '.submit-shape', 'd');
  check('UI-02', 'success icon morphs to a check', !/a8 8/.test(iconD), iconD.slice(0, 24));
  check('SCENE-25', 'success message visible', (await page.$eval('.form-status', (el) => getComputedStyle(el).visibility)) === 'visible');
  await page.screenshot({ path: `${out}/desktop-form-done.png` });

  // UI-03 chrome hides on a fast downward scroll and returns on upward intent.
  await page.mouse.move(640, 300);
  await seekTo(page, 'mass', 50);
  await settle(page, 1500);
  for (let i = 0; i < 8; i += 1) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(16);
  }
  await settle(page, 2000);
  const hidden = await page.$eval('.chrome-actions', (el) => getComputedStyle(el).opacity);
  await page.mouse.wheel(0, -300);
  await settle(page, 2000);
  const back = await page.$eval('.chrome-actions', (el) => getComputedStyle(el).opacity);
  check('UI-03', 'chrome hides on fast downward scroll', Number(hidden) < 0.5, hidden);
  check('UI-03', 'chrome returns on upward intent', back === '1', back);

  // UI-08 back-to-top through Lenis.
  await page.evaluate(() => window.__qa.seek(1));
  await settle(page, 1500);
  const footerInView = await page.$eval('.to-top', (el) => {
    const r = el.getBoundingClientRect();
    return r.top < innerHeight && r.bottom > 0;
  });
  check('UI-08', 'back-to-top is on screen at the end of the page', footerInView);
  await page.focus('.to-top');
  await settle(page, 1500);
  const focusedBg = await page.$eval('.to-top', (el) => ({ lift: el.style.getPropertyValue('--lift'), bg: getComputedStyle(el).backgroundColor }));
  check('UI-08', 'back-to-top focus state (--lift tweened)', Number(focusedBg.lift) > 0.99, JSON.stringify(focusedBg));
  // Lenis owns the scroll position, so a synthetic click avoids Playwright re-scrolling the page.
  await page.$eval('.to-top', (el) => el.click());
  await settle(page, 4000);
  check('UI-08', 'back-to-top returns to 0', (await page.evaluate(() => window.scrollY)) < 4);

  // ACCESS-03 keyboard: the skip link is the first stop, the ring is 2 px at a 3 px offset.
  await page.evaluate(() => window.__qa.seek(0));
  await settle(page, 1500);
  await page.focus('.skip-link');
  await page.keyboard.press('Tab');
  const focusRing = await page.evaluate(() => {
    const el = document.activeElement;
    const cs = el ? getComputedStyle(el) : null;
    return cs ? { style: cs.outlineStyle, width: cs.outlineWidth, offset: cs.outlineOffset, tag: el.className } : null;
  });
  check('ACCESS-03', 'focus-visible ring 2 px, offset 3 px', focusRing?.style === 'solid' && focusRing.width === '2px' && focusRing.offset === '3px', JSON.stringify(focusRing));

  // RESP-02: software frames are slow, so the controller must have stepped down, in order,
  // and must not step back up.
  const q1 = await page.evaluate(() => window.__qa.debug().quality);
  await settle(page, 9000);
  const q2 = await page.evaluate(() => window.__qa.debug().quality);
  check('RESP-02', 'slow frames lowered quality (dpr floor, then bloom, then aberration)', q1 && q1.bloom === false, JSON.stringify(q1));
  check('RESP-02', 'quality does not climb back while frames stay slow', JSON.stringify(q1) === JSON.stringify(q2), JSON.stringify(q2));

  check('ARCH-02', 'desktop: no errors, no network requests', errors.length === 0, errors.join(' | '));
  await context.close();
}

// ---------------- mobile, touch: the menu overlay ----------------
{
  const { context, page, errors } = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  // ACCESS-03: on a fresh page the first Tab lands on the skip link.
  await page.keyboard.press('Tab');
  check('ACCESS-03', 'skip link is the first focusable element', await page.evaluate(() => document.activeElement?.classList.contains('skip-link')));
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  const before = await attr(page, '.menu-icon', 'd');
  await page.tap('.menu-btn');
  await settle(page, 2500);
  check('UI-03', 'menu opens (aria-expanded)', (await attr(page, '.menu-btn', 'aria-expanded')) === 'true');
  check('UI-03', 'overlay visible', (await page.$eval('.rail', (el) => getComputedStyle(el).visibility)) === 'visible');
  check('UI-03', 'menu icon morphs', (await attr(page, '.menu-icon', 'd')) !== before);
  check('UI-01', 'no custom cursor on touch', !(await page.evaluate(() => document.documentElement.classList.contains('has-cursor'))));
  // ACCESS-06: every visible control in the open overlay and the chrome is at least 44 x 44.
  const small = await page.evaluate(() =>
    [...document.querySelectorAll('a, button, [role="slider"]')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const shown = !el.closest('.panel:not(.is-active)'); // inactive panels sit at their arrival depth
        return shown && r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && r.bottom > 0 && r.top < innerHeight && !el.classList.contains('skip-link');
      })
      .map((el) => ({ cls: el.className, w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) }))
      .filter((r) => r.w < 44 || r.h < 44),
  );
  check('ACCESS-06', 'visible controls are at least 44 x 44 px', small.length === 0, JSON.stringify(small));
  const meta = await page.$eval('meta[name="viewport"]', (el) => el.getAttribute('content'));
  check('ACCESS-06', 'zoom is not disabled', !/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\.0)?\b/.test(meta), meta);
  await page.screenshot({ path: `${out}/mobile-menu-open.png` });
  await page.keyboard.press('Escape');
  await settle(page, 2000);
  check('UI-03', 'Escape closes the menu', (await attr(page, '.menu-btn', 'aria-expanded')) === 'false');
  check('UI-03', 'overlay hidden after close', (await page.$eval('.rail', (el) => getComputedStyle(el).visibility)) === 'hidden');
  check('ARCH-02', 'mobile: no errors, no network requests', errors.length === 0, errors.join(' | '));
  await context.close();
}

await browser.close();
const failed = checks.filter((c) => !c.ok);
writeFileSync(`${out}/report.json`, JSON.stringify({ file, generatedAt: new Date().toISOString(), checks }, null, 2));
console.log(`interact: ${checks.length - failed.length}/${checks.length} pass`);
process.exit(failed.length ? 1 : 0);
