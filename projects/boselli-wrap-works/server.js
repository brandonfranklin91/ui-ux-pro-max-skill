// Boselli Wrap Works — zero-framework Node server (node:http + node:sqlite).
// Run: npm install && npm start   (Node >= 22.13)
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const DATA_DIR = process.env.BWW_DATA_DIR || path.join(ROOT, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const PUBLIC_DIR = path.join(ROOT, 'public');
const THREE_DIR = path.join(ROOT, 'node_modules', 'three');
const SESSION_DAYS = 30;
const MAX_JSON = 6 * 1024 * 1024;
const MAX_UPLOAD = 12 * 1024 * 1024;
const SECURE_COOKIE = process.env.NODE_ENV === 'production';

// Integrations awaiting credentials (reported to the client so the UI can label demo features).
const INTEGRATIONS = {
  segmentation: Boolean(process.env.SEGMENTATION_API_KEY), // AI panel segmentation / image editing
  billing: Boolean(process.env.STRIPE_SECRET_KEY), // Stripe subscriptions
  email: Boolean(process.env.SMTP_URL), // quote notification e-mail
};

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'boselli.db'));
db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS shops (
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  settings TEXT NOT NULL, plan_status TEXT NOT NULL DEFAULT 'none',
  plan_renews TEXT, previews_used INTEGER NOT NULL DEFAULT 0, period_start TEXT
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, pass TEXT NOT NULL, name TEXT NOT NULL,
  phone TEXT DEFAULT '', role TEXT NOT NULL DEFAULT 'customer', shop_id INTEGER REFERENCES shops(id),
  prefs TEXT NOT NULL DEFAULT '{}', previews_used INTEGER NOT NULL DEFAULT 0, created TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT, mime TEXT NOT NULL, size INTEGER NOT NULL, created TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS builds (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, mode TEXT NOT NULL DEFAULT '3d', vehicle TEXT NOT NULL DEFAULT '{}',
  config TEXT NOT NULL, masks TEXT, upload_id TEXT, thumb TEXT, share_token TEXT UNIQUE,
  created TEXT NOT NULL, updated TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY, number TEXT UNIQUE NOT NULL, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_id INTEGER NOT NULL REFERENCES shops(id), build_id INTEGER, snapshot TEXT NOT NULL,
  vehicle TEXT NOT NULL, services TEXT NOT NULL, location TEXT NOT NULL, timing TEXT NOT NULL,
  contact TEXT NOT NULL, notes TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'Submitted',
  estimate_cents INTEGER, price_cents INTEGER, turnaround TEXT, created TEXT NOT NULL, updated TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS quote_messages (
  id INTEGER PRIMARY KEY, quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  author TEXT NOT NULL, author_name TEXT NOT NULL, body TEXT NOT NULL, created TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS colors (
  id INTEGER PRIMARY KEY, shop_id INTEGER NOT NULL REFERENCES shops(id), name TEXT NOT NULL,
  hex TEXT NOT NULL, family TEXT DEFAULT '', active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY, shop_id INTEGER NOT NULL REFERENCES shops(id), key TEXT NOT NULL,
  name TEXT NOT NULL, base_cents INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1
);
`);

const STATUSES = ['Submitted', 'Under review', 'Quote ready', 'Accepted', 'Declined'];
const FINISHES = ['gloss', 'satin', 'matte'];
const PLAN = { name: 'Shop Pro', price_cents: 7900, included_previews: 400, overage_cents: 15, staff_seats: 5 };
const now = () => new Date().toISOString();
const q = (sql) => db.prepare(sql);
const J = (s, d = {}) => { try { return JSON.parse(s); } catch { return d; } };

// ---------- seed ----------
const DEFAULT_SETTINGS = {
  freePreviewAllowance: 5,
  autoEstimate: false,
  turnaround: 'Most wraps: 3–5 business days after materials arrive',
  finishes: { gloss: true, satin: true, matte: true },
  finishMultiplier: { gloss: 1, satin: 1.08, matte: 1.12 },
  sizeMultiplier: { coupe: 1, sedan: 1.05, suv: 1.2, truck: 1.25 },
};
const SEED_COLORS = [
  ['Midnight Black', '#0b0b0c', 'Black'], ['Boselli Gold', '#c9a227', 'Gold'], ['Warm Cream', '#efe4cf', 'White'],
  ['Burgundy Reserve', '#5a1220', 'Red'], ['Nardo Grey', '#7d8388', 'Grey'], ['Liquid Silver', '#b9bcc0', 'Grey'],
  ['Pearl White', '#f3f1ec', 'White'], ['Racing Red', '#b3121b', 'Red'], ['Miami Blue', '#1c8fc4', 'Blue'],
  ['Deep Ocean', '#10305c', 'Blue'], ['British Green', '#12402d', 'Green'], ['Lime Rush', '#8cc63f', 'Green'],
  ['Sunset Orange', '#e2622a', 'Orange'], ['Signal Yellow', '#f2c21a', 'Yellow'], ['Royal Purple', '#4b2a7a', 'Purple'],
  ['Rose Quartz', '#d98a9a', 'Pink'], ['Bronze Age', '#7a5a3a', 'Brown'], ['Gunmetal', '#3a3f45', 'Grey'],
];
const SEED_SERVICES = [
  ['full_wrap', 'Full vehicle wrap', 320000], ['partial_wrap', 'Partial wrap (roof / hood / accents)', 90000],
  ['stripes', 'Racing stripes', 60000], ['tint', 'Window tint', 35000], ['wheels', 'Wheel finish / powder coat', 80000],
  ['ppf', 'Paint protection film', 180000],
];
function hashPassword(pw, salt = crypto.randomBytes(16).toString('hex')) {
  return salt + ':' + crypto.scryptSync(pw, salt, 64).toString('hex');
}
function checkPassword(pw, stored) {
  const [salt, hash] = stored.split(':');
  const a = Buffer.from(hash, 'hex');
  const b = crypto.scryptSync(pw, salt, 64);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function seedShop(slug, name, staffEmail, staffPw, staffName) {
  if (q('SELECT id FROM shops WHERE slug=?').get(slug)) return;
  const shopId = q('INSERT INTO shops (slug,name,settings,period_start) VALUES (?,?,?,?)')
    .run(slug, name, JSON.stringify(DEFAULT_SETTINGS), now()).lastInsertRowid;
  for (const [n, hex, fam] of SEED_COLORS) q('INSERT INTO colors (shop_id,name,hex,family) VALUES (?,?,?,?)').run(shopId, n, hex, fam);
  for (const [k, n, c] of SEED_SERVICES) q('INSERT INTO services (shop_id,key,name,base_cents) VALUES (?,?,?,?)').run(shopId, k, n, c);
  q('INSERT INTO users (email,pass,name,role,shop_id,created) VALUES (?,?,?,?,?,?)')
    .run(staffEmail, hashPassword(staffPw), staffName, 'staff', shopId, now());
}
// Demo staff accounts — change or remove before going live (see README).
seedShop('boselli', 'Boselli Wrap Works', 'staff@boselliwrapworks.test', process.env.BWW_STAFF_PASSWORD || 'boselli-demo', 'Boselli Staff');
seedShop('apex', 'Apex Wraps (demo tenant)', 'staff@apexwraps.test', process.env.APEX_STAFF_PASSWORD || 'apex-demo', 'Apex Staff');

// ---------- helpers ----------
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const bad = (m) => new HttpError(400, m);
function send(res, status, body, headers = {}) {
  const data = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(data);
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new HttpError(413, 'That file is too large.')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
async function readJson(req) {
  if (!(req.headers['content-type'] || '').startsWith('application/json')) throw new HttpError(415, 'Expected JSON.');
  const buf = await readBody(req, MAX_JSON);
  try { return JSON.parse(buf.toString('utf8') || '{}'); } catch { throw bad('Invalid JSON.'); }
}
const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isHex = (v) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');
function cookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function sessionCookie(token, maxAge) {
  return `bww_sid=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${SECURE_COOKIE ? '; Secure' : ''}`;
}
function startSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  q('INSERT INTO sessions (token_hash,user_id,expires) VALUES (?,?,?)').run(sha(token), userId, Date.now() + SESSION_DAYS * 864e5);
  res.setHeader('Set-Cookie', sessionCookie(token, SESSION_DAYS * 86400));
}
function currentUser(req) {
  const token = cookies(req).bww_sid;
  if (!token) return null;
  const row = q('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>?').get(sha(token), Date.now());
  return row || null;
}
function requireUser(req) { const u = currentUser(req); if (!u) throw new HttpError(401, 'Please sign in to continue.'); return u; }
function requireStaff(req) {
  const u = requireUser(req);
  if (u.role !== 'staff' || !u.shop_id) throw new HttpError(403, 'Shop staff access only.');
  return u;
}
function shopBySlug(slug) {
  const s = q('SELECT * FROM shops WHERE slug=?').get(slug || 'boselli');
  if (!s) throw new HttpError(404, 'Shop not found.');
  return s;
}
const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, phone: u.phone, role: u.role, prefs: J(u.prefs), previewsUsed: u.previews_used });
const attempts = new Map(); // naive login throttle
function throttle(key) {
  const t = Date.now(); const a = (attempts.get(key) || []).filter((x) => t - x < 10 * 60e3);
  if (a.length >= 10) throw new HttpError(429, 'Too many attempts. Try again in a few minutes.');
  a.push(t); attempts.set(key, a);
}

function buildRow(b, full = true) {
  const o = { id: b.id, name: b.name, mode: b.mode, vehicle: J(b.vehicle), config: J(b.config), uploadId: b.upload_id,
    thumb: b.thumb, shared: Boolean(b.share_token), shareToken: b.share_token, created: b.created, updated: b.updated };
  if (full) o.masks = J(b.masks, null);
  return o;
}
function quoteRow(r, withMessages = true) {
  const o = { id: r.id, number: r.number, buildId: r.build_id, snapshot: J(r.snapshot), vehicle: J(r.vehicle), services: J(r.services, []),
    location: r.location, timing: r.timing, contact: J(r.contact), notes: r.notes, status: r.status,
    estimateCents: r.estimate_cents, priceCents: r.price_cents, turnaround: r.turnaround, created: r.created, updated: r.updated };
  if (withMessages) o.messages = q('SELECT author,author_name AS authorName,body,created FROM quote_messages WHERE quote_id=? ORDER BY id').all(r.id);
  return o;
}
function validateBuild(body) {
  const name = str(body.name, 60); if (!name) throw bad('Give your build a name.');
  const mode = body.mode === 'photo' ? 'photo' : '3d';
  const config = body.config; if (!config || typeof config !== 'object') throw bad('Missing design selections.');
  const v = body.vehicle || {};
  const vehicle = { year: str(String(v.year ?? ''), 4), make: str(v.make, 40), model: str(v.model, 40) };
  const thumb = typeof body.thumb === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(body.thumb) && body.thumb.length < 600000 ? body.thumb : null;
  const masks = body.masks && typeof body.masks === 'object' ? JSON.stringify(body.masks) : null;
  if (masks && masks.length > 4 * 1024 * 1024) throw bad('Selection data is too large.');
  return { name, mode, config: JSON.stringify(config), vehicle: JSON.stringify(vehicle), thumb, masks, uploadId: str(body.uploadId, 64) || null };
}
function estimate(shop, serviceKeys, finish, size) {
  const s = J(shop.settings);
  if (!s.autoEstimate) return null;
  const rows = q('SELECT key,base_cents FROM services WHERE shop_id=? AND active=1').all(shop.id);
  let total = 0;
  for (const r of rows) if (serviceKeys.includes(r.key)) total += r.base_cents;
  if (!total) return null;
  const fm = (s.finishMultiplier || {})[finish] || 1; const sm = (s.sizeMultiplier || {})[size] || 1;
  return Math.round((total * fm * sm) / 100) * 100;
}
function sniffImage(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
  if (buf.length > 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length > 12 && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'image/webp';
  return null;
}

// ---------- API routes ----------
const routes = [];
const route = (method, pattern, handler) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), handler });

route('GET', '/api/config', (req, res, { url }) => {
  const shop = shopBySlug(url.searchParams.get('shop'));
  const s = J(shop.settings);
  send(res, 200, {
    shop: { slug: shop.slug, name: shop.name, turnaround: s.turnaround, freePreviewAllowance: s.freePreviewAllowance, autoEstimate: s.autoEstimate },
    colors: q('SELECT id,name,hex,family FROM colors WHERE shop_id=? AND active=1 ORDER BY id').all(shop.id),
    finishes: FINISHES.filter((f) => s.finishes?.[f] !== false),
    services: q('SELECT key,name FROM services WHERE shop_id=? AND active=1 ORDER BY id').all(shop.id),
    integrations: INTEGRATIONS, plan: PLAN, statuses: STATUSES,
  });
});

route('POST', '/api/auth/signup', async (req, res) => {
  const b = await readJson(req);
  const email = str(b.email, 120).toLowerCase(); const name = str(b.name, 80); const pw = typeof b.password === 'string' ? b.password : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw bad('Enter a valid email address.');
  if (!name) throw bad('Tell us your name.');
  if (pw.length < 8) throw bad('Use a password of at least 8 characters.');
  throttle('signup:' + req.socket.remoteAddress);
  if (q('SELECT id FROM users WHERE email=?').get(email)) throw new HttpError(409, 'An account with that email already exists. Try signing in.');
  const id = q('INSERT INTO users (email,pass,name,created) VALUES (?,?,?,?)').run(email, hashPassword(pw), name, now()).lastInsertRowid;
  startSession(res, id);
  send(res, 201, { user: publicUser(q('SELECT * FROM users WHERE id=?').get(id)) });
});
route('POST', '/api/auth/login', async (req, res) => {
  const b = await readJson(req);
  const email = str(b.email, 120).toLowerCase();
  throttle('login:' + email);
  const u = q('SELECT * FROM users WHERE email=?').get(email);
  if (!u || !checkPassword(String(b.password || ''), u.pass)) throw new HttpError(401, 'Email or password is incorrect.');
  startSession(res, u.id);
  send(res, 200, { user: publicUser(u) });
});
route('POST', '/api/auth/logout', (req, res) => {
  const token = cookies(req).bww_sid;
  if (token) q('DELETE FROM sessions WHERE token_hash=?').run(sha(token));
  res.setHeader('Set-Cookie', sessionCookie('', 0));
  send(res, 200, { ok: true });
});
route('GET', '/api/me', (req, res) => {
  const u = currentUser(req);
  let shop = null;
  if (u?.role === 'staff') { const s = q('SELECT slug,name FROM shops WHERE id=?').get(u.shop_id); shop = s; }
  send(res, 200, { user: u ? publicUser(u) : null, staffShop: shop });
});
route('PATCH', '/api/me', async (req, res) => {
  const u = requireUser(req); const b = await readJson(req);
  const name = b.name !== undefined ? str(b.name, 80) || u.name : u.name;
  const phone = b.phone !== undefined ? str(b.phone, 30) : u.phone;
  let prefs = J(u.prefs);
  if (b.prefs && typeof b.prefs === 'object') { prefs = { ...prefs, ...b.prefs }; if (JSON.stringify(prefs).length > 20000) throw bad('Preferences too large.'); }
  q('UPDATE users SET name=?, phone=?, prefs=? WHERE id=?').run(name, phone, JSON.stringify(prefs), u.id);
  send(res, 200, { user: publicUser(q('SELECT * FROM users WHERE id=?').get(u.id)) });
});
route('POST', '/api/me/password', async (req, res) => {
  const u = requireUser(req); const b = await readJson(req);
  if (!checkPassword(String(b.current || ''), u.pass)) throw new HttpError(403, 'Current password is incorrect.');
  if (String(b.next || '').length < 8) throw bad('Use a password of at least 8 characters.');
  q('UPDATE users SET pass=? WHERE id=?').run(hashPassword(String(b.next)), u.id);
  send(res, 200, { ok: true });
});

// Preview allowance: one unit per customer photo opened for editing (the costly image-processing path).
route('POST', '/api/previews/consume', async (req, res) => {
  const u = requireUser(req); const b = await readJson(req);
  const shop = shopBySlug(str(b.shop, 40));
  const allowance = J(shop.settings).freePreviewAllowance ?? 5;
  if (u.role !== 'staff' && u.previews_used >= allowance) {
    throw new HttpError(402, `You've used all ${allowance} free photo previews. Request a quote and the shop can continue your design.`);
  }
  q('UPDATE users SET previews_used=previews_used+1 WHERE id=?').run(u.id);
  q('UPDATE shops SET previews_used=previews_used+1 WHERE id=?').run(shop.id);
  send(res, 200, { used: u.previews_used + 1, allowance });
});

