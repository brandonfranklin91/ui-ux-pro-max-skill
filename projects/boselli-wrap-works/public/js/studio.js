// Studio: scroll-driven landing + the customization editor (3D demo coupe and photo previews).
import { $, $$, esc, api, store, local, toast, modal, icon, ensureAuth, describe, cap, busy, field, formData, refreshMe } from './core.js';
import { createCarView, STOCK, SIGNATURE, WHEELS, WHEEL_FINISHES, TINTS } from './car3d.js';
import { createPhotoEditor, loadImage, LAYERS } from './photo.js';
import { openQuoteWizard } from './quote.js';

const DISCLAIMER = 'Concept preview. Actual materials, wheel fitment and tint options are confirmed by your installer.';
const DESIGNS = [
  { key: 'full', name: 'Full-body color', note: 'One color, every panel' }, { key: 'roof', name: 'Contrasting roof', note: 'Roof and pillars in the accent' },
  { key: 'hood', name: 'Hood accent', note: 'Accent panel on the hood' }, { key: 'stripes', name: 'Racing stripes', note: 'Twin stripes nose to tail' },
];
const FRAMES = 150;
const stageHost = document.createElement('div'); stageHost.className = 'stage3d';
let view = null, viewFailed = false;
function getView() {
  if (view || viewFailed) return view;
  try { view = createCarView(stageHost); } catch (e) { console.error(e); viewFailed = true; }
  return view;
}
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches || local.get('bww.reduceMotion', false);

// ---------- draft (the build being edited; persisted so guests keep their work) ----------
export const draft = { cur: local.get('bww.draft') };
function persist() {
  if (!draft.cur) return local.del('bww.draft');
  if (!local.set('bww.draft', draft.cur)) local.set('bww.draft', { ...draft.cur, masks: null });
}
function newDraft(mode, extra = {}) {
  const pref = store.user?.prefs?.defaultFinish;
  const config = mode === '3d'
    ? { ...STOCK, finish: pref || STOCK.finish, wheelName: 'Apex 5', wheelFinishName: 'Silver', accentName: 'Boselli Gold' }
    : { ...STOCK, color: '#5a1220', colorName: 'Burgundy Reserve', finish: pref || 'gloss', design: 'panels', wheelFinish: 'stock', wheelFinishName: 'Stock' };
  draft.cur = { id: null, name: mode === '3d' ? 'My coupe build' : 'My car build', mode, vehicle: { year: '', make: '', model: '' }, config, masks: null, dirty: true, ...extra };
  persist(); return draft.cur;
}
export function openBuild(b) {
  draft.cur = { id: b.id, name: b.name, mode: b.mode, vehicle: b.vehicle, config: b.config, masks: b.masks || null, uploadId: b.uploadId, photoSrc: b.config.photoSrc || (b.uploadId ? 'upload' : 'sample'), dirty: false };
  persist(); location.hash = '#/studio/edit';
}

