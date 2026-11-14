// End-to-end verification. Boots the server on a throwaway database, then drives a real browser through:
// studio -> customize -> compare -> save -> reopen -> quote -> shop dashboard, plus privacy/isolation checks.
// Run: npm test   (needs Playwright + Chromium available: `npx playwright install chromium` if missing)
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PORT = 4300 + Math.floor(Math.random() * 500), base = `http://localhost:${PORT}`;
const data = mkdtempSync(path.join(tmpdir(), 'bww-'));
const shots = process.env.BWW_SHOTS || path.join(root, 'test', 'out'); mkdirSync(shots, { recursive: true });
const server = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'server.js'], { cwd: root, env: { ...process.env, PORT, BWW_DATA_DIR: data }, stdio: 'inherit' });
let failed = 0;
const ok = (cond, name) => { console.log(`${cond ? '  PASS' : '  FAIL'}  ${name}`); if (!cond) failed++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 50; i++) { try { await fetch(base + '/api/config'); break; } catch { await sleep(100); } }

// tiny API client with its own cookie jar
function client() {
  let cookie = '';
  return async (p, { method = 'GET', body, raw, headers = {} } = {}) => {
    const res = await fetch(base + p, { method, headers: { ...(body && !raw ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { cookie } : {}), ...headers }, body: raw ? body : body ? JSON.stringify(body) : undefined });
    const sc = res.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
    const ct = res.headers.get('content-type') || '';
    return { status: res.status, data: ct.includes('json') ? await res.json() : null };
  };
}
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  console.log('\nBrowser workflow');
  const page = await browser.newPage({ viewport: { width: 390, height: 820 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base);
  await page.waitForSelector('[data-act=start]');
  ok(await page.locator('h1').innerText().then((t) => /YOUR RIDE/i.test(t)), 'studio opens with the tagline and “Customize your car”');
  await page.click('[data-act=start]'); await page.click('[data-go=demo]');
  await page.waitForSelector('.editor canvas.car-canvas');
  ok(true, 'guest can open the demo coupe without an account');
  await page.click('[data-color="#0b0b0c"]'); await page.click('[data-tab=finish]'); await page.click('[data-val=matte]');
  await page.click('[data-tab=design]'); await page.click('[data-val=stripes]');
  await page.click('[data-tab=wheels]'); await page.click('[data-val=split6]'); await page.click('[data-set=wheelFinish][data-val=black]');
  await page.click('[data-tab=tint]'); await page.click('[data-val=dark]');
  const chips = () => page.locator('#chips').innerText();
  ok(/Midnight Black/.test(await chips()) && /Matte/.test(await chips()) && /Racing stripes/.test(await chips()) && /Split 6/.test(await chips()) && /Dark/.test(await chips()), 'active selections update for color, finish, design, wheels, tint');
  await page.click('[data-act=undo]'); ok(/Stock glass/.test(await chips()), 'undo reverts the last change');
  await page.click('[data-act=redo]'); ok(/Dark/.test(await chips()), 'redo restores it');
  await page.click('[data-act=compare]');
  ok(await page.locator('.compare-ui').isVisible(), 'before/after slider appears');
  await page.locator('.compare-ui input').fill('30'); await sleep(400);
  await page.screenshot({ path: path.join(shots, '01-editor-compare.png') });
  await page.click('[data-act=compare]');

  await page.click('[data-act=save]');
  await page.fill('.modal input[name=name]', 'Ava Tester'); await page.fill('.modal input[name=email]', 'ava@example.test'); await page.fill('.modal input[name=password]', 'correct-horse-1');
  await page.click('.modal button[type=submit]');
  await page.waitForSelector('.modal input[name=year]');
  await page.fill('.modal input[name=name]', 'Midnight Gold'); await page.fill('.modal input[name=year]', '2021'); await page.fill('.modal input[name=make]', 'Dodge'); await page.fill('.modal input[name=model]', 'Challenger');
  await page.click('.modal button[type=submit]');
  await page.waitForSelector('.toast:has-text("Saved to My Garage")');
  ok(true, 'sign-up then save build to My Garage');

  await page.goto(base + '/#/garage'); await page.waitForSelector('.build');
  ok(await page.locator('.build h3').first().innerText() === 'Midnight Gold', 'saved build is listed in My Garage with its name');
  ok(await page.locator('.build .thumb img').count() === 1, 'saved build has a preview image');
  await page.screenshot({ path: path.join(shots, '02-garage.png') });
  await page.evaluate(() => localStorage.removeItem('bww.draft')); // prove the reopen comes from the database
  await page.click('.build [data-act=open] >> nth=0');
  await page.waitForSelector('.editor canvas.car-canvas');
  const c2 = await chips();
  ok(/Midnight Black/.test(c2) && /Matte/.test(c2) && /Racing stripes/.test(c2) && /Split 6/.test(c2) && /Dark/.test(c2), 'reopened build restores every selection');

  await page.click('[data-act=quote]');
  await page.waitForSelector('.modal input[name=location]');
  ok(await page.inputValue('.modal input[name=year]') === '2021', 'quote form is prefilled with vehicle details');
  await page.fill('.modal input[name=location]', '33101'); await page.click('.modal button[type=submit]');
  await page.waitForSelector('[data-send]');
  ok(/2021 Dodge Challenger/.test(await page.locator('.kv.review').innerText()), 'review screen shows the request before submission');
  await page.screenshot({ path: path.join(shots, '03-quote-review.png') });
  await page.click('[data-send]'); await page.waitForSelector('#reqNo');
  const number = await page.locator('#reqNo').innerText();
  ok(/^BWW-\d{4}-\d{4}$/.test(number), `confirmation shows request number (${number})`);
  await page.click('a[data-done]'); await page.waitForSelector('.quote');
  ok(/Submitted/.test(await page.locator('.quote .status').innerText()) && /Awaiting shop review/.test(await page.locator('.quote .price').innerText()), 'My Quotes shows status Submitted and no price before the shop responds');

  // shop staff (separate browser context = separate session)
  const staffCtx = await browser.newContext({ viewport: { width: 1280, height: 860 } }); const staff = await staffCtx.newPage();
  await staff.goto(base + '/#/account'); await staff.click('[data-signin]'); await staff.click('[data-m=login]');
  await staff.fill('.modal input[name=email]', 'staff@boselliwrapworks.test'); await staff.fill('.modal input[name=password]', 'boselli-demo'); await staff.click('.modal button[type=submit]');
  await staff.waitForSelector('a[href="#/shop"]'); await staff.goto(base + '/#/shop'); await staff.waitForSelector('.req');
  ok((await staff.locator('.req b').first().innerText()) === number, 'request appears in the Boselli shop dashboard');
  await staff.click('.req'); await staff.waitForSelector('#respond');
  ok(/Racing stripes/.test(await staff.locator('.req-detail').innerText()) && /ava@example\.test/.test(await staff.locator('.req-detail').innerText()), 'staff can review the design and customer details');
  await staff.selectOption('#respond select[name=status]', 'Quote ready'); await staff.fill('#respond input[name=price]', '3450'); await staff.fill('#respond textarea', 'Matte black with gold stripes — we can start next week.');
  await staff.click('#respond button[type=submit]'); await staff.waitForSelector('.toast:has-text("Response saved")');
  await staff.screenshot({ path: path.join(shots, '04-shop-dashboard.png') });
  await page.reload(); await page.waitForSelector('.quote');
  ok(/\$3,450/.test(await page.locator('.quote .price').innerText()) && /Quote ready/.test(await page.locator('.quote .status').innerText()), 'customer sees the shop’s price and status');
  await page.click('[data-act=accept]'); await page.waitForSelector('.status.s-accepted');
  ok(true, 'customer can accept the quote');
  await page.screenshot({ path: path.join(shots, '05-my-quotes.png'), fullPage: true });

  // photo demo with prepared masks
  await page.goto(base + '/#/studio'); await page.click('[data-act=start]'); await page.click('[data-go=sample]');
  await page.waitForSelector('.photo-canvas'); await sleep(600);
  await page.click('[data-tab=color]'); await page.click('[data-color="#1c8fc4"]'); await sleep(400);
  const blue = await page.evaluate(() => { const c = document.querySelector('.photo-canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 16) if (d[i + 2] > d[i] + 40 && d[i + 2] > 90) n++; return n; });
  ok(blue > 2000, `sample photo recolors only masked body panels (${blue} sampled blue px)`);
  await page.screenshot({ path: path.join(shots, '06-photo-demo.png') });
  ok(errors.length === 0, 'no uncaught page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));

  console.log('\nPrivacy and tenant isolation (API)');
  const ava = client(), bob = client(), anon = client(), apex = client(), boselli = client();
  await ava('/api/auth/login', { method: 'POST', body: { email: 'ava@example.test', password: 'correct-horse-1' } });
  await bob('/api/auth/signup', { method: 'POST', body: { email: 'bob@example.test', password: 'another-pass-2', name: 'Bob' } });
  await apex('/api/auth/login', { method: 'POST', body: { email: 'staff@apexwraps.test', password: 'apex-demo' } });
  await boselli('/api/auth/login', { method: 'POST', body: { email: 'staff@boselliwrapworks.test', password: 'boselli-demo' } });
  const up = await ava('/api/uploads', { method: 'POST', raw: true, body: PNG, headers: { 'Content-Type': 'image/png', 'X-BWW-Upload': '1' } });
  ok(up.status === 201, 'owner can upload a private photo');
  ok((await ava('/api/uploads/' + up.data.id)).status === 200, 'owner can read their upload');
  ok((await bob('/api/uploads/' + up.data.id)).status === 404, 'another customer cannot read the upload');
  ok((await anon('/api/uploads/' + up.data.id)).status === 401, 'signed-out visitor cannot read the upload');
  ok((await boselli('/api/uploads/' + up.data.id)).status === 404, 'staff cannot read uploads that are not attached to a quote for their shop');
  const avaBuilds = (await ava('/api/builds')).data.builds, avaQuotes = (await ava('/api/quotes')).data.quotes;
  ok((await bob('/api/builds/' + avaBuilds[0].id)).status === 404, 'another customer cannot open the build');
  ok((await bob('/api/builds/' + avaBuilds[0].id, { method: 'DELETE' })).status === 404, 'another customer cannot delete the build');
  ok((await bob('/api/quotes/' + avaQuotes[0].id)).status === 404, 'another customer cannot read the quote');
  ok((await bob('/api/quotes')).data.quotes.length === 0, 'another customer’s quote list is empty');
  ok((await bob('/api/quotes', { method: 'POST', body: { buildId: avaBuilds[0].id, vehicle: { year: '2020', make: 'A', model: 'B' }, services: ['full_wrap'], location: 'x', contact: { name: 'B', email: 'b@b.co' } } })).status === 404, 'cannot request a quote on someone else’s build');
  ok((await bob('/api/shop/quotes')).status === 403, 'customers cannot reach the shop dashboard API');
  ok((await apex('/api/shop/quotes')).data.quotes.length === 0, 'other shop sees none of Boselli’s requests');
  ok((await apex('/api/shop/quotes/' + avaQuotes[0].id)).status === 404, 'other shop cannot open a Boselli request by id');
  ok((await apex('/api/shop/quotes/' + avaQuotes[0].id, { method: 'PATCH', body: { status: 'Declined' } })).status === 404, 'other shop cannot modify a Boselli request');
  ok((await boselli('/api/shop/quotes')).data.quotes.length === 1, 'Boselli staff see their request');
  ok((await anon('/api/share/nope')).status === 404, 'builds are not shared unless the owner creates a link');
  const sh = await ava(`/api/builds/${avaBuilds[0].id}/share`, { method: 'POST', body: { enabled: true } });
  const pub = await anon('/api/share/' + sh.data.shareToken);
  ok(pub.status === 200 && !('uploadId' in pub.data.build) && !('masks' in pub.data.build), 'share link exposes only the preview and selections');
  await ava(`/api/builds/${avaBuilds[0].id}/share`, { method: 'POST', body: { enabled: false } });
  ok((await anon('/api/share/' + sh.data.shareToken)).status === 404, 'share link stops working when the owner turns it off');
  ok((await anon('/api/quotes')).status === 401, 'quotes require sign-in');
} catch (e) { console.error(e); failed++; } finally {
  await browser.close(); server.kill(); rmSync(data, { recursive: true, force: true });
}
console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed'); process.exit(failed ? 1 : 0);