// Private uploads — stored outside the web root, served only to the owner
// (or to staff of a shop that received a quote for a build using the upload).
route('POST', '/api/uploads', async (req, res) => {
  const u = requireUser(req);
  if (!req.headers['x-bww-upload']) throw bad('Missing upload header.');
  const buf = await readBody(req, MAX_UPLOAD);
  const mime = sniffImage(buf);
  if (!mime) throw bad('Please upload a JPG, PNG or WebP photo.');
  const id = crypto.randomBytes(16).toString('hex');
  fs.writeFileSync(path.join(UPLOAD_DIR, id), buf);
  q('INSERT INTO uploads (id,user_id,filename,mime,size,created) VALUES (?,?,?,?,?,?)')
    .run(id, u.id, str(decodeURIComponent(String(req.headers['x-filename'] || 'photo')), 120), mime, buf.length, now());
  send(res, 201, { id });
});
route('GET', '/api/uploads/:id', (req, res, { params }) => {
  const u = requireUser(req);
  const up = q('SELECT * FROM uploads WHERE id=?').get(params.id);
  let ok = up && up.user_id === u.id;
  if (up && !ok && u.role === 'staff') {
    ok = Boolean(q(`SELECT 1 FROM quotes WHERE shop_id=? AND user_id=? AND json_extract(snapshot,'$.uploadId')=?`).get(u.shop_id, up.user_id, up.id));
  }
  if (!ok) throw new HttpError(404, 'Not found.'); // 404 (not 403) so IDs cannot be probed
  res.writeHead(200, { 'Content-Type': up.mime, 'Content-Length': up.size, 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' });
  fs.createReadStream(path.join(UPLOAD_DIR, up.id)).pipe(res);
});

route('GET', '/api/builds', (req, res) => {
  const u = requireUser(req);
  send(res, 200, { builds: q('SELECT * FROM builds WHERE user_id=? ORDER BY updated DESC').all(u.id).map((b) => buildRow(b, false)) });
});
route('POST', '/api/builds', async (req, res) => {
  const u = requireUser(req); const v = validateBuild(await readJson(req));
  if (v.uploadId && !q('SELECT 1 FROM uploads WHERE id=? AND user_id=?').get(v.uploadId, u.id)) throw bad('Upload not found.');
  const t = now();
  const id = q('INSERT INTO builds (user_id,name,mode,vehicle,config,masks,upload_id,thumb,created,updated) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(u.id, v.name, v.mode, v.vehicle, v.config, v.masks, v.uploadId, v.thumb, t, t).lastInsertRowid;
  send(res, 201, { build: buildRow(q('SELECT * FROM builds WHERE id=?').get(id)) });
});
function ownBuild(u, id) {
  const b = q('SELECT * FROM builds WHERE id=? AND user_id=?').get(Number(id), u.id);
  if (!b) throw new HttpError(404, 'Build not found.');
  return b;
}
route('GET', '/api/builds/:id', (req, res, { params }) => send(res, 200, { build: buildRow(ownBuild(requireUser(req), params.id)) }));
route('PUT', '/api/builds/:id', async (req, res, { params }) => {
  const u = requireUser(req); const b = ownBuild(u, params.id); const v = validateBuild(await readJson(req));
  q('UPDATE builds SET name=?, vehicle=?, config=?, masks=COALESCE(?,masks), thumb=COALESCE(?,thumb), updated=? WHERE id=?')
    .run(v.name, v.vehicle, v.config, v.masks, v.thumb, now(), b.id);
  send(res, 200, { build: buildRow(q('SELECT * FROM builds WHERE id=?').get(b.id)) });
});
route('DELETE', '/api/builds/:id', (req, res, { params }) => {
  const u = requireUser(req); const b = ownBuild(u, params.id);
  q('DELETE FROM builds WHERE id=?').run(b.id);
  send(res, 200, { ok: true });
});
route('POST', '/api/builds/:id/share', async (req, res, { params }) => {
  const u = requireUser(req); const b = ownBuild(u, params.id); const body = await readJson(req);
  const token = body.enabled ? b.share_token || crypto.randomBytes(12).toString('base64url') : null;
  q('UPDATE builds SET share_token=? WHERE id=?').run(token, b.id);
  send(res, 200, { shareToken: token });
});
// Public share view: only the rendered preview + selections. Never the original upload or owner details.
route('GET', '/api/share/:token', (req, res, { params }) => {
  const b = q('SELECT name,mode,vehicle,config,thumb FROM builds WHERE share_token=?').get(params.token);
  if (!b) throw new HttpError(404, 'This share link is no longer available.');
  send(res, 200, { build: { name: b.name, mode: b.mode, vehicle: J(b.vehicle), config: J(b.config), thumb: b.thumb } });
});

route('POST', '/api/quotes', async (req, res) => {
  const u = requireUser(req); const b = await readJson(req);
  const shop = shopBySlug(str(b.shop, 40));
  const build = ownBuild(u, b.buildId);
  const v = b.vehicle || {}; const c = b.contact || {};
  const vehicle = { year: str(String(v.year ?? ''), 4), make: str(v.make, 40), model: str(v.model, 40), size: str(v.size, 12) || 'coupe' };
  if (!/^(19|20)\d\d$/.test(vehicle.year) || !vehicle.make || !vehicle.model) throw bad('Enter the vehicle year, make and model.');
  const valid = q('SELECT key,name FROM services WHERE shop_id=? AND active=1').all(shop.id);
  const services = (Array.isArray(b.services) ? b.services : []).filter((k) => valid.some((s) => s.key === k));
  if (!services.length) throw bad('Choose at least one service.');
  const location = str(b.location, 80); if (!location) throw bad('Enter your city or ZIP code.');
  const timing = str(b.timing, 60) || 'Flexible';
  const contact = { name: str(c.name, 80), email: str(c.email, 120), phone: str(c.phone, 30) };
  if (!contact.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) throw bad('Enter your name and a valid email.');
  const cfg = J(build.config);
  const snapshot = { name: build.name, mode: build.mode, config: cfg, thumb: build.thumb, uploadId: build.upload_id,
    serviceNames: services.map((k) => valid.find((s) => s.key === k).name) };
  const t = now(); const year = new Date().getFullYear();
  const est = estimate(shop, services, cfg.finish, vehicle.size);
  const id = q(`INSERT INTO quotes (number,user_id,shop_id,build_id,snapshot,vehicle,services,location,timing,contact,notes,estimate_cents,created,updated)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run('PENDING-' + crypto.randomBytes(6).toString('hex'), u.id, shop.id, build.id, JSON.stringify(snapshot),
    JSON.stringify(vehicle), JSON.stringify(services), location, timing, JSON.stringify(contact), str(b.notes, 1000), est, t, t).lastInsertRowid;
  const number = `BWW-${year}-${String(id).padStart(4, '0')}`;
  q('UPDATE quotes SET number=? WHERE id=?').run(number, id);
  send(res, 201, { quote: quoteRow(q('SELECT * FROM quotes WHERE id=?').get(id)) });
});
route('GET', '/api/quotes', (req, res) => {
  const u = requireUser(req);
  send(res, 200, { quotes: q('SELECT * FROM quotes WHERE user_id=? ORDER BY id DESC').all(u.id).map((r) => quoteRow(r)) });
});
function ownQuote(u, id) {
  const r = q('SELECT * FROM quotes WHERE id=? AND user_id=?').get(Number(id), u.id);
  if (!r) throw new HttpError(404, 'Quote not found.');
  return r;
}
route('GET', '/api/quotes/:id', (req, res, { params }) => send(res, 200, { quote: quoteRow(ownQuote(requireUser(req), params.id)) }));
route('POST', '/api/quotes/:id/respond', async (req, res, { params }) => {
  const u = requireUser(req); const r = ownQuote(u, params.id); const b = await readJson(req);
  if (b.action === 'accept' || b.action === 'decline') {
    if (r.status !== 'Quote ready') throw bad('This quote is not ready to accept yet.');
    q('UPDATE quotes SET status=?, updated=? WHERE id=?').run(b.action === 'accept' ? 'Accepted' : 'Declined', now(), r.id);
  }
  const msg = str(b.message, 1000);
  if (msg) q('INSERT INTO quote_messages (quote_id,author,author_name,body,created) VALUES (?,?,?,?,?)').run(r.id, 'customer', u.name, msg, now());
  send(res, 200, { quote: quoteRow(q('SELECT * FROM quotes WHERE id=?').get(r.id)) });
});

// ----- shop dashboard: every query is scoped to the staff member's shop_id -----
route('GET', '/api/shop/overview', (req, res) => {
  const u = requireStaff(req); const shop = q('SELECT * FROM shops WHERE id=?').get(u.shop_id);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const r of q('SELECT status, COUNT(*) AS n FROM quotes WHERE shop_id=? GROUP BY status').all(shop.id)) counts[r.status] = r.n;
  send(res, 200, {
    shop: { slug: shop.slug, name: shop.name, settings: J(shop.settings) }, counts,
    billing: { status: shop.plan_status, renews: shop.plan_renews, previewsUsed: shop.previews_used, plan: PLAN, testMode: !INTEGRATIONS.billing },
    colors: q('SELECT * FROM colors WHERE shop_id=? ORDER BY id').all(shop.id),
    services: q('SELECT * FROM services WHERE shop_id=? ORDER BY id').all(shop.id),
  });
});
route('GET', '/api/shop/quotes', (req, res, { url }) => {
  const u = requireStaff(req); const status = url.searchParams.get('status');
  const rows = status && STATUSES.includes(status)
    ? q('SELECT * FROM quotes WHERE shop_id=? AND status=? ORDER BY id DESC').all(u.shop_id, status)
    : q('SELECT * FROM quotes WHERE shop_id=? ORDER BY id DESC').all(u.shop_id);
  send(res, 200, { quotes: rows.map((r) => quoteRow(r)) });
});
function shopQuote(u, id) {
  const r = q('SELECT * FROM quotes WHERE id=? AND shop_id=?').get(Number(id), u.shop_id);
  if (!r) throw new HttpError(404, 'Quote not found.');
  return r;
}
route('GET', '/api/shop/quotes/:id', (req, res, { params }) => send(res, 200, { quote: quoteRow(shopQuote(requireStaff(req), params.id)) }));
route('PATCH', '/api/shop/quotes/:id', async (req, res, { params }) => {
  const u = requireStaff(req); const r = shopQuote(u, params.id); const b = await readJson(req);
  let status = r.status;
  if (b.status !== undefined) { if (!STATUSES.includes(b.status)) throw bad('Unknown status.'); status = b.status; }
  let price = r.price_cents;
  if (b.priceCents !== undefined) {
    if (b.priceCents === null || b.priceCents === '') price = null;
    else { price = Math.round(Number(b.priceCents)); if (!Number.isFinite(price) || price < 0 || price > 1e9) throw bad('Enter a valid price.'); }
  }
  if (status === 'Quote ready' && price == null) throw bad('Enter a price before marking the quote ready.');
  const turnaround = b.turnaround !== undefined ? str(b.turnaround, 120) : r.turnaround;
  q('UPDATE quotes SET status=?, price_cents=?, turnaround=?, updated=? WHERE id=?').run(status, price, turnaround, now(), r.id);
  const msg = str(b.message, 1000);
  if (msg) q('INSERT INTO quote_messages (quote_id,author,author_name,body,created) VALUES (?,?,?,?,?)').run(r.id, 'shop', u.name, msg, now());
  send(res, 200, { quote: quoteRow(q('SELECT * FROM quotes WHERE id=?').get(r.id)) });
});
route('PUT', '/api/shop/settings', async (req, res) => {
  const u = requireStaff(req); const b = await readJson(req);
  const cur = J(q('SELECT settings FROM shops WHERE id=?').get(u.shop_id).settings);
  const num = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
  const next = { ...cur };
  if (b.freePreviewAllowance !== undefined) next.freePreviewAllowance = Math.round(num(b.freePreviewAllowance, 0, 1000, cur.freePreviewAllowance));
  if (b.autoEstimate !== undefined) next.autoEstimate = Boolean(b.autoEstimate);
  if (b.turnaround !== undefined) next.turnaround = str(b.turnaround, 160);
  if (b.finishes) next.finishes = Object.fromEntries(FINISHES.map((f) => [f, b.finishes[f] !== false]));
  if (!Object.values(next.finishes).some(Boolean)) throw bad('Keep at least one finish available.');
  if (b.finishMultiplier) next.finishMultiplier = Object.fromEntries(FINISHES.map((f) => [f, num(b.finishMultiplier[f], 0.1, 10, cur.finishMultiplier[f])]));
  if (b.sizeMultiplier) next.sizeMultiplier = Object.fromEntries(Object.keys(cur.sizeMultiplier).map((k) => [k, num(b.sizeMultiplier[k], 0.1, 10, cur.sizeMultiplier[k])]));
  q('UPDATE shops SET settings=? WHERE id=?').run(JSON.stringify(next), u.shop_id);
  send(res, 200, { settings: next });
});
route('POST', '/api/shop/colors', async (req, res) => {
  const u = requireStaff(req); const b = await readJson(req);
  const name = str(b.name, 40); if (!name || !isHex(b.hex)) throw bad('Enter a color name and a hex value like #c9a227.');
  const id = q('INSERT INTO colors (shop_id,name,hex,family) VALUES (?,?,?,?)').run(u.shop_id, name, b.hex.toLowerCase(), str(b.family, 20)).lastInsertRowid;
  send(res, 201, { color: q('SELECT * FROM colors WHERE id=?').get(id) });
});
route('PATCH', '/api/shop/colors/:id', async (req, res, { params }) => {
  const u = requireStaff(req); const b = await readJson(req);
  const c = q('SELECT * FROM colors WHERE id=? AND shop_id=?').get(Number(params.id), u.shop_id); if (!c) throw new HttpError(404, 'Not found.');
  q('UPDATE colors SET name=?, hex=?, active=? WHERE id=?').run(str(b.name, 40) || c.name, isHex(b.hex) ? b.hex.toLowerCase() : c.hex,
    b.active === undefined ? c.active : b.active ? 1 : 0, c.id);
  send(res, 200, { color: q('SELECT * FROM colors WHERE id=?').get(c.id) });
});
route('DELETE', '/api/shop/colors/:id', (req, res, { params }) => {
  const u = requireStaff(req);
  q('DELETE FROM colors WHERE id=? AND shop_id=?').run(Number(params.id), u.shop_id);
  send(res, 200, { ok: true });
});
route('POST', '/api/shop/services', async (req, res) => {
  const u = requireStaff(req); const b = await readJson(req);
  const name = str(b.name, 60); if (!name) throw bad('Enter a service name.');
  const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30) + '_' + crypto.randomBytes(2).toString('hex');
  const id = q('INSERT INTO services (shop_id,key,name,base_cents) VALUES (?,?,?,?)').run(u.shop_id, key, name, Math.max(0, Math.round(Number(b.baseCents) || 0))).lastInsertRowid;
  send(res, 201, { service: q('SELECT * FROM services WHERE id=?').get(id) });
});
route('PATCH', '/api/shop/services/:id', async (req, res, { params }) => {
  const u = requireStaff(req); const b = await readJson(req);
  const s = q('SELECT * FROM services WHERE id=? AND shop_id=?').get(Number(params.id), u.shop_id); if (!s) throw new HttpError(404, 'Not found.');
  const cents = b.baseCents === undefined ? s.base_cents : Math.max(0, Math.round(Number(b.baseCents) || 0));
  q('UPDATE services SET name=?, base_cents=?, active=? WHERE id=?').run(str(b.name, 60) || s.name, cents, b.active === undefined ? s.active : b.active ? 1 : 0, s.id);
  send(res, 200, { service: q('SELECT * FROM services WHERE id=?').get(s.id) });
});
// Subscription billing (separate from customer install quotes). Test mode until STRIPE_SECRET_KEY is set.
route('POST', '/api/shop/billing', async (req, res) => {
  const u = requireStaff(req); const b = await readJson(req);
  if (INTEGRATIONS.billing) throw new HttpError(501, 'Live Stripe checkout is not wired yet — see README “Integrations”.');
  if (b.action === 'subscribe') {
    q('UPDATE shops SET plan_status=?, plan_renews=?, previews_used=0, period_start=? WHERE id=?')
      .run('test_active', new Date(Date.now() + 30 * 864e5).toISOString(), now(), u.shop_id);
  } else if (b.action === 'cancel') {
    q('UPDATE shops SET plan_status=?, plan_renews=NULL WHERE id=?').run('none', u.shop_id);
  } else throw bad('Unknown billing action.');
  const s = q('SELECT plan_status,plan_renews,previews_used FROM shops WHERE id=?').get(u.shop_id);
  send(res, 200, { billing: { status: s.plan_status, renews: s.plan_renews, previewsUsed: s.previews_used, plan: PLAN, testMode: true } });
});

// ---------- static ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
function serveFile(res, base, rel, cache) {
  const file = path.normalize(path.join(base, rel));
  if (!file.startsWith(base + path.sep)) return false;
  let st; try { st = fs.statSync(file); } catch { return false; }
  if (!st.isFile()) return false;
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Content-Length': st.size,
    'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff' });
  fs.createReadStream(file).pipe(res);
  return true;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = decodeURIComponent(url.pathname);
  try {
    if (p.startsWith('/api/')) {
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const m = r.re.exec(p);
        if (m) return await r.handler(req, res, { params: m.groups || {}, url });
      }
      throw new HttpError(404, 'Not found.');
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Method not allowed.');
    if (p.startsWith('/vendor/three/')) {
      if (serveFile(res, THREE_DIR, p.slice('/vendor/three/'.length), 'public, max-age=86400')) return;
      throw new HttpError(404, 'Not found. Did you run npm install?');
    }
    const rel = p === '/' ? 'index.html' : p.slice(1);
    const cache = rel.startsWith('assets/') ? 'public, max-age=86400' : 'no-cache';
    if (serveFile(res, PUBLIC_DIR, rel, cache)) return;
    if (!path.extname(rel) && serveFile(res, PUBLIC_DIR, 'index.html', 'no-cache')) return;
    throw new HttpError(404, 'Not found.');
  } catch (e) {
    if (res.headersSent) return res.end();
    const status = e.status || 500;
    if (status === 500) console.error(e);
    send(res, status, { error: status === 500 ? 'Something went wrong on our side. Please try again.' : e.message });
  }
});
server.listen(PORT, () => console.log(`Boselli Wrap Works running at http://localhost:${server.address().port}`));
module.exports = { server };
