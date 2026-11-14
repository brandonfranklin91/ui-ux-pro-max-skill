// My Garage, My Quotes, Account, Shop dashboard and public share view.
import { $, $$, esc, api, store, local, toast, modal, confirmDialog, icon, authModal, describe, money, dateStr, busy, field, formData, refreshMe, setUser } from './core.js';
import { openBuild, startSheet } from './studio.js';
import { openQuoteWizard } from './quote.js';

const page = (title, sub, inner) => `<div class="page wrapx"><header class="page-head"><h1>${esc(title)}</h1>${sub ? `<p class="muted">${sub}</p>` : ''}</header>${inner}</div>`;
const loadingHtml = '<div class="skeletons" aria-busy="true" aria-label="Loading"><i></i><i></i><i></i></div>';
const errorHtml = (msg) => `<div class="empty card"><h3>We hit a snag</h3><p class="muted">${esc(msg)}</p><button class="btn ghost" data-retry>Try again</button></div>`;
function gate(root, title, text) {
  root.innerHTML = page(title, '', `<div class="empty card">${icon('lock', 'big')}<h3>Sign in to see ${esc(text)}</h3><p class="muted">Your builds, uploads and quotes are private to your account.</p><button class="btn gold" data-signin>Sign in or create account</button></div>`);
  $('[data-signin]', root).onclick = () => authModal();
  return () => {};
}
const vehicleLine = (v) => [v?.year, v?.make, v?.model].filter(Boolean).join(' ');
const chips = (cfg, mode) => describe(cfg, mode).slice(0, 4).map(([k, v]) => `<span class="chip sm"><i>${esc(k)}</i>${esc(v)}</span>`).join('');
const statusBadge = (s) => `<span class="status s-${s.toLowerCase().replace(/\s+/g, '-')}">${esc(s)}</span>`;
const FLOW = ['Submitted', 'Under review', 'Quote ready', 'Accepted'];
const stepper = (s) => `<ol class="stepper" aria-label="Quote progress">${FLOW.map((x, i) => `<li class="${FLOW.indexOf(s) >= i ? 'done' : ''} ${s === x ? 'cur' : ''}">${esc(x)}</li>`).join('')}</ol>`;
const thread = (q) => (q.messages.length ? `<ul class="thread">${q.messages.map((m) => `<li class="${m.author}"><b>${esc(m.author === 'shop' ? 'Shop · ' + m.authorName : m.authorName)}</b><p>${esc(m.body)}</p><time>${dateStr(m.created)}</time></li>`).join('')}</ul>` : '');

