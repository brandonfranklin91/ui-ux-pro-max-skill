// App shell: navigation, hash router, boot.
import { $, esc, api, store, icon, onAuth, refreshMe, toast, STATIC } from './core.js';
import { renderLanding, renderEditor } from './studio.js';
import { renderGarage, renderQuotes, renderAccount, renderShop, renderShare } from './pages.js';

const NAV = [['studio', 'Studio', 'car'], ['garage', 'My Garage', 'garage'], ['quotes', 'My Quotes', 'quote'], ['account', 'Account', 'user']];
const view = $('#view');
let cleanup = null, current = '';

function drawNav(section) {
  const links = (cls) => NAV.map(([k, label, ic]) => `<a class="${cls}" href="#/${k}" ${section === k ? 'aria-current="page"' : ''}>${icon(ic)}<span>${label}</span></a>`).join('');
  if (STATIC) {
    document.body.classList.add('static');
    $('#topbar').innerHTML = `<a class="brand" href="#/studio" aria-label="Boselli Wrap Works home"><img src="assets/emblem.webp" alt="" width="64" height="38"><span>Boselli<small>Wrap Works</small></span></a><span class="pill demo who">Showcase preview</span>`;
    $('#tabbar').innerHTML = ''; return;
  }
  const staff = store.user?.role === 'staff';
  $('#topbar').innerHTML = `<a class="brand" href="#/studio" aria-label="Boselli Wrap Works home"><img src="assets/emblem.webp" alt="" width="64" height="38"><span>Boselli<small>Wrap Works</small></span></a>
    <nav class="topnav" aria-label="Primary">${links('navlink')}${staff ? `<a class="navlink staff" href="#/shop" ${section === 'shop' ? 'aria-current="page"' : ''}>${icon('store')}<span>Shop dashboard</span></a>` : ''}</nav>
    <a class="who" href="#/account">${store.user ? `<i>${esc(store.user.name[0].toUpperCase())}</i><span>${esc(store.user.name.split(' ')[0])}</span>` : `${icon('user')}<span>Sign in</span>`}</a>`;
  $('#tabbar').innerHTML = links('tab') + (staff ? `<a class="tab" href="#/shop" ${section === 'shop' ? 'aria-current="page"' : ''}>${icon('store')}<span>Shop</span></a>` : '');
}
function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'editor') parts.splice(0, 1, 'studio', 'edit'); // plain-hash form used by the static showcase
  if (STATIC && parts[0] !== 'studio') parts.splice(0, parts.length, 'studio');
  const section = parts[0] || 'studio', key = parts.join('/');
  cleanup?.(); cleanup = null;
  document.body.dataset.section = section;
  drawNav(section);
  if (key !== current) window.scrollTo(0, 0);
  current = key;
  view.className = '';
  if (section === 'studio') cleanup = parts[1] === 'edit' ? renderEditor(view) : renderLanding(view);
  else if (section === 'garage') cleanup = renderGarage(view);
  else if (section === 'quotes') cleanup = renderQuotes(view);
  else if (section === 'account') cleanup = renderAccount(view);
  else if (section === 'shop') cleanup = renderShop(view);
  else if (section === 'share') cleanup = renderShare(view, parts[1]);
  else { location.hash = '#/studio'; }
}
async function boot() {
  try {
    const [cfg] = await Promise.all([api('/api/config?shop=' + encodeURIComponent(store.shopSlug)), refreshMe()]);
    store.cfg = cfg;
  } catch (e) {
    view.innerHTML = `<div class="boot"><p>${esc(e.message)}</p><button class="btn gold" onclick="location.reload()">Try again</button></div>`; return;
  }
  onAuth(() => { const sec = document.body.dataset.section; if (['garage', 'quotes', 'account', 'shop'].includes(sec)) route(); else drawNav(sec); });
  window.addEventListener('hashchange', route);
  route();
}
window.addEventListener('unhandledrejection', (e) => { if (e.reason?.message) toast(e.reason.message, 'err'); });
boot();