// ---------- landing ----------
export function renderLanding(root) {
  const d = draft.cur;
  root.innerHTML = `
  <section class="hero" id="hero"><div class="hero-sticky">
    <div class="hero-stage" id="heroStage"></div>
    <div class="hero-copy">
      <img class="hero-logo" src="/assets/logo.webp" alt="Boselli Wrap Works" width="900" height="612">
      <p class="eyebrow">Wrap visualizer</p>
      <h1>Your ride.<br><em>Your signature.</em></h1>
      <p class="lede">Preview wraps, finishes, wheels and tint on a live 3D coupe or a photo of your own car. Save the build, then send it to our installers for a quote.</p>
      <div class="cta-row">
        <button class="btn gold lg" data-act="start">${icon('car')}Customize your car</button>
        ${d ? `<a class="btn ghost lg" href="#/studio/edit">Continue “${esc(d.name)}”</a>` : `<button class="btn ghost lg" data-act="demo">Try the demo coupe</button>`}
      </div>
      <p class="fine">No account needed to try the demo.</p>
    </div>
    <div class="scroll-hint" aria-hidden="true"><span></span>Scroll</div>
  </div></section>

  <section class="story ${reduceMotion() ? 'static' : ''}" id="story" aria-label="How a Boselli wrap comes together">
    <div class="story-sticky">
      <canvas id="storyCanvas" width="1280" height="720" role="img" aria-label="Film of the Boselli team wrapping a coupe in matte black with gold stripes"></canvas>
      <div class="story-shade"></div>
      <div class="chapters">
        <article class="chapter" data-from="0" data-to="0.24"><p class="eyebrow">01 · Prep</p><h2>It starts with a clean panel.</h2><p>Every install begins with decontaminated paint and a plan for each seam, edge and body line.</p></article>
        <article class="chapter" data-from="0.24" data-to="0.47"><p class="eyebrow">02 · Lay</p><h2>Laid by hand, panel by panel.</h2><p>Trained installers stretch, set and trim premium cast film so it reads like paint.</p></article>
        <article class="chapter" data-from="0.47" data-to="0.74"><p class="eyebrow">03 · Reveal</p><h2>Matte black. Gold stripes. Yours.</h2><p>Finish, stripes, wheels and tint come together exactly as you built them in the studio.</p></article>
        <article class="chapter" data-from="0.74" data-to="1.01"><p class="eyebrow">04 · Roll out</p><h2>Your ride. Your signature.</h2><p>Design it here first, then let us make it real.</p><button class="btn gold" data-act="start">Customize your car</button></article>
      </div>
      <div class="story-progress" aria-hidden="true"><i></i></div>
    </div>
  </section>

  <section class="how wrapx">
    <p class="eyebrow">How it works</p><h2>From idea to install in three steps</h2>
    <div class="steps">
      <article class="card step"><b>1</b><h3>Build it</h3><p>Pick a wrap color and finish, add a roof, hood or stripe accent, then choose wheels and tint.</p></article>
      <article class="card step"><b>2</b><h3>Compare and save</h3><p>Slide between before and after, keep your favorites in My Garage and share a link if you want a second opinion.</p></article>
      <article class="card step"><b>3</b><h3>Get your quote</h3><p>Send the saved build to the shop. We review it and reply with pricing and timing in My Quotes.</p></article>
    </div>
    <div class="final-cta card">
      <div><h2>Ready when you are.</h2><p class="muted">Open the studio and start with the demo coupe or your own photo.</p></div>
      <button class="btn gold lg" data-act="start">${icon('car')}Customize your car</button>
    </div>
    <footer class="foot"><img src="/assets/emblem.webp" alt="" width="84" height="50"><p>${esc(DISCLAIMER)}</p><p>© ${new Date().getFullYear()} Boselli Wrap Works. Your ride. Your signature.</p></footer>
  </section>`;

  const v = getView(), hero = $('#hero', root), story = $('#story', root);
  if (v) { v.mount($('#heroStage', root)); v.setInteractive(false); v.setCompare(false); v.setConfig(SIGNATURE); v.resetView(); v.setRunning(true); }
  else $('#heroStage', root).innerHTML = '<p class="stage-fallback">3D preview is not available on this device.</p>';
  root.addEventListener('click', onLandingClick);

  // scroll-scrubbed film
  const canvas = $('#storyCanvas', root), ctx = canvas.getContext('2d'), imgs = new Array(FRAMES);
  let want = 0, started = false;
  const paint = () => {
    let i = want; for (let k = 0; k < FRAMES && !imgs[i]; k++) i = Math.max(0, Math.min(FRAMES - 1, want + (k % 2 ? 1 : -1) * Math.ceil(k / 2)));
    if (imgs[i]) ctx.drawImage(imgs[i], 0, 0, canvas.width, canvas.height);
  };
  const loadFrame = (i) => { if (imgs[i] !== undefined) return; imgs[i] = null; const im = new Image(); im.src = `/assets/frames/f${String(i + 1).padStart(3, '0')}.webp`; im.onload = () => { imgs[i] = im; if (Math.abs(i - want) < 6) paint(); }; };
  const startLoading = () => { if (started) return; started = true; for (const step of [10, 5, 2, 1]) for (let i = 0; i < FRAMES; i += step) loadFrame(i); };
  const chapters = $$('.chapter', root), bar = $('.story-progress i', root), copy = $('.hero-copy', root);
  if (reduceMotion()) { want = 96; loadFrame(96); chapters.forEach((c) => c.classList.add('on')); }
  else loadFrame(0);
  let ticking = false;
  const onScroll = () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false; const y = window.scrollY, vh = window.innerHeight;
      const hp = Math.min(1, Math.max(0, y / Math.max(1, hero.offsetHeight - vh)));
      if (!reduceMotion()) {
        v?.setScroll(hp); copy.style.opacity = String(1 - Math.min(1, hp * 1.6)); copy.style.transform = `translateY(${-hp * 60}px)`;
        if (y > story.offsetTop - vh * 2) startLoading();
        const sp = Math.min(1, Math.max(0, (y - story.offsetTop) / Math.max(1, story.offsetHeight - vh)));
        want = Math.round(sp * (FRAMES - 1)); paint(); bar.style.transform = `scaleX(${sp})`;
        chapters.forEach((c) => c.classList.toggle('on', sp >= +c.dataset.from && sp < +c.dataset.to));
      }
      v?.setRunning(y < hero.offsetHeight);
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  return () => { window.removeEventListener('scroll', onScroll); root.removeEventListener('click', onLandingClick); v?.setScroll(0); };
}
function onLandingClick(e) {
  const b = e.target.closest('[data-act]'); if (!b) return;
  if (b.dataset.act === 'start') startSheet();
  if (b.dataset.act === 'demo') { newDraft('3d'); location.hash = '#/studio/edit'; }
}