// ---------- My Garage ----------
export function renderGarage(root) {
  if (!store.user) return gate(root, 'My Garage', 'your saved builds');
  let builds = [], picked = [];
  const draw = () => {
    root.innerHTML = page('My Garage', 'Saved builds reopen in the studio with every selection restored.', builds.length ? `
      <div class="garage-grid">${builds.map((b) => `<article class="card build" data-id="${b.id}">
        <button class="thumb" data-act="open" aria-label="Open ${esc(b.name)} in the studio">${b.thumb ? `<img src="${esc(b.thumb)}" alt="" loading="lazy">` : icon('car', 'big')}<span class="pill">${b.mode === '3d' ? '3D demo' : 'Photo'}</span></button>
        <div class="build-body"><h3>${esc(b.name)}</h3><p class="muted">${esc(vehicleLine(b.vehicle) || 'Vehicle not set')} · Updated ${dateStr(b.updated)}</p>
          <div class="chips">${chips(b.config, b.mode)}</div>
          <div class="row gap wrap"><button class="btn gold sm" data-act="quote">Get a wrap quote</button><button class="btn ghost sm" data-act="open">${icon('edit')}Edit</button>
            <button class="btn ghost sm" data-act="share" aria-pressed="${b.shared}">${icon('share')}${b.shared ? 'Shared' : 'Share'}</button>
            <button class="btn ghost sm" data-act="dl" aria-label="Download preview image of ${esc(b.name)}">${icon('download')}</button>
            <button class="btn ghost sm" data-act="del" aria-label="Delete ${esc(b.name)}">${icon('trash')}</button></div>
          <label class="check cmp"><input type="checkbox" data-cmp ${picked.includes(b.id) ? 'checked' : ''}><span>Compare</span></label></div></article>`).join('')}</div>
      <div class="compare-bar ${picked.length ? 'on' : ''}" role="status"><span>${picked.length === 2 ? 'Two builds selected' : 'Pick one more build to compare'}</span><button class="btn gold sm" data-act="compare" ${picked.length === 2 ? '' : 'disabled'}>Compare designs</button><button class="btn ghost sm" data-act="clear">Clear</button></div>`
      : `<div class="empty card">${icon('garage', 'big')}<h3>Your garage is empty</h3><p class="muted">Design a wrap in the studio and save it here to compare, share or request a quote.</p><button class="btn gold" data-act="start">${icon('car')}Customize your car</button></div>`);
  };
  const load = async () => {
    root.innerHTML = page('My Garage', '', loadingHtml);
    try { builds = (await api('/api/builds')).builds; picked = picked.filter((id) => builds.some((b) => b.id === id)); draw(); }
    catch (e) { root.innerHTML = page('My Garage', '', errorHtml(e.message)); }
  };
  const onClick = async (e) => {
    if (e.target.closest('[data-retry]')) return load();
    const btn = e.target.closest('[data-act]'); if (!btn) return;
    const act = btn.dataset.act, id = Number(btn.closest('[data-id]')?.dataset.id), b = builds.find((x) => x.id === id);
    if (act === 'start') return startSheet();
    if (act === 'clear') { picked = []; return draw(); }
    if (act === 'compare') return compareModal(builds.find((x) => x.id === picked[0]), builds.find((x) => x.id === picked[1]));
    if (!b) return;
    try {
      if (act === 'open') { busy(btn, true, 'Opening…'); openBuild((await api('/api/builds/' + id)).build); }
      if (act === 'quote') openQuoteWizard(b);
      if (act === 'dl') { if (!b.thumb) return toast('No preview image saved for this build.', 'err'); const a = document.createElement('a'); a.href = b.thumb; a.download = b.name.replace(/[^\w-]+/g, '-').toLowerCase() + '-concept.jpg'; a.click(); }
      if (act === 'del' && (await confirmDialog('Delete this build?', `“${b.name}” will be removed from your garage. Quotes you already sent keep their copy of the design.`, 'Delete build'))) {
        await api('/api/builds/' + id, { method: 'DELETE' }); if (local.get('bww.draft')?.id === id) local.del('bww.draft'); toast('Build deleted.'); load();
      }
      if (act === 'share') shareModal(b, load);
    } catch (ex) { toast(ex.message, 'err'); busy(btn, false); }
  };
  const onChange = (e) => {
    if (!e.target.matches('[data-cmp]')) return; const id = Number(e.target.closest('[data-id]').dataset.id);
    if (e.target.checked) { picked.push(id); if (picked.length > 2) picked.shift(); } else picked = picked.filter((x) => x !== id);
    draw();
  };
  root.addEventListener('click', onClick); root.addEventListener('change', onChange); load();
  return () => { root.removeEventListener('click', onClick); root.removeEventListener('change', onChange); };
}
function shareModal(b, reload) {
  const m = modal({ title: 'Share this build', html: '' });
  const draw = (token) => {
    const url = token ? `${location.origin}/#/share/${token}` : '';
    m.setBody(token ? `<p class="muted">Anyone with this link can see the preview image and selections for “${esc(b.name)}”. Your original photo and contact details are never shared.</p>
      <div class="row gap"><input class="grow" readonly value="${esc(url)}" aria-label="Share link" id="shareUrl"><button class="btn gold" data-copy>${icon('copy')}Copy</button></div>
      <button class="btn ghost block" data-off>Stop sharing</button>`
      : `<p class="muted">This build is private. Create a link only if you want to show it to someone.</p><button class="btn gold block" data-on autofocus>${icon('share')}Create share link</button>`);
    const set = async (enabled) => { try { const r = await api(`/api/builds/${b.id}/share`, { method: 'POST', body: { enabled } }); b.shared = Boolean(r.shareToken); b.shareToken = r.shareToken; draw(r.shareToken); reload(); } catch (ex) { toast(ex.message, 'err'); } };
    $('[data-on]', m.body)?.addEventListener('click', () => set(true)); $('[data-off]', m.body)?.addEventListener('click', () => set(false));
    $('[data-copy]', m.body)?.addEventListener('click', async () => { try { await navigator.clipboard.writeText(url); toast('Link copied.'); } catch { $('#shareUrl', m.body).select(); toast('Press Ctrl/Cmd+C to copy the link.'); } });
  };
  draw(b.shareToken);
}
function compareModal(a, b) {
  const ra = describe(a.config, a.mode), rb = describe(b.config, b.mode), keys = [...new Set([...ra, ...rb].map((r) => r[0]))];
  const val = (rows, k) => rows.find((r) => r[0] === k)?.[1] ?? '—';
  const col = (x) => `<div class="cmp-col"><div class="thumb">${x.thumb ? `<img src="${esc(x.thumb)}" alt="Preview of ${esc(x.name)}">` : icon('car', 'big')}</div><h3>${esc(x.name)}</h3><p class="muted">${esc(vehicleLine(x.vehicle) || (x.mode === '3d' ? 'Demo coupe' : 'Photo preview'))}</p></div>`;
  modal({ title: 'Compare designs', wide: true, html: `<div class="cmp-grid">${col(a)}${col(b)}</div>
    <table class="cmp-table"><caption class="sr-only">Selections side by side</caption><thead><tr><th scope="col">Option</th><th scope="col">${esc(a.name)}</th><th scope="col">${esc(b.name)}</th></tr></thead><tbody>
    ${keys.map((k) => { const x = val(ra, k), y = val(rb, k); return `<tr class="${x !== y ? 'diff' : ''}"><th scope="row">${esc(k)}</th><td>${esc(x)}</td><td>${esc(y)}</td></tr>`; }).join('')}</tbody></table>
    <p class="fine">Highlighted rows differ between the two builds.</p>` });
}

