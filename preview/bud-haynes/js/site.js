// Bud Haynes — page behaviour: company details, navigation, filter slider,
// system tabs, reveal-on-scroll and the service-request form.
(function () {
  'use strict';
  var cfg = window.BUD_HAYNES || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---- company details from the config block in index.html ---- */
  $$('[data-site]').forEach(function (el) { var v = cfg[el.getAttribute('data-site')]; if (v) el.textContent = v; });
  $$('[data-site-tel]').forEach(function (el) { if (cfg.phoneHref) el.href = 'tel:' + cfg.phoneHref; });
  $$('[data-site-mail]').forEach(function (el) { if (cfg.email) el.href = 'mailto:' + cfg.email; });
  var year = $('#year'); if (year) year.textContent = new Date().getFullYear();

  /* ---- header: transparent over the hero, indigo after it ---- */
  var header = $('#header'), hero = $('.hero');
  function headerState() {
    var solid = !hero || hero.getBoundingClientRect().bottom < header.offsetHeight + 8;
    header.classList.toggle('is-solid', solid);
  }
  addEventListener('scroll', headerState, { passive: true });
  addEventListener('resize', headerState);
  headerState();

  /* ---- mobile menu ---- */
  var nav = $('#nav'), menuBtn = $('.header__menu');
  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
  }
  menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); } });
  matchMedia('(min-width: 981px)').addEventListener('change', function () { setMenu(false); });

  /* ---- current section in the nav ---- */
  var links = $$('.header__nav a[href^="#"]:not(.btn)');
  var targets = links.map(function (a) { return $(a.getAttribute('href')); });
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var i = targets.indexOf(en.target);
        if (en.isIntersecting) links.forEach(function (a, k) { if (k === i) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
        else if (i > -1) links[i].removeAttribute('aria-current');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    targets.forEach(function (t) { if (t) spy.observe(t); });
  }

  /* ---- reveal on scroll ---- */
  var reveals = $$('.reveal');
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('no-reveal');
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    reveals.forEach(function (el, i) { el.style.setProperty('--d', (i % 2) * 90 + 'ms'); io.observe(el); });
  }

  /* ---- filter comparison (a real range input: drag, touch and keys) ---- */
  var compare = $('.compare'), range = $('.compare__range');
  if (compare && range) {
    var paint = function () {
      var v = +range.value;
      compare.style.setProperty('--pos', v + '%');
      range.setAttribute('aria-valuetext', v <= 5 ? 'Showing the dirty filter' : v >= 95 ? 'Showing the clean filter' : v + '% clean, ' + (100 - v) + '% dirty');
    };
    range.addEventListener('input', paint); paint();
  }

  /* ---- system tabs ---- */
  var tabs = $$('.tabs__tab');
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab, panel = document.getElementById(t.getAttribute('aria-controls'));
      t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
      panel.hidden = !on; panel.classList.toggle('is-active', on);
    });
    if (focus) tab.focus();
    if (tab.scrollIntoView && focus) tab.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab); });
    tab.addEventListener('keydown', function (e) {
      var n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
      if (n === null) return;
      e.preventDefault(); selectTab(tabs[(n + tabs.length) % tabs.length], true);
    });
  });

  /* ---- service request form ---- */
  var form = $('#service-form');
  if (form) {
    var status = $('.form__status', form), submit = $('button[type="submit"]', form), label = $('.btn__label', submit);
    var fields = ['name', 'phone', 'email', 'service'].map(function (n) { return form.elements[n]; });
    var valid = function (el) {
      var v = el.value.trim();
      if (!v) return false;
      if (el.name === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
      if (el.name === 'phone') return v.replace(/\D/g, '').length >= 7;
      return true;
    };
    var mark = function (el) {
      var ok = valid(el), err = document.getElementById('e-' + el.name);
      el.setAttribute('aria-invalid', String(!ok)); if (err) err.hidden = ok;
      return ok;
    };
    fields.forEach(function (el) {
      el.addEventListener('blur', function () { if (el.value || el.hasAttribute('aria-invalid')) mark(el); });
      el.addEventListener('input', function () { if (el.getAttribute('aria-invalid') === 'true') mark(el); });
      el.addEventListener('change', function () { if (el.getAttribute('aria-invalid') === 'true') mark(el); });
    });
    var say = function (kind, html) { status.className = 'form__status' + (kind ? ' is-' + kind : ''); status.innerHTML = html; };
    var callLink = function () { return '<a href="tel:' + (cfg.phoneHref || '') + '">' + (cfg.phone || 'call us') + '</a>'; };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = fields.filter(function (el) { return !mark(el); });
      if (bad.length) { say('err', 'Please check the highlighted fields.'); bad[0].focus(); return; }
      if (form.elements.company.value) return; // honeypot
      if (!cfg.formEndpoint) {
        // No destination configured: never pretend the request was sent.
        say('err', 'Online requests are not switched on yet. Please call ' + callLink() + ' to schedule.');
        return;
      }
      var data = {}; new FormData(form).forEach(function (v, k) { if (k !== 'company') data[k] = v; });
      data._subject = 'Service request — ' + data.service;
      submit.disabled = true; label.textContent = 'Sending…'; say('', '');
      fetch(cfg.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) })
        .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res; })
        .then(function () {
          form.reset(); form.classList.add('is-sent');
          say('ok', 'Thank you — your request is in. We will be in touch to set up your visit.');
          status.tabIndex = -1; status.focus();
        })
        .catch(function () {
          say('err', 'That did not go through. Please try again, or call ' + callLink() + '.');
        })
        .then(function () { submit.disabled = false; label.textContent = 'Request Service'; });
    });
  }
})();
