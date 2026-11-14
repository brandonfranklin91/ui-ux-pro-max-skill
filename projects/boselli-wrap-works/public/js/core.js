// Shared helpers: DOM, API client, toasts, modals, icons, auth dialog.
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = (c) => '$' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const dateStr = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');
export const local = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
export const store = { user: null, staffShop: null, cfg: null, shopSlug: new URLSearchParams(location.search).get('shop') || 'boselli' };
const listeners = new Set();
export const onAuth = (fn) => listeners.add(fn);
export function setUser(user, staffShop = null) { store.user = user; store.staffShop = staffShop; listeners.forEach((fn) => fn()); }

export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(path, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  } catch { throw Object.assign(new Error('You appear to be offline. Check your connection and try again.'), { status: 0 }); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed.'), { status: res.status });
  return data;
}
export async function refreshMe() { const d = await api('/api/me'); setUser(d.user, d.staffShop); return d.user; }

const P = {
  car: '<path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11"/><rect x="3" y="11" width="18" height="6" rx="2"/><circle cx="7.5" cy="17" r="1.6"/><circle cx="16.5" cy="17" r="1.6"/>',
  garage: '<path d="M3 21V9l9-5 9 5v12"/><path d="M7 21v-8h10v8"/><path d="M7 17h10"/>',
  quote: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  store: '<path d="M4 9l1-5h14l1 5"/><path d="M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9"/><path d="M5 12v8h14v-8"/><path d="M10 20v-5h4v5"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
  compare: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 2v20"/><path d="M8 10l-2 2 2 2M16 10l2 2-2 2"/>',
  save: '<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/>',
  download: '<path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.6l6.8-4.2M8.6 13.4l6.8 4.2"/>',
  trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>',
  heart: '<path d="M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.600-9 9-9 9z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.500"/>',
  upload: '<path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 20h16"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  up: '<path d="M5 15l7-7 7 7"/>',
  wand: '<path d="M4 20L15 9"/><path d="M17 3v4M15 5h4M20 11v3M18.500 12.500h3M10 3v2M9 4h2"/>',
  brush: '<path d="M14 4l6 6-8 8H6v-6z"/><path d="M3 21c1.500 0 3-1 3-3"/>',
  eraser: '<path d="M8 20l-4.500-4.500a2 2 0 0 1 0-2.800L13 3.200a2 2 0 0 1 2.800 0l4.500 4.500a2 2 0 0 1 0 2.800L11 20z"/><path d="M8 20h12"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.500v.500"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
};
export const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

export function toast(msg, type = 'ok') {
  let host = $('#toasts');
  if (!host) { host = document.createElement('div'); host.id = 'toasts'; host.setAttribute('aria-live', 'polite'); document.body.appendChild(host); }
  const t = document.createElement('div'); t.className = 'toast ' + type; t.setAttribute('role', type === 'err' ? 'alert' : 'status');
  t.innerHTML = `${icon(type === 'err' ? 'info' : 'check')}<span>${esc(msg)}</span>`;
  host.appendChild(t); setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, type === 'err' ? 5200 : 3200);
}