// ---------- My Quotes ----------
export function renderQuotes(root) {
  if (!store.user) return gate(root, 'My Quotes', 'your quote requests');
  let quotes = [];
  const price = (q) => q.priceCents != null ? `<div class="price"><span>Shop quote</span><b>${money(q.priceCents)}</b></div>`
    : q.estimateCents != null ? `<div class="price est"><span>Estimate from shop pricing rules</span><b>${money(q.estimateCents)}</b></div>`
    : '<div class="price none"><span>Price</span><b>Awaiting shop review</b></div>';
  const draw = () => {
    root.innerHTML = page('My Quotes', 'Track each request and the shop’s replies.', quotes.length ? `<div class="quote-list">${quotes.map((q) => `<article class="card quote" data-id="${q.id}">
      <div class="quote-top">${q.snapshot.thumb ? `<img src="${esc(q.snapshot.thumb)}" alt="Preview of ${esc(q.snapshot.name)}" loading="lazy">` : ''}
        <div class="grow"><p class="reqno sm">${esc(q.number)}</p><h3>${esc(q.snapshot.name)}</h3><p class="muted">${esc(vehicleLine(q.vehicle))} · Sent ${dateStr(q.created)}</p>${statusBadge(q.status)}</div>${price(q)}</div>
      ${q.status === 'Declined' ? '' : stepper(q.status)}
      <ul class="kv"><li><span>Services</span>${(q.snapshot.serviceNames || q.services).map(esc).join(', ')}</li><li><span>Location</span>${esc(q.location)}</li><li><span>Timing</span>${esc(q.timing)}</li>${q.turnaround ? `<li><span>Turnaround</span>${esc(q.turnaround)}</li>` : ''}</ul>
      ${thread(q)}
      <form class="reply row gap"><input name="message" class="grow" maxlength="1000" placeholder="Message the shop" aria-label="Message the shop about ${esc(q.number)}"><button class="btn ghost sm" type="submit">Send</button></form>
      ${q.status === 'Quote ready' ? `<div class="row gap"><button class="btn gold grow" data-act="accept">Accept quote · ${money(q.priceCents)}</button><button class="btn ghost" data-act="decline">Decline</button></div><p class="fine">Accepting tells the shop to schedule your install. No payment is taken here.</p>` : ''}
    </article>`).join('')}</div>`
      : `<div class="empty card">${icon('quote', 'big')}<h3>No quote requests yet</h3><p class="muted">Save a build, then tap “Get a wrap quote” to send it to the shop.</p><a class="btn gold" href="#/garage">Go to My Garage</a></div>`);
  };
  const load = async () => {
    root.innerHTML = page('My Quotes', '', loadingHtml);
    try { quotes = (await api('/api/quotes')).quotes; draw(); } catch (e) { root.innerHTML = page('My Quotes', '', errorHtml(e.message)); }
  };
  const respond = async (id, body) => { try { await api(`/api/quotes/${id}/respond`, { method: 'POST', body }); toast(body.action === 'accept' ? 'Quote accepted. The shop will be in touch to schedule.' : body.action ? 'Quote declined.' : 'Message sent.'); load(); } catch (ex) { toast(ex.message, 'err'); } };
  const onClick = (e) => { if (e.target.closest('[data-retry]')) return load(); const b = e.target.closest('[data-act]'); if (b) respond(b.closest('[data-id]').dataset.id, { action: b.dataset.act }); };
  const onSubmit = (e) => { e.preventDefault(); const msg = new FormData(e.target).get('message').trim(); if (msg) respond(e.target.closest('[data-id]').dataset.id, { message: msg }); };
  root.addEventListener('click', onClick); root.addEventListener('submit', onSubmit); load();
  return () => { root.removeEventListener('click', onClick); root.removeEventListener('submit', onSubmit); };
}

