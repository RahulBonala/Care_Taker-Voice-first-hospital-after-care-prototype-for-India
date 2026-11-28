'use strict';
// Browser UI check across viewports, slow network skeletons, read-back chip states,
// reduced motion, print stylesheet, route h1 focus, and long Indic scripts.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

let playwright = null;
try {
  playwright = require('playwright');
} catch {
  try {
    const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
    playwright = require(path.join(globalRoot, 'playwright'));
  } catch {
    console.error('Playwright is not installed. Run: npm i -g playwright && npx playwright install chromium');
    process.exit(1);
  }
}

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'caretaker-uicheck-'));
for (const k of ['SARVAM_API_KEY', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM', 'LLM_API_KEY', 'PUBLIC_URL']) delete process.env[k];
const { createApp } = require('../server/app');
const store = require('../server/store');

const PORT = 3999;
const BASE = `http://127.0.0.1:${PORT}`;
const ROUTES = ['home', 'tour', 'mobile', 'devices', 'desk', 'nurse', 'phone', 'family', 'doctor'];
const WIDTHS = [360, 768, 1280];

let failed = 0;
function pass(msg) { console.log(`PASS  ${msg}`); }
function fail(msg) { failed += 1; console.error(`FAIL  ${msg}`); }

(async () => {
  store.load();
  const server = createApp().listen(PORT);
  await new Promise((r) => server.once('listening', r));
  const browser = await playwright.chromium.launch();

  try {
    // 1. Routes at 360, 768, 1280: no console/page errors, no horizontal overflow, notice present
    let group1Bad = 0;
    for (const w of WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 800 } });
      const page = await ctx.newPage();
      const errs = [];
      page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
      page.on('pageerror', (e) => errs.push(e.message));
      for (const r of ROUTES) {
        await page.goto(`${BASE}/#${r}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(150);
        const check = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          notice: document.body.innerText.includes('Sample data. Not medical advice.'),
        }));
        if (check.overflow) { group1Bad++; fail(`#${r} at ${w}px overflows (${check.scrollWidth} > ${check.innerWidth})`); }
        if (!check.notice) { group1Bad++; fail(`#${r} at ${w}px missing notice`); }
        if (errs.length) { group1Bad++; fail(`#${r} at ${w}px console/page error: ${errs.join('; ')}`); errs.length = 0; }
      }
      await ctx.close();
    }
    if (!group1Bad) pass('1. All 9 routes at 360, 768, 1280 have no errors, no overflow, and show the notice');

    // 2. Slow network (400ms latency): within 150ms of navigating to #nurse, #family, #doctor, #desk, every async region is filled or has [aria-busy="true"] with skeleton
    let group2Bad = 0;
    const slowCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const slowPage = await slowCtx.newPage();
    await slowPage.goto(`${BASE}/#home`, { waitUntil: 'networkidle' });
    const cdp = await slowCtx.newCDPSession(slowPage);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 400,
      downloadThroughput: 500 * 1024,
      uploadThroughput: 500 * 1024,
    });
    for (const r of ['nurse', 'family', 'doctor', 'desk']) {
      await slowPage.evaluate((hash) => { location.hash = `#${hash}`; }, r);
      await slowPage.waitForTimeout(120);
      const state = await slowPage.evaluate(() => {
        const busyRegions = document.querySelectorAll('[aria-busy="true"]');
        const skeletons = document.querySelectorAll('.ct-skeleton');
        const cards = [...document.querySelectorAll('#view .ct-card')];
        const emptyCards = cards.filter((c) => c.innerText.trim().length === 0 && !c.querySelector('.ct-skeleton'));
        return { busyCount: busyRegions.length, skelCount: skeletons.length, emptyCount: emptyCards.length };
      });
      if (state.emptyCount > 0 || (state.busyCount === 0 && state.skelCount === 0)) {
        group2Bad++;
        fail(`2. #${r} under 400ms latency had empty cards (${state.emptyCount}) or no busy skeleton (${state.busyCount}/${state.skelCount})`);
      }
      await slowPage.waitForTimeout(900);
    }
    await slowCtx.close();
    if (!group2Bad) pass('2. Slow network (400ms): nurse, family, doctor, desk render skeletons with [aria-busy="true"] and no empty cards');

    // 3. Scripted call: #phone -> Lakshmi Devi -> Next slot -> Answer -> వేసుకున్నాను -> pending chip -> key 1 -> taken chip -> #family todaySummary -> #nurse 0 without yes -> #doctor
    const callCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const callPage = await callCtx.newPage();
    const callErrs = [];
    callPage.on('console', (m) => { if (m.type() === 'error') callErrs.push(m.text()); });
    callPage.on('pageerror', (e) => callErrs.push(e.message));
    await callPage.goto(`${BASE}/#phone`, { waitUntil: 'networkidle' });
    await callPage.waitForSelector('#ph-patient option', { state: 'attached' });
    const lakshmiVal = await callPage.$eval('#ph-patient', (sel) => {
      const opt = [...sel.options].find((o) => o.text.startsWith('Lakshmi'));
      return opt ? opt.value : '';
    });
    await callPage.selectOption('#ph-patient', lakshmiVal);
    await callPage.click('#ph-next');
    await callPage.waitForSelector('#ph-answer:not([disabled])');
    await callPage.click('#ph-answer');
    await callPage.waitForSelector('#ph-text:not([disabled])', { timeout: 20000 });
    await callPage.fill('#ph-text', 'వేసుకున్నాను');
    await callPage.click('#ph-send');

    await callPage.waitForFunction(() => {
      const chip = document.querySelector('#ph-chip .ct-dose-chip');
      return chip && chip.dataset.state === 'pending' && chip.innerText.includes('Waiting for your yes');
    }, { timeout: 20000 });
    const notTakenYet = await callPage.$eval('#ph-chip .ct-dose-chip', (c) => c.dataset.state !== 'taken' && !c.classList.contains('ct-status--taken'));
    if (!notTakenYet) fail('3. Dose chip showed taken before confirmation');

    await callPage.waitForSelector('[data-key="1"]:not([disabled])', { timeout: 20000 });
    await callPage.click('[data-key="1"]');
    await callPage.waitForFunction(() => {
      const chip = document.querySelector('#ph-chip .ct-dose-chip');
      return chip && chip.dataset.state === 'taken';
    }, { timeout: 20000 });

    await callPage.goto(`${BASE}/#family`, { waitUntil: 'networkidle' });
    await callPage.waitForSelector('#fa-today-summary');
    const famText = await callPage.$eval('#fa-today-summary', (n) => n.innerText);
    const nurseOk = await (async () => {
      await callPage.goto(`${BASE}/#nurse`, { waitUntil: 'networkidle' });
      await callPage.waitForSelector('#nb-metrics .ct-metric');
      return callPage.evaluate(() => {
        const m = [...document.querySelectorAll('#nb-metrics .ct-metric')].find((x) => x.innerText.includes('Doses logged without a yes'));
        return m && m.querySelector('.ct-metric__value').innerText.trim() === '0';
      });
    })();
    await callPage.goto(`${BASE}/#doctor`, { waitUntil: 'networkidle' });
    await callPage.waitForSelector('#dr-rows tr');

    if (notTakenYet && famText.includes('1 of 1 confirmed') && nurseOk && callErrs.length === 0) {
      pass('3. Scripted call confirms pending -> taken, updates family todaySummary, keeps nurse 0 without yes, and loads doctor with 0 errors');
    } else {
      fail(`3. Scripted call failed: famText="${famText}", nurseOk=${nurseOk}, errs=${callErrs.join('; ')}`);
    }

    // 4. Unclear then keypad path: new call for Lakshmi, type వేసుకున్నాను, then hmm twice -> Waiting for key 1, press 1 -> readback, press 1 -> taken
    await callPage.goto(`${BASE}/#phone`, { waitUntil: 'networkidle' });
    await callPage.waitForSelector('#ph-next:not([disabled])');
    await callPage.click('#ph-next');
    await callPage.waitForSelector('#ph-answer:not([disabled])');
    await callPage.click('#ph-answer');
    await callPage.waitForSelector('#ph-text:not([disabled])', { timeout: 20000 });
    await callPage.fill('#ph-text', 'వేసుకున్నాను');
    await callPage.click('#ph-send');
    await callPage.waitForSelector('#ph-text:not([disabled])', { timeout: 20000 });
    await callPage.fill('#ph-text', 'hmm');
    await callPage.click('#ph-send');
    await callPage.waitForSelector('#ph-text:not([disabled])', { timeout: 20000 });
    await callPage.fill('#ph-text', 'hmm');
    await callPage.click('#ph-send');

    await callPage.waitForFunction(() => {
      const chip = document.querySelector('#ph-chip .ct-dose-chip');
      return chip && chip.dataset.state === 'pending' && chip.innerText.includes('Waiting for key 1');
    }, { timeout: 20000 });
    await callPage.waitForSelector('[data-key="1"]:not([disabled])', { timeout: 20000 });
    await callPage.click('[data-key="1"]');
    await callPage.waitForFunction(() => {
      const chip = document.querySelector('#ph-chip .ct-dose-chip');
      const btn = document.querySelector('[data-key="1"]');
      return chip && chip.dataset.state === 'pending' && btn && !btn.disabled;
    }, { timeout: 20000 });
    await callPage.click('[data-key="1"]');
    await callPage.waitForFunction(() => {
      const chip = document.querySelector('#ph-chip .ct-dose-chip');
      return chip && chip.dataset.state === 'taken';
    }, { timeout: 20000 });
    pass('4. Unclear twice moves chip to "Waiting for key 1", never taken until key 1 read-back and second key 1');
    await callCtx.close();

    // 5. Reduced motion: after scripted confirm, chip shows taken state with 0 running animations
    const rmCtx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
    const rmPage = await rmCtx.newPage();
    await rmPage.goto(`${BASE}/#phone`, { waitUntil: 'networkidle' });
    await rmPage.waitForSelector('#ph-next:not([disabled])');
    await rmPage.click('#ph-next');
    await rmPage.waitForSelector('#ph-answer:not([disabled])');
    await rmPage.click('#ph-answer');
    await rmPage.waitForSelector('#ph-text:not([disabled])', { timeout: 20000 });
    await rmPage.fill('#ph-text', 'వేసుకున్నాను');
    await rmPage.click('#ph-send');
    await rmPage.waitForSelector('[data-key="1"]:not([disabled])', { timeout: 20000 });
    await rmPage.click('[data-key="1"]');
    await rmPage.waitForFunction(() => {
      const chip = document.querySelector('#ph-chip .ct-dose-chip');
      return chip && chip.dataset.state === 'taken';
    }, { timeout: 20000 });
    const animCount = await rmPage.evaluate(() => {
      const chip = document.querySelector('#ph-chip .ct-dose-chip');
      return chip ? chip.getAnimations({ subtree: true }).length : -1;
    });
    if (animCount === 0) pass('5. Reduced motion: taken chip has 0 running animations');
    else fail(`5. Reduced motion: expected 0 animations on chip, got ${animCount}`);
    await rmCtx.close();

    // 6. Print emulation on #family and #doctor: nav hidden, report visible, notice text visible
    const prCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const prPage = await prCtx.newPage();
    await prPage.emulateMedia({ media: 'print' });
    let printOk = true;
    for (const r of ['family', 'doctor']) {
      await prPage.goto(`${BASE}/#${r}`, { waitUntil: 'networkidle' });
      await prPage.waitForTimeout(200);
      const res = await prPage.evaluate(() => {
        const nav = document.querySelector('.ct-pill-header');
        const navHidden = !nav || getComputedStyle(nav).display === 'none';
        const mainVis = getComputedStyle(document.getElementById('view')).display !== 'none';
        const notice = document.body.innerText.includes('Sample data. Not medical advice.');
        return { navHidden, mainVis, notice };
      });
      if (!res.navHidden || !res.mainVis || !res.notice) {
        printOk = false;
        fail(`6. Print check failed on #${r}: ${JSON.stringify(res)}`);
      }
    }
    if (printOk) pass('6. Print media on #family and #doctor hides nav and keeps report and medical disclaimer visible');
    await prCtx.close();

    // 7. Route change moves focus to the page h1 with computed box-shadow "none"
    const focCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const focPage = await focCtx.newPage();
    await focPage.goto(`${BASE}/#home`, { waitUntil: 'networkidle' });
    let focusOk = true;
    for (const r of ['nurse', 'family', 'doctor', 'desk', 'phone']) {
      await focPage.evaluate((hash) => { location.hash = `#${hash}`; }, r);
      await focPage.waitForTimeout(150);
      const foc = await focPage.evaluate(() => {
        const el = document.activeElement;
        return {
          tag: el && el.tagName,
          boxShadow: el ? getComputedStyle(el).boxShadow : null,
        };
      });
      if (foc.tag !== 'H1' || foc.boxShadow !== 'none') {
        focusOk = false;
        fail(`7. Route change to #${r} focused ${foc.tag} with box-shadow "${foc.boxShadow}"`);
      }
    }
    if (focusOk) pass('7. Route change moves focus to the page h1 with computed box-shadow "none"');
    await focCtx.close();

    // 8. Long scripts at 360: Tamil (Meena) and Malayalam (registered on #desk, verified on #nurse, called on #phone)
    const mlCtx = await browser.newContext({ viewport: { width: 360, height: 800 } });
    const mlPage = await mlCtx.newPage();
    // First check Tamil (Meena) on #phone
    await mlPage.goto(`${BASE}/#phone`, { waitUntil: 'networkidle' });
    await mlPage.waitForSelector('#ph-patient option', { state: 'attached' });
    const meenaVal = await mlPage.$eval('#ph-patient', (sel) => {
      const opt = [...sel.options].find((o) => o.text.startsWith('Meena'));
      return opt ? opt.value : '';
    });
    await mlPage.selectOption('#ph-patient', meenaVal);
    await mlPage.waitForSelector('#ph-next:not([disabled])');
    await mlPage.click('#ph-next');
    await mlPage.waitForSelector('#ph-answer:not([disabled])');
    await mlPage.click('#ph-answer');
    await mlPage.waitForSelector('#ph-text:not([disabled])', { timeout: 25000 });
    await mlPage.fill('#ph-text', 'எடுத்துட்டேன்');
    await mlPage.click('#ph-send');
    await mlPage.waitForFunction(() => {
      const chip = document.querySelector('#ph-chip .ct-dose-chip');
      return chip && chip.dataset.state === 'pending';
    }, { timeout: 20000 });

    // Now register a Malayalam patient on #desk, verify on #nurse, and call on #phone
    await mlPage.goto(`${BASE}/#desk`, { waitUntil: 'networkidle' });
    await mlPage.waitForSelector('#f-name');
    await mlPage.fill('#f-name', 'Ammu Nair');
    await mlPage.fill('#f-age', '68');
    await mlPage.selectOption('#f-lang', 'ml');
    await mlPage.fill('#f-phone', '+91 90000 00088');
    await mlPage.fill('#f-med', 'Paracetamol');
    await mlPage.fill('#f-dose', '650 mg');
    await mlPage.click('#f-slots input[value="breakfast"]');
    await mlPage.click('#f-slots input[value="dinner"]');
    await mlPage.fill('#f-days', '5');
    await mlPage.check('#f-c1');
    await mlPage.check('#f-c2');
    await mlPage.fill('#f-nurse', 'Nurse Priya');
    await mlPage.click('#f-save');
    await mlPage.waitForTimeout(200);

    await mlPage.goto(`${BASE}/#nurse`, { waitUntil: 'networkidle' });
    await mlPage.waitForSelector('button[data-act="verify"]');
    await mlPage.click('button[data-act="verify"]');
    await mlPage.waitForTimeout(200);

    await mlPage.goto(`${BASE}/#phone`, { waitUntil: 'networkidle' });
    await mlPage.waitForSelector('#ph-patient option', { state: 'attached' });
    const ammuVal = await mlPage.$eval('#ph-patient', (sel) => {
      const opt = [...sel.options].find((o) => o.text.startsWith('Ammu'));
      return opt ? opt.value : '';
    });
    await mlPage.selectOption('#ph-patient', ammuVal);
    await mlPage.waitForSelector('#ph-next:not([disabled])');
    await mlPage.click('#ph-next');
    await mlPage.waitForSelector('#ph-answer:not([disabled])');
    await mlPage.click('#ph-answer');
    await mlPage.waitForSelector('#ph-text:not([disabled])', { timeout: 25000 });
    await mlPage.fill('#ph-text', 'ഗുളിക കഴിച്ചു');
    await mlPage.click('#ph-send');
    await mlPage.waitForFunction(() => {
      const chip = document.querySelector('#ph-chip .ct-dose-chip');
      return chip && chip.dataset.state === 'pending';
    }, { timeout: 20000 });

    const fit = await mlPage.evaluate(() => {
      const docOk = document.documentElement.scrollWidth <= window.innerWidth + 1;
      const checkEl = (sel) => {
        const n = document.querySelector(sel);
        if (!n) return true;
        return n.scrollWidth <= n.clientWidth + 2;
      };
      return docOk && checkEl('#ph-chip') && checkEl('#ph-state') && checkEl('#ph-heard');
    });
    if (fit) pass('8. Long scripts (Tamil and Malayalam) at 360px fit chip, state line, and Heard line without overflow');
    else fail('8. Long scripts at 360px overflowed chip, state line, or Heard line');
    await mlCtx.close();
  } catch (err) {
    fail(`ui-check crashed: ${err.message}`);
  } finally {
    await browser.close();
    server.close();
  }

  console.log(failed ? `\n${failed} UI check(s) failed` : '\nui-check: all 8 groups passed');
  process.exit(failed ? 1 : 0);
})();
