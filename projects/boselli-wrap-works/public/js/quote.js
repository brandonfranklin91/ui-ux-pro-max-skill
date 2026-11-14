// Installation quote request wizard: details -> review -> confirmation.
import { $, $$, esc, api, store, modal, icon, describe, money, busy, field, formData } from './core.js';

const TIMINGS = ['As soon as possible', 'Within 2 weeks', 'Within a month', 'Just exploring / flexible'];
export function openQuoteWizard(build) {
  const u = store.user, c = build.config, v = build.vehicle || {};
  const pre = new Set();
  if (c.design === 'full' || c.design === 'panels') pre.add('full_wrap'); else pre.add('partial_wrap');
  if (c.design === 'stripes') pre.add('stripes');
  if (c.tint && c.tint !== 'none') pre.add('tint');
  if (build.mode === '3d' ? c.wheelFinish !== 'silver' : c.wheelFinish !== 'stock') pre.add('wheels');
  let data = { year: v.year || '', make: v.make || '', model: v.model || '', size: 'coupe', services: [...pre], location: '', timing: TIMINGS[1], name: u.name, email: u.email, phone: u.phone || '', notes: '' };
  const m = modal({ title: 'Get a wrap quote', wide: true, html: '' });
  const summary = () => `<div class="build-sum">${build.thumb ? `<img src="${esc(build.thumb)}" alt="Preview of ${esc(build.name)}">` : ''}<div><b>${esc(build.name)}</b>
    <ul class="kv">${describe(c, build.mode).map(([k, val]) => `<li><span>${esc(k)}</span>${esc(val)}</li>`).join('')}</ul></div></div>`;

  function step1(errors = {}) {
    const e = (k) => (errors[k] ? `<small class="err" role="alert">${esc(errors[k])}</small>` : '');
    m.setBody(`<ol class="wizard-steps" aria-label="Progress"><li class="on">Details</li><li>Review</li><li>Sent</li></ol>${summary()}
      <form class="stack" novalidate>
        <fieldset><legend>Vehicle</legend><div class="grid3">
          <label class="field"><span>Year</span><input name="year" value="${esc(data.year)}" inputmode="numeric" maxlength="4" placeholder="2021" required autofocus>${e('year')}</label>
          <label class="field"><span>Make</span><input name="make" value="${esc(data.make)}" maxlength="40" placeholder="Dodge" required>${e('make')}</label>
          <label class="field"><span>Model</span><input name="model" value="${esc(data.model)}" maxlength="40" placeholder="Challenger" required>${e('model')}</label></div>
          <label class="field"><span>Body type</span><select name="size">${['coupe', 'sedan', 'suv', 'truck'].map((s) => `<option value="${s}" ${data.size === s ? 'selected' : ''}>${s === 'suv' ? 'SUV' : s[0].toUpperCase() + s.slice(1)}</option>`).join('')}</select></label></fieldset>
        <fieldset><legend>Requested services</legend><div class="checks">${store.cfg.services.map((s) => `<label class="check"><input type="checkbox" name="svc" value="${esc(s.key)}" ${data.services.includes(s.key) ? 'checked' : ''}><span>${esc(s.name)}</span></label>`).join('')}</div>${e('services')}</fieldset>
        <div class="grid2"><label class="field"><span>City or ZIP code</span><input name="location" value="${esc(data.location)}" maxlength="80" autocomplete="postal-code" required>${e('location')}</label>
          <label class="field"><span>Preferred timing</span><select name="timing">${TIMINGS.map((t) => `<option ${data.timing === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>
        <fieldset><legend>Contact</legend><div class="grid3">
          <label class="field"><span>Name</span><input name="name" value="${esc(data.name)}" autocomplete="name" required>${e('name')}</label>
          <label class="field"><span>Email</span><input name="email" type="email" value="${esc(data.email)}" autocomplete="email" required>${e('email')}</label>
          <label class="field"><span>Phone (optional)</span><input name="phone" type="tel" value="${esc(data.phone)}" autocomplete="tel"></label></div></fieldset>
        <label class="field"><span>Anything we should know? (optional)</span><textarea name="notes" rows="2" maxlength="1000">${esc(data.notes)}</textarea></label>
        <button class="btn gold block" type="submit">Review request</button></form>`);
    const form = $('form', m.body);
    form.onsubmit = (ev) => {
      ev.preventDefault(); const f = formData(form);
      data = { ...data, ...f, services: $$('input[name=svc]:checked', form).map((i) => i.value) };
      const er = {};
      if (!/^(19|20)\d\d$/.test(data.year.trim())) er.year = 'Enter a 4-digit year.';
      if (!data.make.trim()) er.make = 'Required.'; if (!data.model.trim()) er.model = 'Required.';
      if (!data.services.length) er.services = 'Choose at least one service.';
      if (!data.location.trim()) er.location = 'Enter your city or ZIP code.';
      if (!data.name.trim()) er.name = 'Required.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) er.email = 'Enter a valid email.';
      if (Object.keys(er).length) { step1(er); $('.err', m.body)?.closest('label,fieldset')?.querySelector('input')?.focus(); } else step2();
    };
  }
  function step2() {
    const names = data.services.map((k) => store.cfg.services.find((s) => s.key === k)?.name || k);
    m.setBody(`<ol class="wizard-steps" aria-label="Progress"><li class="done">Details</li><li class="on">Review</li><li>Sent</li></ol>${summary()}
      <ul class="kv review">
        <li><span>Vehicle</span>${esc(`${data.year} ${data.make} ${data.model}`)} · ${esc(data.size)}</li>
        <li><span>Services</span>${names.map(esc).join(', ')}</li>
        <li><span>Location</span>${esc(data.location)}</li><li><span>Timing</span>${esc(data.timing)}</li>
        <li><span>Contact</span>${esc(data.name)} · ${esc(data.email)}${data.phone ? ' · ' + esc(data.phone) : ''}</li>
        ${data.notes ? `<li><span>Notes</span>${esc(data.notes)}</li>` : ''}
        <li><span>Sent to</span>${esc(store.cfg.shop.name)}</li></ul>
      <p class="fine">The shop reviews your design and replies with pricing. Nothing is charged for requesting a quote.</p>
      <p class="form-err" role="alert" hidden></p>
      <div class="row gap"><button class="btn ghost" data-back>${icon('back')}Edit</button><button class="btn gold grow" data-send autofocus>Submit request</button></div>`);
    $('[data-back]', m.body).onclick = () => step1();
    const send = $('[data-send]', m.body); send.focus();
    send.onclick = async () => {
      busy(send, true, 'Sending…');
      try {
        const { quote } = await api('/api/quotes', { method: 'POST', body: { shop: store.shopSlug, buildId: build.id, vehicle: { year: data.year.trim(), make: data.make, model: data.model, size: data.size },
          services: data.services, location: data.location, timing: data.timing, contact: { name: data.name, email: data.email.trim(), phone: data.phone }, notes: data.notes } });
        step3(quote);
      } catch (ex) { const er = $('.form-err', m.body); er.textContent = ex.message; er.hidden = false; busy(send, false); }
    };
  }
  function step3(quote) {
    m.setBody(`<ol class="wizard-steps" aria-label="Progress"><li class="done">Details</li><li class="done">Review</li><li class="on">Sent</li></ol>
      <div class="confirm">${icon('check', 'big ok')}<h3>Request sent</h3><p>Your request number is</p><p class="reqno" id="reqNo">${esc(quote.number)}</p>
        <p class="muted">Status: <b>${esc(quote.status)}</b>. ${esc(store.cfg.shop.turnaround || '')}</p>
        ${quote.estimateCents != null ? `<p class="notice">${icon('info')}<span>Estimate from the shop’s pricing rules: <b>${money(quote.estimateCents)}</b>. The final price is confirmed by the installer.</span></p>` : '<p class="fine">Pricing appears in My Quotes once the shop has reviewed your design.</p>'}
        <div class="row gap center"><a class="btn gold" href="#/quotes" data-done>View my quotes</a><button class="btn ghost" data-done>Done</button></div></div>`);
    $$('[data-done]', m.body).forEach((b) => b.addEventListener('click', () => m.close()));
  }
  step1();
}