// ---------- Account ----------
export function renderAccount(root) {
  const u = store.user;
  if (!u) {
    root.innerHTML = page('Account', '', `<div class="empty card">${icon('user', 'big')}<h3>Sign in to Boselli Wrap Works</h3><p class="muted">Save builds, upload your own car and track quote requests. Shop staff sign in here too.</p><button class="btn gold" data-signin>Sign in or create account</button></div>`);
    $('[data-signin]', root).onclick = () => authModal(); return () => {};
  }
  const allowance = store.cfg.shop.freePreviewAllowance, prefs = u.prefs || {};
  root.innerHTML = page('Account', esc(u.email), `<div class="cols">
    <form class="card stack" id="profile"><h2>Profile</h2>${field('Name', 'name', u.name, 'required autocomplete="name"')}${field('Phone', 'phone', u.phone, 'type="tel" autocomplete="tel"', 'Used to prefill quote requests.')}<button class="btn gold" type="submit">Save profile</button></form>
    <form class="card stack" id="prefs"><h2>Preferences</h2>
      <label class="field"><span>Default finish for new builds</span><select name="defaultFinish">${store.cfg.finishes.map((f) => `<option value="${f}" ${prefs.defaultFinish === f ? 'selected' : ''}>${f[0].toUpperCase() + f.slice(1)}</option>`).join('')}</select></label>
      <label class="check"><input type="checkbox" name="reduceMotion" ${local.get('bww.reduceMotion', false) ? 'checked' : ''}><span>Reduce scroll and motion effects</span></label>
      <button class="btn gold" type="submit">Save preferences</button></form>
    <div class="card stack"><h2>Photo previews</h2><div class="meter" role="meter" aria-valuemin="0" aria-valuemax="${allowance}" aria-valuenow="${Math.min(u.previewsUsed, allowance)}" aria-label="Free photo previews used"><i style="width:${allowance ? Math.min(100, (u.previewsUsed / allowance) * 100) : 100}%"></i></div>
      <p class="muted">${Math.min(u.previewsUsed, allowance)} of ${allowance} free photo previews used. The 3D demo coupe is always unlimited.</p></div>
    <form class="card stack" id="pw"><h2>Password</h2>${field('Current password', 'current', '', 'type="password" autocomplete="current-password" required')}${field('New password', 'next', '', 'type="password" autocomplete="new-password" minlength="8" required', 'At least 8 characters.')}<p class="form-err" role="alert" hidden></p><button class="btn ghost" type="submit">Change password</button></form>
    ${u.role === 'staff' ? `<div class="card stack"><h2>Shop staff</h2><p class="muted">You manage ${esc(store.staffShop?.name || 'your shop')}.</p><a class="btn gold" href="#/shop">${icon('store')}Open shop dashboard</a></div>` : ''}
    <div class="card stack"><h2>Session</h2><p class="muted">Signed in as ${esc(u.email)}.</p><button class="btn ghost" data-signout>Sign out</button></div></div>`);
  $('#profile', root).onsubmit = async (e) => { e.preventDefault(); try { await api('/api/me', { method: 'PATCH', body: formData(e.target) }); await refreshMe(); toast('Profile saved.'); } catch (ex) { toast(ex.message, 'err'); } };
  $('#prefs', root).onsubmit = async (e) => { e.preventDefault(); const f = formData(e.target); local.set('bww.reduceMotion', Boolean(f.reduceMotion));
    try { await api('/api/me', { method: 'PATCH', body: { prefs: { defaultFinish: f.defaultFinish } } }); await refreshMe(); toast('Preferences saved.'); } catch (ex) { toast(ex.message, 'err'); } };
  $('#pw', root).onsubmit = async (e) => { e.preventDefault(); const err = $('.form-err', e.target);
    try { await api('/api/me/password', { method: 'POST', body: formData(e.target) }); e.target.reset(); err.hidden = true; toast('Password changed.'); } catch (ex) { err.textContent = ex.message; err.hidden = false; } };
  $('[data-signout]', root).onclick = async () => { await api('/api/auth/logout', { method: 'POST' }); local.del('bww.draft'); local.del('bww.favs'); setUser(null); toast('Signed out.'); };
  return () => {};
}