export function modal({ title, html, wide = false, onClose }) {
  const prev = document.activeElement;
  const wrap = document.createElement('div'); wrap.className = 'modal-wrap';
  wrap.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <header class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="Close dialog">${icon('x')}</button></header>
    <div class="modal-body">${html}</div></div>`;
  document.body.appendChild(wrap); document.body.classList.add('modal-open');
  let closed = false;
  const close = (result) => {
    if (closed) return; closed = true;
    wrap.classList.add('out'); document.removeEventListener('keydown', onKey);
    setTimeout(() => { wrap.remove(); if (!$('.modal-wrap')) document.body.classList.remove('modal-open'); }, 180);
    onClose?.(result); prev?.focus?.();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const f = $$('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])', wrap).filter((n) => !n.disabled && n.offsetParent);
      if (!f.length) return; const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  document.addEventListener('keydown', onKey);
  wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) close(); });
  $('[data-close]', wrap).addEventListener('click', () => close());
  const body = $('.modal-body', wrap);
  (body.querySelector('[autofocus]') || $('[data-close]', wrap)).focus();
  return { el: wrap, body, close, setBody(h) { body.innerHTML = h; } };
}
export function confirmDialog(title, text, okLabel = 'Confirm') {
  return new Promise((resolve) => {
    const m = modal({ title, html: `<p class="muted">${esc(text)}</p><div class="row end gap"><button class="btn ghost" data-no>Cancel</button><button class="btn danger" data-yes>${esc(okLabel)}</button></div>`, onClose: (r) => resolve(Boolean(r)) });
    $('[data-no]', m.el).onclick = () => m.close(false); $('[data-yes]', m.el).onclick = () => m.close(true);
  });
}
export const field = (label, name, value = '', attrs = '', hint = '') =>
  `<label class="field"><span>${esc(label)}</span><input name="${name}" value="${esc(value)}" ${attrs}>${hint ? `<small>${esc(hint)}</small>` : ''}</label>`;
export const formData = (form) => Object.fromEntries(new FormData(form).entries());
export function busy(btn, on, label) {
  if (on) { btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="spin" aria-hidden="true"></span>${esc(label || 'Working…')}`; }
  else { btn.disabled = false; if (btn.dataset.label) btn.innerHTML = btn.dataset.label; }
}

// Sign in / create account dialog. Resolves true once authenticated.
export function authModal(reason = '') {
  return new Promise((resolve) => {
    let mode = 'signup';
    const m = modal({ title: 'Your Boselli account', html: '', onClose: (r) => resolve(Boolean(r)) });
    const draw = () => {
      m.setBody(`${reason ? `<p class="notice">${icon('lock')}<span>${esc(reason)}</span></p>` : ''}
        <div class="seg" role="tablist"><button role="tab" aria-selected="${mode === 'signup'}" data-m="signup">Create account</button><button role="tab" aria-selected="${mode === 'login'}" data-m="login">Sign in</button></div>
        <form class="stack" novalidate>
          ${mode === 'signup' ? field('Name', 'name', '', 'autocomplete="name" required') : ''}
          ${field('Email', 'email', '', 'type="email" autocomplete="email" inputmode="email" required autofocus')}
          ${field('Password', 'password', '', `type="password" autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}" required minlength="8"`, mode === 'signup' ? 'At least 8 characters.' : '')}
          <p class="form-err" role="alert" hidden></p>
          <button class="btn gold block" type="submit">${mode === 'signup' ? 'Create free account' : 'Sign in'}</button>
          <p class="fine">Your uploads and saved builds stay private to your account.</p>
        </form>`);
      $$('[data-m]', m.body).forEach((b) => (b.onclick = () => { mode = b.dataset.m; draw(); }));
      const form = $('form', m.body);
      form.onsubmit = async (e) => {
        e.preventDefault(); const err = $('.form-err', form); const btn = $('button[type=submit]', form);
        busy(btn, true, 'One moment…');
        try {
          await api('/api/auth/' + mode, { method: 'POST', body: formData(form) });
          await refreshMe(); toast(mode === 'signup' ? 'Account created. Welcome to Boselli.' : 'Signed in.'); m.close(true);
        } catch (ex) { err.textContent = ex.message; err.hidden = false; busy(btn, false); $('input[name=email]', form).focus(); }
      };
      $('input', form)?.focus();
    };
    draw();
  });
}
export async function ensureAuth(reason) { return store.user ? true : authModal(reason); }

export function describe(cfg, mode = '3d') {
  const d = { full: 'Full-body color', roof: 'Contrasting roof', hood: 'Hood accent', stripes: 'Racing stripes', panels: 'Selected panels' }[cfg.design] || 'Full-body color';
  const out = [['Wrap', cfg.colorName || cfg.color], ['Finish', cap(cfg.finish)], ['Design', d]];
  if (cfg.design !== 'full' && cfg.design !== 'panels') out.push(['Accent', cfg.accentName || cfg.accent]);
  if (mode === '3d') out.push(['Wheels', `${cfg.wheelName || cfg.wheel} · ${cfg.wheelFinishName || cfg.wheelFinish}`]);
  out.push(['Tint', cfg.tint === 'none' ? 'Stock glass' : cap(cfg.tint)]);
  return out;
}
