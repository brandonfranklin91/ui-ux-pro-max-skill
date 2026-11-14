// Photo preview editor. Runs entirely in the browser (demo processing): the customer marks
// body panels / windows / wheels and the wrap colour is blended over the original shading so
// shadows and reflections survive. The original image is never modified.
import { TINTS, WHEEL_FINISHES, paintBackdrop } from './car3d.js';

export const LAYERS = [{ key: 'body', name: 'Body panels' }, { key: 'glass', name: 'Windows' }, { key: 'wheels', name: 'Wheels' }];
const MAX_SIDE = 1280;
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const FIN = { gloss: [1.5, 1], satin: [1.05, 0.7], matte: [0.7, 0.4] }; // [contrast, highlight strength]

export function createPhotoEditor(host) {
  const canvas = document.createElement('canvas'); canvas.className = 'photo-canvas';
  canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', 'Photo concept preview of your vehicle');
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let W = 0, H = 0, base = null, out = null;
  const masks = {}, soft = {}, stats = {}, undo = [];
  let cfg = {}, tool = { mode: 'off', layer: 'body', size: 28, tolerance: 34 }, showMask = false, compare = false, split = 0.5, dirty = true, raf = 0, onChange = () => {};

  function load(source, maskSources = {}) {
    const sw = source.naturalWidth || source.width, sh = source.naturalHeight || source.height;
    const s = Math.min(1, MAX_SIDE / Math.max(sw, sh));
    W = canvas.width = Math.round(sw * s); H = canvas.height = Math.round(sh * s);
    ctx.drawImage(source, 0, 0, W, H);
    base = ctx.getImageData(0, 0, W, H); out = ctx.createImageData(W, H);
    undo.length = 0;
    for (const { key } of LAYERS) {
      masks[key] = new Uint8Array(W * H);
      const src = maskSources[key];
      if (src) {
        const t = document.createElement('canvas'); t.width = W; t.height = H; const x = t.getContext('2d');
        x.drawImage(src, 0, 0, W, H); const d = x.getImageData(0, 0, W, H).data;
        // accepts white-on-black renders and alpha PNGs (as exported by exportMasks)
        for (let i = 0; i < W * H; i++) masks[key][i] = Math.round((d[i * 4] * d[i * 4 + 3]) / 255);
      }
      refresh(key);
    }
    schedule();
  }
  function refresh(key) { // feathered copy + luminance stats for a layer
    const m = masks[key], s = (soft[key] = new Uint8Array(W * H)), tmp = new Uint16Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0, r = y * W; x < W; x++) tmp[r + x] = m[r + Math.max(0, x - 1)] + m[r + x] + m[r + Math.min(W - 1, x + 1)];
    for (let y = 0; y < H; y++) { const a = Math.max(0, y - 1) * W, b = y * W, c = Math.min(H - 1, y + 1) * W; for (let x = 0; x < W; x++) s[b + x] = (tmp[a + x] + tmp[b + x] + tmp[c + x]) / 9; }
    let sum = 0, n = 0; const d = base.data;
    for (let i = 0; i < W * H; i += 3) if (m[i] > 128) { sum += 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]; n++; }
    stats[key] = { mean: n ? sum / n / 255 : 0.5, count: n * 3 };
  }
  function schedule() { dirty = true; if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (dirty && base) draw(); }); }

  function draw() {
    dirty = false;
    const d = base.data, o = out.data, sb = soft.body, sg = soft.glass, sw = soft.wheels;
    const [cr, cg, cb] = hexRgb(cfg.color || '#888888');
    const [k, hi] = FIN[cfg.finish] || FIN.gloss, mb = stats.body.mean, mw = stats.wheels.mean;
    const wf = WHEEL_FINISHES.find((x) => x.key === cfg.wheelFinish); const [wr, wg, wb] = hexRgb(wf ? wf.hex : '#c8ccd0');
    const tint = (TINTS.find((x) => x.key === cfg.tint) || TINTS[0]).photo;
    const overlayOn = showMask && tool.mode !== 'off', ol = soft[tool.layer];
    const cut = compare ? Math.round(W * split) : 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, p = i * 4; let r = d[p], g = d[p + 1], b = d[p + 2];
      if (x >= cut) {
        const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const a = sb[i] / 255;
        if (a > 0) {
          let v = 0.5 + (l - mb) * k * 1.5; v = v < 0 ? 0 : v > 1 ? 1 : v;
          let nr, ng, nb;
          if (v < 0.5) { const f = 2 * v; nr = cr * f; ng = cg * f; nb = cb * f; }
          else { const f = (2 * v - 1) * hi; nr = cr + (1 - cr) * f; ng = cg + (1 - cg) * f; nb = cb + (1 - cb) * f; }
          r += (nr * 255 - r) * a; g += (ng * 255 - g) * a; b += (nb * 255 - b) * a;
        }
        const aw = sw[i] / 255;
        if (aw > 0 && cfg.wheelFinish && cfg.wheelFinish !== 'stock') {
          let v = 0.5 + (l - mw) * 1.6; v = v < 0 ? 0 : v > 1 ? 1 : v;
          const f = v < 0.5 ? 2 * v : 1, f2 = v < 0.5 ? 0 : 2 * v - 1;
          r += ((wr * f + (1 - wr) * f2) * 255 - r) * aw; g += ((wg * f + (1 - wg) * f2) * 255 - g) * aw; b += ((wb * f + (1 - wb) * f2) * 255 - b) * aw;
        }
        const ag = (sg[i] / 255) * tint;
        if (ag > 0) { r *= 1 - ag; g *= 1 - ag * 0.98; b *= 1 - ag * 0.96; }
        if (overlayOn && ol[i] > 0) { const t = (ol[i] / 255) * 0.45; r += (227 - r) * t; g += (120 - g) * t; b += (150 - b) * t; }
      }
      o[p] = r; o[p + 1] = g; o[p + 2] = b; o[p + 3] = 255;
    }
    ctx.putImageData(out, 0, 0);
  }

  // ----- selection tools -----
  // the canvas is letterboxed with object-fit: contain, so map through the fitted rect
  const fit = () => { const r = canvas.getBoundingClientRect(), s = Math.min(r.width / W, r.height / H); return { s, x: r.left + (r.width - W * s) / 2, y: r.top + (r.height - H * s) / 2 }; };
  const pt = (e) => { const f = fit(); return [Math.floor((e.clientX - f.x) / f.s), Math.floor((e.clientY - f.y) / f.s)]; };
  function pushUndo() { undo.push({ layer: tool.layer, data: masks[tool.layer].slice() }); if (undo.length > 12) undo.shift(); }
  function wand(x0, y0) {
    if (x0 < 0 || y0 < 0 || x0 >= W || y0 >= H) return;
    const d = base.data, m = masks[tool.layer], seen = new Uint8Array(W * H), stack = [y0 * W + x0];
    const s = (y0 * W + x0) * 4, sr = d[s], sg = d[s + 1], sb = d[s + 2], tol = tool.tolerance * tool.tolerance * 3;
    while (stack.length) {
      const i = stack.pop(); if (seen[i]) continue; seen[i] = 1;
      const p = i * 4, dr = d[p] - sr, dg = d[p + 1] - sg, db = d[p + 2] - sb;
      if (dr * dr + dg * dg + db * db > tol) continue;
      m[i] = 255; const x = i % W;
      if (x > 0) stack.push(i - 1); if (x < W - 1) stack.push(i + 1); if (i >= W) stack.push(i - W); if (i < W * (H - 1)) stack.push(i + W);
    }
  }
  function dab(x0, y0, val) {
    const m = masks[tool.layer], r = Math.max(2, Math.round(tool.size / fit().s / 2));
    for (let y = Math.max(0, y0 - r); y <= Math.min(H - 1, y0 + r); y++) for (let x = Math.max(0, x0 - r); x <= Math.min(W - 1, x0 + r); x++)
      if ((x - x0) ** 2 + (y - y0) ** 2 <= r * r) m[y * W + x] = val;
  }
  let drawing = false, lastPt = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (tool.mode === 'off' || !base) return;
    e.preventDefault(); canvas.setPointerCapture(e.pointerId); pushUndo();
    const [x, y] = pt(e);
    if (tool.mode === 'wand') { wand(x, y); refresh(tool.layer); schedule(); onChange(); return; }
    drawing = true; lastPt = [x, y]; dab(x, y, tool.mode === 'add' ? 255 : 0); refresh(tool.layer); schedule();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return; const [x, y] = pt(e), [lx, ly] = lastPt, n = Math.max(1, Math.ceil(Math.hypot(x - lx, y - ly) / 3));
    for (let s = 1; s <= n; s++) dab(Math.round(lx + ((x - lx) * s) / n), Math.round(ly + ((y - ly) * s) / n), tool.mode === 'add' ? 255 : 0);
    lastPt = [x, y]; refresh(tool.layer); schedule();
  });
  const end = () => { if (drawing) { drawing = false; onChange(); } };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);

  function maskCanvas(key) {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), im = x.createImageData(W, H), m = masks[key];
    for (let i = 0; i < W * H; i++) { im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = 255; im.data[i * 4 + 3] = m[i]; }
    x.putImageData(im, 0, 0); return c;
  }
  return {
    canvas, load,
    get ready() { return Boolean(base); },
    setConfig(c) { cfg = { ...cfg, ...c }; schedule(); },
    setTool(t) { tool = { ...tool, ...t }; canvas.style.cursor = tool.mode === 'off' ? 'default' : 'crosshair'; canvas.style.touchAction = tool.mode === 'off' ? 'auto' : 'none'; schedule(); },
    get tool() { return tool; },
    setShowMask(on) { showMask = on; schedule(); },
    setCompare(on, s) { compare = on; if (s !== undefined) split = s; schedule(); },
    onChange(fn) { onChange = fn; },
    coverage(key) { return W ? stats[key].count / (W * H) : 0; },
    clearLayer(key) { pushUndo(); masks[key].fill(0); refresh(key); schedule(); onChange(); },
    undoSelection() { const u = undo.pop(); if (!u) return false; masks[u.layer].set(u.data); refresh(u.layer); schedule(); onChange(); return true; },
    exportMasks() { const o = {}; for (const { key } of LAYERS) if (stats[key].count) o[key] = maskCanvas(key).toDataURL('image/png'); return o; },
    snapshot(tw = 960, th = 600) {
      const was = [compare, showMask]; compare = false; showMask = false; draw();
      const c = document.createElement('canvas'); c.width = tw; c.height = th; const x = c.getContext('2d'); paintBackdrop(x, tw, th);
      const s = Math.min(tw / W, th / H); x.drawImage(canvas, (tw - W * s) / 2, (th - H * s) / 2, W * s, H * s);
      [compare, showMask] = was; draw(); return c;
    },
    dispose() { cancelAnimationFrame(raf); canvas.remove(); },
  };
}
export const loadImage = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('That image could not be opened.')); i.src = src; });