// ---------- Shop dashboard (staff only) ----------
export function renderShop(root) {
  if (store.user?.role !== 'staff') {
    root.innerHTML = page('Shop dashboard', '', `<div class="empty card">${icon('lock', 'big')}<h3>Shop staff only</h3><p class="muted">Sign in with a staff account to manage quote requests, catalog and pricing.</p>${store.user ? '' : '<button class="btn gold" data-signin>Sign in</button>'}</div>`);
    $('[data-signin]', root)?.addEventListener('click', () => authModal()); return () => {};
  }
  let o = null, quotes = [], tab = 'requests', filter = '', openId = null;
  const head = () => `<div class="seg tabs-seg" role="tablist">${[['requests', 'Requests'], ['catalog', 'Catalog'], ['pricing', 'Pricing'], ['billing', 'Plan']].map(([k, l]) => `<button role="tab" data-tab="${k}" aria-selected="${tab === k}">${l}</button>`).join('')}</div>`;
  const requests = () => {
    const list = filter ? quotes.filter((q) => q.status === filter) : quotes, q = quotes.find((x) => x.id === openId);
    return `<div class="status-filter" role="group" aria-label="Filter by status"><button class="chip-btn" data-filter="" aria-pressed="${!filter}">All <b>${quotes.length}</b></button>${store.cfg.statuses.map((s) => `<button class="chip-btn" data-filter="${s}" aria-pressed="${filter === s}">${s} <b>${o.counts[s] || 0}</b></button>`).join('')}</div>
    <div class="shop-split"><div class="req-list">${list.length ? list.map((x) => `<button class="card req ${x.id === openId ? 'on' : ''}" data-open="${x.id}">${x.snapshot.thumb ? `<img src="${esc(x.snapshot.thumb)}" alt="">` : ''}<span class="grow"><b>${esc(x.number)}</b><span>${esc(x.contact.name)} · ${esc(vehicleLine(x.vehicle))}</span><small>${dateStr(x.created)}</small></span>${statusBadge(x.status)}</button>`).join('') : '<div class="empty card"><h3>No requests here</h3><p class="muted">New customer quote requests appear in this list.</p></div>'}</div>
    <div class="req-detail">${q ? `<article class="card stack" data-id="${q.id}">
      <div class="row gap between wrap"><h2>${esc(q.number)}</h2>${statusBadge(q.status)}</div>
      ${q.snapshot.thumb ? `<img class="design" src="${esc(q.snapshot.thumb)}" alt="Customer design ${esc(q.snapshot.name)}">` : ''}
      <h3>${esc(q.snapshot.name)} <span class="pill">${q.snapshot.mode === '3d' ? '3D demo coupe' : 'Customer photo'}</span></h3>
      ${q.snapshot.uploadId ? `<a class="btn ghost sm" href="/api/uploads/${esc(q.snapshot.uploadId)}" target="_blank" rel="noopener">${icon('eye')}View original photo</a>` : ''}
      <ul class="kv">${describe(q.snapshot.config, q.snapshot.mode).map(([k, v]) => `<li><span>${esc(k)}</span>${esc(v)}</li>`).join('')}
        <li><span>Vehicle</span>${esc(vehicleLine(q.vehicle))} · ${esc(q.vehicle.size || '')}</li><li><span>Services</span>${(q.snapshot.serviceNames || q.services).map(esc).join(', ')}</li>
        <li><span>Location</span>${esc(q.location)}</li><li><span>Timing</span>${esc(q.timing)}</li>
        <li><span>Customer</span><div>${esc(q.contact.name)} · <a href="mailto:${esc(q.contact.email)}">${esc(q.contact.email)}</a>${q.contact.phone ? ' · ' + esc(q.contact.phone) : ''}</div></li>
        ${q.notes ? `<li><span>Notes</span>${esc(q.notes)}</li>` : ''}${q.estimateCents != null ? `<li><span>Rule estimate</span>${money(q.estimateCents)}</li>` : ''}</ul>
      ${thread(q)}
      <form class="stack" id="respond"><div class="grid3">
        <label class="field"><span>Status</span><select name="status">${store.cfg.statuses.map((s) => `<option ${q.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
        <label class="field"><span>Quote price (USD)</span><input name="price" inputmode="decimal" value="${q.priceCents != null ? q.priceCents / 100 : ''}" placeholder="e.g. 3400"></label>
        <label class="field"><span>Turnaround</span><input name="turnaround" value="${esc(q.turnaround || '')}" placeholder="${esc(o.shop.settings.turnaround || '')}" maxlength="120"></label></div>
        <label class="field"><span>Message to customer (optional)</span><textarea name="message" rows="2" maxlength="1000"></textarea></label>
        <p class="form-err" role="alert" hidden></p><button class="btn gold" type="submit">Save response</button></form></article>`
      : '<div class="empty card"><h3>Select a request</h3><p class="muted">Review the customer’s design and vehicle, then reply with a price and timing.</p></div>'}</div></div>`;
  };
  const catalog = () => `<div class="cols">
    <div class="card stack"><h2>Wrap colors</h2><ul class="rows">${o.colors.map((c) => `<li data-color="${c.id}"><i class="dotl" style="background:${esc(c.hex)}"></i><span class="grow">${esc(c.name)} <small>${esc(c.hex)}</small></span>
      <label class="switch"><input type="checkbox" data-toggle-color ${c.active ? 'checked' : ''} aria-label="${esc(c.name)} available"><i></i></label><button class="icon-btn" data-del-color aria-label="Delete ${esc(c.name)}">${icon('trash')}</button></li>`).join('')}</ul>
      <form class="row gap wrap" id="addColor"><input name="name" class="grow" placeholder="New color name" aria-label="New color name" required maxlength="40"><input type="color" name="hex" value="#c9a227" aria-label="New color"><button class="btn ghost sm" type="submit">${icon('plus')}Add</button></form></div>
    <div class="card stack"><h2>Finishes</h2><ul class="rows">${['gloss', 'satin', 'matte'].map((f) => `<li><span class="grow">${f[0].toUpperCase() + f.slice(1)}</span><label class="switch"><input type="checkbox" data-finish="${f}" ${o.shop.settings.finishes[f] !== false ? 'checked' : ''} aria-label="${f} available"><i></i></label></li>`).join('')}</ul>
      <h2>Services</h2><ul class="rows">${o.services.map((s) => `<li data-svc="${s.id}"><span class="grow">${esc(s.name)}</span><label class="money"><span class="sr-only">Base price for ${esc(s.name)}</span>$<input data-svc-price inputmode="decimal" value="${s.base_cents / 100}"></label>
        <label class="switch"><input type="checkbox" data-toggle-svc ${s.active ? 'checked' : ''} aria-label="${esc(s.name)} offered"><i></i></label></li>`).join('')}</ul>
      <form class="row gap wrap" id="addSvc"><input name="name" class="grow" placeholder="New service" aria-label="New service name" required maxlength="60"><input name="price" placeholder="Base $" inputmode="decimal" aria-label="Base price" style="width:96px"><button class="btn ghost sm" type="submit">${icon('plus')}Add</button></form></div></div>`;
  const pricing = () => { const s = o.shop.settings; return `<form class="card stack narrow" id="pricing"><h2>Pricing rules and turnaround</h2>
    <label class="check"><input type="checkbox" name="autoEstimate" ${s.autoEstimate ? 'checked' : ''}><span>Show customers an automatic estimate (service base prices × multipliers)</span></label>
    <p class="fine">When off, customers only see prices you enter on each quote.</p>
    <fieldset><legend>Finish multipliers</legend><div class="grid3">${['gloss', 'satin', 'matte'].map((f) => field(f[0].toUpperCase() + f.slice(1), 'fm_' + f, s.finishMultiplier[f], 'inputmode="decimal"')).join('')}</div></fieldset>
    <fieldset><legend>Vehicle size multipliers</legend><div class="grid4">${Object.keys(s.sizeMultiplier).map((k) => field(k === 'suv' ? 'SUV' : k[0].toUpperCase() + k.slice(1), 'sm_' + k, s.sizeMultiplier[k], 'inputmode="decimal"')).join('')}</div></fieldset>
    ${field('Turnaround estimate shown to customers', 'turnaround', s.turnaround, 'maxlength="160"')}
    ${field('Free photo previews per customer', 'freePreviewAllowance', s.freePreviewAllowance, 'inputmode="numeric"', 'Each customer photo opened for editing uses one preview.')}
    <button class="btn gold" type="submit">Save pricing</button></form>`; };
  const billing = () => { const b = o.billing, pct = Math.min(100, (b.previewsUsed / b.plan.included_previews) * 100), active = b.status !== 'none';
    return `<div class="cols"><div class="card stack plan"><p class="eyebrow">Proposed plan</p><h2>${esc(b.plan.name)} <b>${money(b.plan.price_cents)}</b><small>/month</small></h2>
      <ul class="ticks"><li>${icon('check')}Branded visualizer, garage and quote inbox</li><li>${icon('check')}${b.plan.included_previews} photo previews per month included</li><li>${icon('check')}${money(b.plan.overage_cents)} per extra preview (covers image-generation cost)</li><li>${icon('check')}Up to ${b.plan.staff_seats} staff seats, unlimited 3D demo sessions</li></ul>
      ${b.testMode ? `<p class="notice">${icon('info')}<span><b>Test billing.</b> Stripe is not connected, so no card is charged. Subscription billing is separate from customer install quotes.</span></p>` : ''}
      ${active ? `<p>Status: <b>Active (test)</b> · renews ${dateStr(b.renews)}</p><button class="btn ghost" data-bill="cancel">Cancel test subscription</button>` : `<button class="btn gold" data-bill="subscribe">Start test subscription</button>`}</div>
    <div class="card stack"><h2>Usage this period</h2><div class="meter" role="meter" aria-valuemin="0" aria-valuemax="${b.plan.included_previews}" aria-valuenow="${b.previewsUsed}" aria-label="Photo previews used"><i style="width:${pct}%"></i></div>
      <p class="muted">${b.previewsUsed} of ${b.plan.included_previews} included photo previews used${b.previewsUsed > b.plan.included_previews ? ` · ${b.previewsUsed - b.plan.included_previews} overage (${money((b.previewsUsed - b.plan.included_previews) * b.plan.overage_cents)})` : ''}.</p>
      <p class="fine">Customers each get ${o.shop.settings.freePreviewAllowance} free photo previews (set under Pricing).</p></div></div>`; };
  const draw = () => { root.innerHTML = page('Shop dashboard', `${esc(o.shop.name)} · customer records are private to this shop`, head() + `<div class="shop-body">${{ requests, catalog, pricing, billing }[tab]()}</div>`); };
  const load = async () => {
    if (!o) root.innerHTML = page('Shop dashboard', '', loadingHtml);
    try { [o, { quotes }] = await Promise.all([api('/api/shop/overview'), api('/api/shop/quotes')]); draw(); } catch (e) { root.innerHTML = page('Shop dashboard', '', errorHtml(e.message)); }
  };
  const act = async (fn, okMsg) => { try { await fn(); if (okMsg) toast(okMsg); await load(); } catch (ex) { toast(ex.message, 'err'); } };
  const onClick = (e) => {
    if (e.target.closest('[data-retry]')) return load();
    const t = e.target.closest('[data-tab],[data-filter],[data-open],[data-del-color],[data-bill]'); if (!t) return; const ds = t.dataset;
    if (ds.tab) { tab = ds.tab; return draw(); }
    if (ds.filter !== undefined) { filter = ds.filter; return draw(); }
    if (ds.open) { openId = Number(ds.open); draw(); if (matchMedia('(max-width: 899px)').matches) $('.req-detail', root).scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (ds.delColor !== undefined) return act(() => api('/api/shop/colors/' + t.closest('[data-color]').dataset.color, { method: 'DELETE' }), 'Color removed.');
    if (ds.bill) return act(() => api('/api/shop/billing', { method: 'POST', body: { action: ds.bill } }), ds.bill === 'subscribe' ? 'Test subscription started.' : 'Test subscription cancelled.');
  };
  const onChange = (e) => {
    const t = e.target;
    if (t.matches('[data-toggle-color]')) act(() => api('/api/shop/colors/' + t.closest('[data-color]').dataset.color, { method: 'PATCH', body: { active: t.checked } }), 'Catalog updated.');
    if (t.matches('[data-toggle-svc]')) act(() => api('/api/shop/services/' + t.closest('[data-svc]').dataset.svc, { method: 'PATCH', body: { active: t.checked } }), 'Services updated.');
    if (t.matches('[data-svc-price]')) act(() => api('/api/shop/services/' + t.closest('[data-svc]').dataset.svc, { method: 'PATCH', body: { baseCents: Math.round(parseFloat(t.value || '0') * 100) } }), 'Base price saved.');
    if (t.matches('[data-finish]')) act(() => api('/api/shop/settings', { method: 'PUT', body: { finishes: { ...o.shop.settings.finishes, [t.dataset.finish]: t.checked } } }), 'Finishes updated.');
  };
  const onSubmit = (e) => {
    e.preventDefault(); const f = formData(e.target), id = e.target.id;
    if (id === 'respond') {
      const err = $('.form-err', e.target), price = f.price.trim() === '' ? null : Math.round(parseFloat(f.price.replace(/[$,]/g, '')) * 100);
      if (price !== null && !Number.isFinite(price)) { err.textContent = 'Enter the price as a number, for example 3400.'; err.hidden = false; return; }
      return act(() => api('/api/shop/quotes/' + openId, { method: 'PATCH', body: { status: f.status, priceCents: price, turnaround: f.turnaround, message: f.message } }), 'Response saved. The customer can see it in My Quotes.');
    }
    if (id === 'addColor') return act(() => api('/api/shop/colors', { method: 'POST', body: { name: f.name, hex: f.hex } }), 'Color added.');
    if (id === 'addSvc') return act(() => api('/api/shop/services', { method: 'POST', body: { name: f.name, baseCents: Math.round(parseFloat(f.price || '0') * 100) } }), 'Service added.');
    if (id === 'pricing') { const s = o.shop.settings; return act(() => api('/api/shop/settings', { method: 'PUT', body: { autoEstimate: Boolean(f.autoEstimate), turnaround: f.turnaround, freePreviewAllowance: f.freePreviewAllowance,
      finishMultiplier: Object.fromEntries(Object.keys(s.finishMultiplier).map((k) => [k, f['fm_' + k]])), sizeMultiplier: Object.fromEntries(Object.keys(s.sizeMultiplier).map((k) => [k, f['sm_' + k]])) } }), 'Pricing saved.'); }
  };
  root.addEventListener('click', onClick); root.addEventListener('change', onChange); root.addEventListener('submit', onSubmit); load();
  return () => { root.removeEventListener('click', onClick); root.removeEventListener('change', onChange); root.removeEventListener('submit', onSubmit); };
}

// ---------- public share view ----------
export function renderShare(root, token) {
  root.innerHTML = page('Shared build', '', loadingHtml);
  api('/api/share/' + encodeURIComponent(token || '')).then(({ build: b }) => {
    root.innerHTML = page(b.name, esc(vehicleLine(b.vehicle) || 'Shared from Boselli Wrap Works'), `<div class="card share">${b.thumb ? `<img src="${esc(b.thumb)}" alt="Preview of ${esc(b.name)}">` : ''}
      <span class="badge">${icon('info')}Concept preview</span><ul class="kv">${describe(b.config, b.mode).map(([k, v]) => `<li><span>${esc(k)}</span>${esc(v)}</li>`).join('')}</ul>
      <p class="fine">Actual materials, wheel fitment and tint options are confirmed by the installer.</p><a class="btn gold" href="#/studio">${icon('car')}Customize your own</a></div>`);
  }).catch((e) => { root.innerHTML = page('Shared build', '', `<div class="empty card"><h3>Link unavailable</h3><p class="muted">${esc(e.message)}</p><a class="btn gold" href="#/studio">Open the studio</a></div>`); });
  return () => {};
}