// ---------- start sheet: demo vehicle or upload ----------
export function startSheet() {
  const d = draft.cur, allowance = store.cfg.shop.freePreviewAllowance, used = store.user?.previewsUsed ?? 0;
  const m = modal({ title: 'Customize your car', wide: true, html: `
    <div class="start-grid">
      <button class="start-card" data-go="demo">${icon('car', 'big')}<b>Try a demo vehicle</b><span>Original 3D coupe. Rotate, zoom and change real paint, wheels and tint.</span><em class="pill">360° · No account needed</em></button>
      <div class="start-card as-div">
        ${icon('upload', 'big')}<b>Upload my car</b><span>Preview a wrap on your own photo. Your original stays untouched and private.</span>
        <ul class="tips"><li>Front or rear three-quarter view</li><li>Whole car in frame, wheels visible</li><li>Even daylight, no harsh shadows</li><li>JPG, PNG or WebP, up to 12 MB</li></ul>
        <div class="frame-guide" aria-hidden="true"><i></i><i></i><i></i><i></i>${icon('car', 'big')}</div>
        <label class="btn gold block" for="carFile">${icon('upload')}Choose a photo</label>
        <input id="carFile" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp">
        <div class="progress" hidden role="progressbar" aria-label="Upload progress" aria-valuemin="0" aria-valuemax="100"><i></i><span>Uploading… 0%</span></div>
        <p class="form-err" role="alert" hidden></p>
        <p class="fine">${store.user ? `${Math.max(0, allowance - used)} of ${allowance} free photo previews left.` : `Includes ${allowance} free photo previews with a free account.`} Photo previews stay 2D — 360° rotation needs a 3D model.</p>
        <button class="btn ghost block" data-go="sample">Use the prepared sample photo <em class="pill demo">Demo</em></button>
      </div>
    </div>
    ${d ? `<a class="btn ghost block" href="#/studio/edit" data-continue>Continue “${esc(d.name)}”</a>` : ''}` });
  const err = $('.form-err', m.body), prog = $('.progress', m.body);
  const fail = (msg) => { err.textContent = msg; err.hidden = false; prog.hidden = true; };
  m.body.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]')?.dataset.go;
    if (go === 'demo') { newDraft('3d'); m.close(); location.hash = '#/studio/edit'; routeRefresh(); }
    if (go === 'sample') { newDraft('photo', { photoSrc: 'sample', name: 'Sample photo build' }); m.close(); location.hash = '#/studio/edit'; routeRefresh(); }
    if (e.target.closest('[data-continue]')) m.close();
  });
  $('#carFile', m.body).addEventListener('change', async (e) => {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return; err.hidden = true;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return fail('Please choose a JPG, PNG or WebP photo.');
    if (file.size > 12 * 1024 * 1024) return fail('That photo is over 12 MB. Try a smaller export.');
    if (!(await ensureAuth('Create a free account so your photo is stored privately.'))) return;
    prog.hidden = false;
    try {
      const { id } = await upload(file, (p) => { $('i', prog).style.width = p + '%'; $('span', prog).textContent = p < 100 ? `Uploading… ${p}%` : 'Processing…'; prog.setAttribute('aria-valuenow', p); });
      await api('/api/previews/consume', { method: 'POST', body: { shop: store.shopSlug } });
      await refreshMe();
      newDraft('photo', { photoSrc: 'upload', uploadId: id }); m.close(); location.hash = '#/studio/edit'; routeRefresh();
    } catch (ex) { fail(ex.message); }
  });
}
function routeRefresh() { window.dispatchEvent(new Event('bww:route')); }
function upload(file, onProgress) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest(); x.open('POST', '/api/uploads');
    x.setRequestHeader('X-BWW-Upload', '1'); x.setRequestHeader('X-Filename', encodeURIComponent(file.name)); x.setRequestHeader('Content-Type', file.type);
    x.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    x.onload = () => { let d = {}; try { d = JSON.parse(x.responseText); } catch {} x.status < 300 ? resolve(d) : reject(new Error(d.error || 'Upload failed. Please try again.')); };
    x.onerror = () => reject(new Error('Upload failed. Check your connection and try again.'));
    x.send(file);
  });
}

// ---------- editor ----------
export function renderEditor(root) {
  const d = draft.cur;
  if (!d) { location.hash = '#/studio'; return () => {}; }
  const is3d = d.mode === '3d';
  const tabs = is3d ? ['color', 'finish', 'design', 'wheels', 'tint'] : ['select', 'color', 'finish', 'design', 'wheels', 'tint'];
  const ui = { tab: local.get('bww.tab.' + d.mode, tabs[0]), compare: false, split: 0.5, search: '', favOnly: false, open: true };
  if (!tabs.includes(ui.tab)) ui.tab = tabs[0];
  const hist = { stack: [JSON.stringify(d.config)], idx: 0 };
  let photo = null, target = null;
  const favs = () => local.get('bww.favs', store.user?.prefs?.favorites || []);
  const tabIcon = { select: 'wand', color: 'heart', finish: 'eye', design: 'compare', wheels: 'car', tint: 'lock' };

  root.innerHTML = `<div class="editor" data-mode="${d.mode}">
    <section class="stage" aria-label="Vehicle preview">
      <div class="stage-view" id="stageView"></div>
      <div class="stage-top">
        <a class="icon-btn solid" href="#/studio" aria-label="Back to studio home">${icon('back')}</a>
        <button class="build-name" data-act="rename" aria-label="Rename build"><span id="buildName">${esc(d.name)}</span>${icon('edit')}</button>
        <span class="badge">${icon('info')}Concept preview${is3d ? '' : ' · Demo processing'}</span>
      </div>
      <div class="stage-tools" role="toolbar" aria-label="History and compare">
        <button class="icon-btn solid" data-act="undo" aria-label="Undo">${icon('undo')}</button>
        <button class="icon-btn solid" data-act="redo" aria-label="Redo">${icon('redo')}</button>
        <button class="icon-btn solid" data-act="reset" aria-label="Reset to original">${icon('reset')}</button>
        <button class="icon-btn solid" data-act="compare" aria-pressed="false" aria-label="Before and after compare">${icon('compare')}</button>
      </div>
      <div class="compare-ui" hidden><span class="tag l">Before</span><span class="tag r">After</span><div class="divider"><b>${icon('compare')}</b></div>
        <input type="range" min="2" max="98" value="50" aria-label="Before and after slider"></div>
      <div class="stage-loading" hidden><span class="spin"></span><span>Preparing preview…</span></div>
      <div class="stage-foot"><div class="chips" id="chips" aria-label="Active selections"></div>
        <p class="hint">${is3d ? 'Drag to rotate · pinch or scroll to zoom' : 'Photo preview · original stays untouched'}</p></div>
    </section>
    <aside class="panel" aria-label="Customization controls">
      <button class="drawer-handle" data-act="drawer" aria-expanded="true" aria-label="Collapse or expand controls"><i></i></button>
      <div class="tabs" role="tablist" aria-label="Customization">${tabs.map((t) => `<button role="tab" id="tab-${t}" data-tab="${t}" aria-selected="${t === ui.tab}">${cap(t)}</button>`).join('')}</div>
      <div class="tab-body" id="tabBody" role="tabpanel" tabindex="-1"></div>
      <div class="panel-actions">
        <button class="btn ghost" data-act="save">${icon('save')}Save</button>
        <button class="btn ghost" data-act="download" aria-label="Download preview image">${icon('download')}<span class="lbl">Image</span></button>
        <button class="btn gold grow" data-act="quote">Get a wrap quote</button>
      </div>
      <p class="fine disclaimer">${esc(DISCLAIMER)}</p>
    </aside></div>`;
  const el = $('.editor', root), stageView = $('#stageView', root), tabBody = $('#tabBody', root), loading = $('.stage-loading', root);
  void tabIcon;

  // ----- stage setup -----
  async function initStage() {
    const v = getView();
    if (is3d) {
      if (!v) { stageView.innerHTML = '<p class="stage-fallback">3D preview is not available on this device. Try the photo preview instead.</p>'; return; }
      v.mount(stageView); v.setScroll(0); v.setInteractive(true); v.setRunning(true); v.resetView(); target = v; apply();
      return;
    }
    v?.setRunning(false); loading.hidden = false;
    try {
      photo = createPhotoEditor(stageView);
      const stored = {}; for (const k in d.masks || {}) stored[k] = await loadImage(d.masks[k]);
      if (d.photoSrc === 'sample') {
        if (!v) throw new Error('The sample photo needs WebGL, which is not available on this device.');
        const s = v.renderSample(); photo.load(s.image, d.masks ? stored : { body: s.body, glass: s.glass, wheels: s.wheels });
      } else photo.load(await loadImage('/api/uploads/' + d.uploadId), stored);
      photo.onChange(() => { d.masks = photo.exportMasks(); d.dirty = true; persist(); if (ui.tab === 'select') drawTab(); });
      target = photo; apply(); setTab(ui.tab);
      if (d.photoSrc === 'upload' && !d.masks) toast('Tap your car’s body panels to choose where the wrap goes.');
    } catch (ex) {
      stageView.innerHTML = `<p class="stage-fallback">${esc(ex.status === 401 || ex.message.includes('could not be opened') ? 'We could not open this photo. Sign in to the account that uploaded it, or start a new build.' : ex.message)}</p>`;
    } finally { loading.hidden = true; }
  }

  // ----- state -----
  function apply() {
    target?.setConfig(d.config);
    $('#chips', root).innerHTML = describe(d.config, d.mode).map(([k, v]) => `<span class="chip"><i>${esc(k)}</i>${k === 'Wrap' ? `<b class="dot" style="background:${esc(d.config.color)}"></b>` : ''}${esc(v)}</span>`).join('');
    $('[data-act=undo]', root).disabled = hist.idx <= 0; $('[data-act=redo]', root).disabled = hist.idx >= hist.stack.length - 1;
  }
  function set(patch, commit = true) {
    Object.assign(d.config, patch);
    if (commit) { hist.stack = hist.stack.slice(0, hist.idx + 1); hist.stack.push(JSON.stringify(d.config)); hist.idx++; d.dirty = true; persist(); }
    apply();
  }
  function travel(dir) {
    const i = hist.idx + dir; if (i < 0 || i >= hist.stack.length) return;
    hist.idx = i; d.config = JSON.parse(hist.stack[i]); d.dirty = true; persist(); apply(); drawTab();
  }
  function setTab(t) {
    ui.tab = t; local.set('bww.tab.' + d.mode, t);
    $$('[role=tab]', root).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
    tabBody.setAttribute('aria-labelledby', 'tab-' + t);
    if (photo) { const sel = t === 'select'; photo.setTool({ mode: sel ? (photo.tool.mode === 'off' ? 'wand' : photo.tool.mode) : 'off' }); photo.setShowMask(sel); }
    drawTab();
  }
  function setCompare(on) {
    ui.compare = on; target?.setCompare(on, ui.split);
    $('.compare-ui', root).hidden = !on; $('[data-act=compare]', root).setAttribute('aria-pressed', String(on));
    el.style.setProperty('--split', ui.split * 100 + '%');
  }

  // ----- tab content -----
  const opt = (group, key, sel, inner, extra = '') => `<button class="opt ${sel ? 'on' : ''}" role="radio" aria-checked="${sel}" data-set="${group}" data-val="${esc(key)}" ${extra}>${inner}</button>`;
  function swatches() {
    const c = d.config, f = favs(), qy = ui.search.trim().toLowerCase();
    const list = store.cfg.colors.filter((x) => (!qy || (x.name + ' ' + x.family + ' ' + x.hex).toLowerCase().includes(qy)) && (!ui.favOnly || f.includes(x.hex)));
    if (!list.length) return `<p class="empty-sm">${ui.favOnly && !qy ? 'No favorites yet. Select a color and tap the heart to keep it here.' : 'No colors match that search.'}</p>`;
    return `<div class="swatches" role="radiogroup" aria-label="Wrap color">${list.map((x) => `<button class="swatch ${x.hex === c.color ? 'on' : ''}" role="radio" aria-checked="${x.hex === c.color}" data-color="${x.hex}" data-name="${esc(x.name)}" title="${esc(x.name)}">
      <i style="background:${x.hex}"></i><span>${esc(x.name)}</span>${f.includes(x.hex) ? icon('heart', 'fav') : ''}</button>`).join('')}</div>`;
  }
  const accentRow = () => `<div class="sub"><h4>Accent color</h4><div class="mini-swatches">${store.cfg.colors.slice(0, 10).map((x) => `<button class="mini ${x.hex === d.config.accent ? 'on' : ''}" data-accent="${x.hex}" data-name="${esc(x.name)}" aria-label="Accent ${esc(x.name)}" style="background:${x.hex}"></button>`).join('')}
    <label class="mini custom" aria-label="Custom accent color"><input type="color" data-custom="accent" value="${esc(d.config.accent)}">${icon('plus')}</label></div></div>`;
  function drawTab() {
    const c = d.config, t = ui.tab; let h = '';
    if (t === 'color') {
      const isFav = favs().includes(c.color);
      h = `<div class="search">${icon('search')}<input type="search" id="colorSearch" placeholder="Search colors" aria-label="Search wrap colors" value="${esc(ui.search)}"></div>
        <div class="row gap wrap"><div class="seg sm"><button data-fav="0" aria-pressed="${!ui.favOnly}">All</button><button data-fav="1" aria-pressed="${ui.favOnly}">Favorites</button></div>
          <button class="btn ghost sm" data-act="fav" aria-pressed="${isFav}">${icon('heart', isFav ? 'fav' : '')}${isFav ? 'Favorited' : 'Favorite this color'}</button></div>
        <div id="swatchWrap">${swatches()}</div>
        <div class="sub"><h4>Custom color</h4><div class="row gap"><input type="color" class="color-input" data-custom="color" value="${esc(c.color)}" aria-label="Pick a custom wrap color">
          <input class="hex" id="hexIn" value="${esc(c.color)}" maxlength="7" aria-label="Hex color value" spellcheck="false"></div></div>`;
    } else if (t === 'finish') {
      h = `<div class="opts three" role="radiogroup" aria-label="Finish">${store.cfg.finishes.map((f) => opt('finish', f, c.finish === f, `<i class="fin ${f}" style="--c:${esc(c.color)}"></i><b>${cap(f)}</b><span>${{ gloss: 'Mirror-like shine', satin: 'Soft low sheen', matte: 'Flat, no glare' }[f]}</span>`)).join('')}</div>`;
    } else if (t === 'design') {
      h = is3d ? `<div class="opts two" role="radiogroup" aria-label="Design">${DESIGNS.map((x) => opt('design', x.key, c.design === x.key, `<i class="dz ${x.key}" style="--c:${esc(c.color)};--a:${esc(c.accent)}"></i><b>${x.name}</b><span>${x.note}</span>`)).join('')}</div>${c.design !== 'full' ? accentRow() : ''}`
        : `<p class="notice">${icon('info')}<span>On photos the wrap follows the panels you select. Use the <b>Select</b> tab to choose the whole body, or just the roof, hood or stripes you paint in.</span></p><button class="btn ghost block" data-tab-go="select">Edit selected panels</button>`;
    } else if (t === 'wheels') {
      const fins = is3d ? WHEEL_FINISHES : [{ key: 'stock', name: 'Stock', hex: '#8a8d90' }, ...WHEEL_FINISHES];
      h = (is3d ? `<div class="opts two" role="radiogroup" aria-label="Wheel style">${WHEELS.map((w) => opt('wheel', w.key, c.wheel === w.key, `<i class="wh ${w.key}"></i><b>${w.name}</b><span>${w.note}</span>`, `data-name="${w.name}"`)).join('')}</div>`
        : `<p class="notice">${icon('info')}<span>Wheel <b>style</b> swaps on photos need the AI image service (not connected in this demo). You can preview wheel <b>finish</b> on the marked wheel area.</span></p>`)
        + `<div class="sub"><h4>Wheel finish</h4><div class="opts four" role="radiogroup" aria-label="Wheel finish">${fins.map((f) => opt('wheelFinish', f.key, c.wheelFinish === f.key, `<i class="dotl" style="background:${f.hex}"></i><b>${f.name}</b>`, `data-name="${f.name}"`)).join('')}</div></div>`;
    } else if (t === 'tint') {
      h = `<div class="opts four" role="radiogroup" aria-label="Window tint">${TINTS.map((x) => opt('tint', x.key, c.tint === x.key, `<i class="tn" style="--o:${x.opacity}"></i><b>${x.name}</b>`)).join('')}</div>
        ${!is3d && photo && photo.coverage('glass') === 0 ? `<p class="notice">${icon('info')}<span>Mark the windows in the <b>Select</b> tab to preview tint on your photo.</span></p>` : ''}`;
    } else if (t === 'select' && photo) {
      const tl = photo.tool;
      h = `<p class="notice">${icon('info')}<span>${d.photoSrc === 'sample' ? '<b>Demo:</b> prepared sample photo with ready-made masks.' : '<b>Demo processing on this device.</b> AI panel detection is not connected, so tap panels to select them and refine with the brush.'}</span></p>
        <h4>Area</h4><div class="seg sm three">${LAYERS.map((l) => `<button data-layer="${l.key}" aria-pressed="${tl.layer === l.key}">${l.name}<small>${Math.round(photo.coverage(l.key) * 100)}%</small></button>`).join('')}</div>
        <h4>Tool</h4><div class="seg sm three"><button data-tool="wand" aria-pressed="${tl.mode === 'wand'}">${icon('wand')}Tap select</button><button data-tool="add" aria-pressed="${tl.mode === 'add'}">${icon('brush')}Brush</button><button data-tool="erase" aria-pressed="${tl.mode === 'erase'}">${icon('eraser')}Erase</button></div>
        <label class="slider"><span>${tl.mode === 'wand' ? 'Color tolerance' : 'Brush size'}</span><input type="range" data-range="${tl.mode === 'wand' ? 'tolerance' : 'size'}" min="${tl.mode === 'wand' ? 8 : 8}" max="${tl.mode === 'wand' ? 90 : 90}" value="${tl.mode === 'wand' ? tl.tolerance : tl.size}"></label>
        <div class="row gap wrap"><button class="btn ghost sm" data-act="sel-undo">${icon('undo')}Undo selection</button><button class="btn ghost sm" data-act="sel-clear">${icon('trash')}Clear area</button></div>
        <p class="fine">Windows, tires, lights and plates stay as they are unless you select them. Shadows and reflections are kept from your photo.</p>`;
    }
    tabBody.innerHTML = h;
  }

  // ----- events -----
  function onClick(e) {
    const b = e.target.closest('button,a,[data-color]'); if (!b || !el.contains(b)) return;
    const ds = b.dataset;
    if (ds.tab) return setTab(ds.tab);
    if (ds.tabGo) return setTab(ds.tabGo);
    if (ds.color) { set({ color: ds.color, colorName: ds.name }); return drawTab(); }
    if (ds.accent) { set({ accent: ds.accent, accentName: ds.name }); return drawTab(); }
    if (ds.set) {
      const patch = { [ds.set]: ds.val }; if (ds.name) patch[ds.set + 'Name'] = ds.name;
      set(patch); return drawTab();
    }
    if (ds.fav !== undefined) { ui.favOnly = ds.fav === '1'; return drawTab(); }
    if (ds.layer) { photo.setTool({ layer: ds.layer }); return drawTab(); }
    if (ds.tool) { photo.setTool({ mode: ds.tool }); return drawTab(); }
    switch (ds.act) {
      case 'undo': return travel(-1);
      case 'redo': return travel(1);
      case 'reset': {
        const base = is3d ? { ...STOCK, wheelName: 'Apex 5', wheelFinishName: 'Silver', accentName: 'Boselli Gold' } : { ...d.config, color: '#b9bcc0', colorName: 'Liquid Silver', finish: 'gloss', tint: 'none', wheelFinish: 'stock', wheelFinishName: 'Stock' };
        set(base); drawTab(); if (is3d) view.resetView(); return toast('Reset to the original look. Undo brings your design back.');
      }
      case 'compare': return setCompare(!ui.compare);
      case 'drawer': ui.open = !ui.open; el.classList.toggle('collapsed', !ui.open); b.setAttribute('aria-expanded', String(ui.open)); return;
      case 'fav': {
        let f = favs(); f = f.includes(d.config.color) ? f.filter((x) => x !== d.config.color) : [...f, d.config.color];
        local.set('bww.favs', f); if (store.user) api('/api/me', { method: 'PATCH', body: { prefs: { favorites: f } } }).catch(() => {});
        return drawTab();
      }
      case 'sel-undo': if (!photo.undoSelection()) toast('Nothing to undo in the selection.'); return;
      case 'sel-clear': photo.clearLayer(photo.tool.layer); return;
      case 'rename': return saveDialog(true);
      case 'save': return saveDialog(false);
      case 'download': return download();
      case 'quote': return quote();
    }
  }
  function onInput(e) {
    const t = e.target;
    if (t.id === 'colorSearch') { ui.search = t.value; $('#swatchWrap', root).innerHTML = swatches(); }
    else if (t.dataset.custom) { const k = t.dataset.custom; set({ [k]: t.value, [k + 'Name']: 'Custom ' + t.value }, false); if (k === 'color') { const hx = $('#hexIn', root); if (hx) hx.value = t.value; } }
    else if (t.dataset.range) photo.setTool({ [t.dataset.range]: +t.value });
    else if (t.closest('.compare-ui')) { ui.split = t.value / 100; target?.setCompare(true, ui.split); el.style.setProperty('--split', t.value + '%'); }
  }
  function onChange(e) {
    const t = e.target;
    if (t.dataset.custom) { const k = t.dataset.custom; set({ [k]: t.value, [k + 'Name']: 'Custom ' + t.value }); drawTab(); }
    if (t.id === 'hexIn') { const v = t.value.trim().toLowerCase(); if (/^#[0-9a-f]{6}$/.test(v)) { set({ color: v, colorName: 'Custom ' + v }); drawTab(); } else { toast('Enter a hex color like #c9a227.', 'err'); t.value = d.config.color; } }
  }
  function onKey(e) {
    if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z' || /INPUT|TEXTAREA/.test(document.activeElement.tagName) || $('.modal-wrap')) return;
    e.preventDefault(); travel(e.shiftKey ? 1 : -1);
  }
  el.addEventListener('click', onClick); el.addEventListener('input', onInput); el.addEventListener('change', onChange); document.addEventListener('keydown', onKey);

  // ----- save / download / quote -----
  const snapshot = (w, h) => target?.snapshot(w, h);
  function saveDialog(renameOnly) {
    return new Promise(async (resolve) => {
      if (!renameOnly && !(await ensureAuth('Create a free account to save builds to My Garage.'))) return resolve(null);
      const v = d.vehicle || {};
      const m = modal({ title: renameOnly ? 'Name this build' : d.id ? 'Update saved build' : 'Save to My Garage', onClose: (r) => resolve(r || null), html: `<form class="stack" novalidate>
        ${field('Build name', 'name', d.name, 'required maxlength="60" autofocus')}
        ${renameOnly ? '' : `<div class="grid3">${field('Year', 'year', v.year, 'inputmode="numeric" maxlength="4" placeholder="2021"')}${field('Make', 'make', v.make, 'maxlength="40" placeholder="Dodge"')}${field('Model', 'model', v.model, 'maxlength="40" placeholder="Challenger"')}</div>
        <p class="fine">Vehicle details are optional here. We ask again when you request a quote.</p>`}
        <p class="form-err" role="alert" hidden></p>
        <button class="btn gold block" type="submit">${renameOnly ? 'Done' : d.id ? 'Save changes' : 'Save build'}</button></form>` });
      const form = $('form', m.body);
      form.onsubmit = async (e) => {
        e.preventDefault(); const f = formData(form), err = $('.form-err', form);
        if (!f.name.trim()) { err.textContent = 'Give your build a name.'; err.hidden = false; return; }
        d.name = f.name.trim(); $('#buildName', root).textContent = d.name;
        if (renameOnly) { d.dirty = true; persist(); return m.close(true); }
        d.vehicle = { year: f.year.trim(), make: f.make.trim(), model: f.model.trim() };
        const btn = $('button[type=submit]', form); busy(btn, true, 'Saving…');
        try {
          const body = { name: d.name, mode: d.mode, vehicle: d.vehicle, config: { ...d.config, photoSrc: d.photoSrc }, masks: photo ? photo.exportMasks() : null,
            uploadId: d.uploadId || null, thumb: snapshot(640, 400)?.toDataURL('image/jpeg', 0.82) };
          const res = await api(d.id ? '/api/builds/' + d.id : '/api/builds', { method: d.id ? 'PUT' : 'POST', body });
          d.id = res.build.id; d.dirty = false; persist(); toast('Saved to My Garage.'); m.close(res.build);
        } catch (ex) { err.textContent = ex.message; err.hidden = false; busy(btn, false); }
      };
    });
  }
  function download() {
    const c = snapshot(1600, 1000); if (!c) return toast('Preview is not ready yet.', 'err');
    const x = c.getContext('2d'); x.fillStyle = 'rgba(0,0,0,.72)'; x.fillRect(0, 930, 1600, 70);
    x.fillStyle = '#f1e6d0'; x.font = '600 26px Manrope, system-ui, sans-serif'; x.fillText(`${d.name} — Concept preview`, 36, 974);
    x.fillStyle = '#d4af37'; x.textAlign = 'right'; x.fillText('Boselli Wrap Works', 1564, 974);
    c.toBlob((blob) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = d.name.replace(/[^\w-]+/g, '-').toLowerCase() + '-concept.jpg'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast('Preview image downloaded.'); }, 'image/jpeg', 0.9);
  }
  async function quote() {
    let build = null;
    if (!d.id || d.dirty) { build = await saveDialog(false); if (!build) return; }
    else { try { build = (await api('/api/builds/' + d.id)).build; } catch { d.id = null; return quote(); } }
    openQuoteWizard(build);
  }

  drawTab(); apply(); initStage();
  document.body.classList.add('in-editor');
  return () => {
    document.body.classList.remove('in-editor'); document.removeEventListener('keydown', onKey);
    view?.setCompare(false); view?.setInteractive(false); photo?.dispose();
  };
}
