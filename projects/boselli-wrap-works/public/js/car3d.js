// Original procedural 3D coupe for the Boselli Wrap Works studio (no third-party model licence needed).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const STOCK = { color: '#b9bcc0', colorName: 'Liquid Silver', finish: 'gloss', design: 'full', accent: '#c9a227', wheel: 'apex5', wheelFinish: 'silver', tint: 'none' };
export const SIGNATURE = { color: '#0b0b0c', colorName: 'Midnight Black', finish: 'matte', design: 'stripes', accent: '#c9a227', wheel: 'split6', wheelFinish: 'black', tint: 'medium' };
export const WHEELS = [
  { key: 'apex5', name: 'Apex 5', note: 'Five-spoke' }, { key: 'split6', name: 'Split 6', note: 'Twin six-spoke' },
  { key: 'mesh', name: 'Mesh', note: 'Motorsport mesh' }, { key: 'turbine', name: 'Turbine', note: 'Swept blades' },
];
export const WHEEL_FINISHES = [
  { key: 'silver', name: 'Silver', hex: '#c8ccd0' }, { key: 'black', name: 'Gloss black', hex: '#101012' },
  { key: 'gunmetal', name: 'Gunmetal', hex: '#4a4f55' }, { key: 'gold', name: 'Gold', hex: '#b8902f' },
];
export const TINTS = [
  { key: 'none', name: 'Stock', opacity: 0.3, hex: '#1d2b33', photo: 0 }, { key: 'light', name: 'Light', opacity: 0.56, hex: '#141a1e', photo: 0.3 },
  { key: 'medium', name: 'Medium', opacity: 0.78, hex: '#0b0d0f', photo: 0.55 }, { key: 'dark', name: 'Dark', opacity: 0.95, hex: '#050506', photo: 0.8 },
];
const FINISH = {
  gloss: { roughness: 0.22, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.04 },
  satin: { roughness: 0.46, metalness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.45 },
  matte: { roughness: 0.82, metalness: 0.25, clearcoat: 0, clearcoatRoughness: 1 },
};
const AXLE_F = 1.38, AXLE_R = -1.37, WHEEL_R = 0.34;

function spline(keys) { // Catmull-Rom through [x, y] keys
  return (x) => {
    let i = 0; while (i < keys.length - 2 && x > keys[i + 1][0]) i++;
    const p1 = keys[i], p2 = keys[i + 1], p0 = keys[Math.max(0, i - 1)], p3 = keys[Math.min(keys.length - 1, i + 2)];
    const t = Math.min(1, Math.max(0, (x - p1[0]) / (p2[0] - p1[0])));
    const t2 = t * t, t3 = t2 * t;
    return 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
  };
}
const sgnPow = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);

// Loft a closed ring along z. point(i, j) -> [x,y,z]; classify(zMid, sinMid) -> material index.
function loft(nz, nr, point, classify, groups) {
  const pos = [];
  for (let i = 0; i < nz; i++) for (let j = 0; j < nr; j++) pos.push(...point(i, j));
  const buckets = Array.from({ length: groups }, () => []);
  for (let i = 0; i < nz - 1; i++) for (let j = 0; j < nr; j++) {
    const j2 = (j + 1) % nr, a = i * nr + j, b = i * nr + j2, c = (i + 1) * nr + j, d = (i + 1) * nr + j2;
    buckets[classify ? classify(i, j) : 0].push(a, b, c, b, d, c);
  }
  // end caps
  for (const [i, flip] of [[0, true], [nz - 1, false]]) {
    let cx = 0, cy = 0; for (let j = 0; j < nr; j++) { cx += pos[(i * nr + j) * 3]; cy += pos[(i * nr + j) * 3 + 1]; }
    const ci = pos.length / 3; pos.push(cx / nr, cy / nr, pos[(i * nr) * 3 + 2]);
    for (let j = 0; j < nr; j++) { const a = i * nr + j, b = i * nr + (j + 1) % nr; buckets[0].push(ci, flip ? b : a, flip ? a : b); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const index = []; let start = 0;
  buckets.forEach((bk, m) => { g.addGroup(start, bk.length, m); start += bk.length; index.push(...bk); });
  g.setIndex(index); g.computeVertexNormals();
  return g;
}

function paintMaterial(uniforms, cabin) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, envMapIntensity: 1.15 });
  const u = { ...uniforms, uCabin: { value: cabin ? 1 : 0 } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObjPos; varying vec3 vObjNormal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjPos = position; vObjNormal = normal;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vObjPos; varying vec3 vObjNormal;
        uniform vec3 uAccent; uniform int uMode; uniform float uCabin; uniform float uMask;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 bp = vObjPos; vec3 bn = normalize(vObjNormal); float bwwTrim = 0.0;
        float bUp = smoothstep(0.3, 0.55, bn.y);
        if (uCabin < 0.5) {
          float dw = min(distance(bp.zy, vec2(${AXLE_F.toFixed(2)}, ${WHEEL_R})), distance(bp.zy, vec2(${AXLE_R.toFixed(2)}, ${WHEEL_R})));
          if (abs(bp.x) > 0.5 && dw < 0.43) discard;
          float aaY = fwidth(bp.y) + 0.0001;
          bwwTrim = max(1.0 - smoothstep(0.30 - aaY, 0.30 + aaY, bp.y), (1.0 - smoothstep(0.455, 0.47, dw)) * step(0.5, abs(bp.x)));
          if (uMode == 2) {
            float aaZ = fwidth(bp.z) + 0.0001; float aaX = fwidth(bp.x) + 0.0001;
            float hood = smoothstep(0.84 - aaZ, 0.84 + aaZ, bp.z) * (1.0 - smoothstep(2.16 - aaZ, 2.16 + aaZ, bp.z)) * (1.0 - smoothstep(0.62 - aaX, 0.62 + aaX, abs(bp.x)));
            diffuseColor.rgb = mix(diffuseColor.rgb, uAccent, hood * bUp);
          }
        } else if (uMode == 1) { diffuseColor.rgb = uAccent; }
        if (uMode == 3) {
          float ax = abs(bp.x); float aa = fwidth(ax) + 0.0001;
          float band = smoothstep(0.055 - aa, 0.055 + aa, ax) * (1.0 - smoothstep(0.30 - aa, 0.30 + aa, ax));
          float face = max(bUp, smoothstep(2.22, 2.29, abs(bp.z)) * (1.0 - uCabin));
          diffuseColor.rgb = mix(diffuseColor.rgb, uAccent, band * face * (1.0 - bwwTrim));
        }
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.012), bwwTrim);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.85, bwwTrim);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.0, bwwTrim);')
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        if (uMask > 0.5) gl_FragColor = vec4(vec3(uMask < 1.5 && bwwTrim < 0.5 ? 1.0 : 0.0), 1.0);`);
  };
  m.customProgramCacheKey = () => 'bww-paint';
  return m;
}

function buildWheel(style, mats) {
  const g = new THREE.Group();
  const add = (geo, mat, y = 0) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; g.add(m); return m; };
  const prof = [[0.232, -0.13], [0.3, -0.136], [0.334, -0.1], [0.34, 0], [0.334, 0.1], [0.3, 0.136], [0.232, 0.13]].map(([r, y]) => new THREE.Vector2(r, y));
  add(new THREE.LatheGeometry(prof, 40), mats.tire);
  add(new THREE.CylinderGeometry(0.236, 0.236, 0.25, 40, 1, true), mats.rimIn);
  const lip = add(new THREE.TorusGeometry(0.228, 0.012, 8, 48), mats.rim, 0.128); lip.rotation.x = Math.PI / 2;
  add(new THREE.CylinderGeometry(0.19, 0.19, 0.016, 36), mats.disc, 0.02);
  const cal = add(new THREE.BoxGeometry(0.05, 0.05, 0.13), mats.caliper, 0.035); cal.position.x = 0.15;
  add(new THREE.CylinderGeometry(0.045, 0.06, 0.05, 24), mats.rim, 0.1);
  add(new THREE.CylinderGeometry(0.022, 0.022, 0.012, 16), mats.cap, 0.13);
  const spoke = (w, off, shear, ang) => {
    const geo = new THREE.BoxGeometry(w, 0.026, 0.2, 1, 1, 6); geo.translate(off, 0, 0.133);
    if (shear) { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) + Math.pow(p.getZ(i) / 0.233, 2) * shear); }
    const m = add(geo, mats.rim, 0.095); m.rotation.y = ang;
  };
  const ring = (n, fn) => { for (let k = 0; k < n; k++) fn((k / n) * Math.PI * 2); };
  if (style === 'apex5') ring(5, (a) => spoke(0.07, 0, 0, a));
  if (style === 'split6') ring(6, (a) => { spoke(0.024, 0.026, 0, a); spoke(0.024, -0.026, 0, a); });
  if (style === 'mesh') ring(10, (a) => { spoke(0.014, 0.012, 0.07, a); spoke(0.014, -0.012, -0.07, a); });
  if (style === 'turbine') ring(11, (a) => spoke(0.034, 0, 0.11, a));
  return g;
}

function buildCar() {
  const car = new THREE.Group();
  const uniforms = { uAccent: { value: new THREE.Color('#c9a227') }, uMode: { value: 0 }, uMask: { value: 0 } };
  const paint = paintMaterial(uniforms, false), cabinPaint = paintMaterial(uniforms, true);
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x1d2b33, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.3, envMapIntensity: 1.6 });
  const black = new THREE.MeshStandardMaterial({ color: 0x070708, roughness: 0.7, metalness: 0.1 });
  const mirror = new THREE.MeshPhysicalMaterial({ color: 0xffffff });

  // --- lower body ---
  const top = spline([[-2.3, 0.8], [-2.12, 0.94], [-1.5, 1.0], [-0.5, 1.0], [0.7, 0.985], [1.5, 0.94], [2.12, 0.87], [2.3, 0.77]]);
  const bot = spline([[-2.3, 0.37], [-2.05, 0.24], [-1.0, 0.2], [1.0, 0.2], [2.05, 0.22], [2.3, 0.35]]);
  const wid = spline([[-2.3, 0.78], [-2.15, 0.9], [-1.6, 0.955], [0, 0.96], [1.5, 0.945], [2.15, 0.9], [2.3, 0.78]]);
  const NZ = 110, NR = 72;
  const bodyGeo = loft(NZ, NR, (i, j) => {
    const z = -2.3 + (4.6 * i) / (NZ - 1), t = (j / NR) * Math.PI * 2;
    const yt = top(z), yb = bot(z), yc = (yt + yb) / 2, h = (yt - yb) / 2;
    const sy = sgnPow(Math.sin(t), 0.42), sx = sgnPow(Math.cos(t), 0.42);
    const flare = 1 + 0.035 * Math.exp(-Math.pow((z - AXLE_F) / 0.5, 2)) + 0.045 * Math.exp(-Math.pow((z - AXLE_R) / 0.5, 2));
    return [wid(z) * flare * sx * (1 - 0.05 * Math.max(0, sy)), yc + h * sy + 0.03 * Math.max(0, sy) * (1 - sx * sx), z];
  }, null, 1);
  const body = new THREE.Mesh(bodyGeo, paint); car.add(body);

  // --- cabin (glass + pillars + roof) ---
  const roof = spline([[-1.6, 0.95], [-1.25, 1.09], [-0.75, 1.265], [-0.3, 1.33], [0.1, 1.32], [0.48, 1.19], [0.9, 0.95]]);
  const cw = spline([[-1.6, 0.72], [-1.0, 0.85], [0, 0.875], [0.9, 0.82]]);
  const CZ = 76, CR = 64, zOf = (i) => -1.6 + (2.5 * i) / (CZ - 1);
  const cabinGeo = loft(CZ, CR, (i, j) => {
    const z = zOf(i), t = (j / CR) * Math.PI * 2, s = Math.sin(t);
    const sy = sgnPow(s, 0.5), sx = sgnPow(Math.cos(t), 0.5);
    const y = sy > 0 ? 0.9 + sy * (roof(z) - 0.9) : 0.9 + sy * 0.12;
    const hf = Math.max(0, (y - 0.9) / 0.43);
    return [cw(z) * sx * (1 - 0.27 * hf), y, z];
  }, (i, j) => {
    const z = zOf(i + 0.5), s = Math.sin(((j + 0.5) / CR) * Math.PI * 2);
    if (s < 0.06) return 0;
    if (s > 0.86) return z > -0.72 && z < 0.2 ? 0 : 1; // roof panel vs windshield / rear glass
    if (s > 0.66) return 0; // pillars and roof rails
    if (z > -0.5 && z < -0.42) return 2; // B-pillar trim
    return 1;
  }, 3);
  const cabin = new THREE.Mesh(cabinGeo, [cabinPaint, glass, black]); car.add(cabin);

  // --- interior, wells and trim ---
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.6, 4.1), new THREE.MeshBasicMaterial({ color: 0x030303 })); hull.position.y = 0.56; car.add(hull);
  const seatMat = new THREE.MeshStandardMaterial({ color: 0xe6d8bd, roughness: 0.8 });
  for (const x of [-0.36, 0.36]) {
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.52, 0.13), seatMat); back.position.set(x, 1.0, -0.28); back.rotation.x = -0.18; car.add(back);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.1), seatMat); head.position.set(x, 1.22, -0.34); car.add(head);
  }
  const dash = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.5), black); dash.position.set(0, 0.9, 0.55); car.add(dash);
  const box = (w, h, d, x, y, z, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); car.add(m); return m; };
  box(1.36, 0.2, 0.06, 0, 0.62, 2.29, black); box(0.9, 0.07, 0.06, 0, 0.42, 2.29, black);
  const lamp = new THREE.MeshStandardMaterial({ color: 0x221a10, emissive: 0xffc070, emissiveIntensity: 2.2 });
  for (const x of [-0.56, -0.37, 0.37, 0.56]) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.012, 10, 32), lamp); r.position.set(x, 0.62, 2.32); car.add(r);
  }
  const tail = new THREE.MeshStandardMaterial({ color: 0x300406, emissive: 0xff1a1a, emissiveIntensity: 1.6 });
  box(1.36, 0.08, 0.05, 0, 0.74, -2.285, tail); box(0.34, 0.11, 0.03, 0, 0.5, -2.295, seatMat);
  for (const x of [-1, 1]) { const m = box(0.15, 0.085, 0.09, x * 0.955, 1.02, 0.62, mirror); m.rotation.y = x * -0.25; }

  // --- wheels ---
  const wm = {
    tire: new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.92 }),
    rim: new THREE.MeshStandardMaterial({ color: 0xc8ccd0, metalness: 1, roughness: 0.24 }),
    rimIn: new THREE.MeshStandardMaterial({ color: 0xc8ccd0, metalness: 1, roughness: 0.4, side: THREE.DoubleSide }),
    disc: new THREE.MeshStandardMaterial({ color: 0x77797c, metalness: 1, roughness: 0.35 }),
    caliper: new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.6, roughness: 0.35 }),
    cap: new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 1, roughness: 0.3 }),
  };
  const wheelSets = {};
  for (const { key } of WHEELS) {
    const set = new THREE.Group(); wheelSets[key] = set; car.add(set);
    for (const z of [AXLE_F, AXLE_R]) for (const side of [-1, 1]) {
      const w = buildWheel(key, wm); w.position.set(side * 0.8, WHEEL_R, z); w.rotation.z = side * -Math.PI / 2; set.add(w);
    }
  }

  function apply(cfg) {
    const f = FINISH[cfg.finish] || FINISH.gloss;
    for (const m of [paint, cabinPaint, mirror]) { m.color.set(cfg.color); Object.assign(m, f); }
    uniforms.uAccent.value.set(cfg.accent || '#c9a227');
    uniforms.uMode.value = { full: 0, roof: 1, hood: 2, stripes: 3 }[cfg.design] ?? 0;
    const t = TINTS.find((x) => x.key === cfg.tint) || TINTS[0];
    glass.color.set(t.hex); glass.opacity = t.opacity;
    const wf = WHEEL_FINISHES.find((x) => x.key === cfg.wheelFinish) || WHEEL_FINISHES[0];
    wm.rim.color.set(wf.hex); wm.rimIn.color.set(wf.hex);
    for (const k in wheelSets) wheelSets[k].visible = k === (cfg.wheel || 'apex5');
  }
  return { car, apply, uniforms, parts: { glass, wm, body, cabin } };
}

function radialTexture(stops, size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => g.addColorStop(o, col)); x.fillStyle = g; x.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function paintBackdrop(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h * 0.62, 0, w / 2, h * 0.62, Math.max(w, h) * 0.75);
  g.addColorStop(0, '#4a1622'); g.addColorStop(0.55, '#200a10'); g.addColorStop(1, '#0d0406');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}

export function createCarView(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement; canvas.className = 'car-canvas';
  canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', 'Interactive 3D preview of the demo coupe');
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  const key = new THREE.DirectionalLight(0xfff1dc, 1.6); key.position.set(4, 6, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffc8d0, 0.7); rim.position.set(-5, 3, -4); scene.add(rim);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 64), new THREE.MeshStandardMaterial({
    color: 0x1c080e, roughness: 0.62, metalness: 0.2, transparent: true, alphaMap: radialTexture([[0, '#fff'], [0.2, '#888'], [0.44, '#000'], [1, '#000']]) }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 6.4), new THREE.MeshBasicMaterial({
    map: radialTexture([[0, 'rgba(0,0,0,.95)'], [0.6, 'rgba(0,0,0,.7)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.004; scene.add(shadow);

  const { car, apply, uniforms, parts } = buildCar(); scene.add(car);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  const HOME = new THREE.Vector3(4.5, 1.65, 5.7);
  camera.position.copy(HOME);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.62, 0); controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 4.2; controls.maxDistance = 13; controls.maxPolarAngle = Math.PI / 2 - 0.04; controls.enabled = false;
  controls.update();

  let cfg = { ...SIGNATURE }, compare = false, split = 0.5, spin = 0, scrollRot = 0, auto = true, running = true, w = 1, h = 1, raf = 0;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  function resize() {
    const r = container.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = Math.min(70, Math.max(30, (2 * Math.atan(Math.tan(0.4) / camera.aspect) * 180) / Math.PI)); camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(container);

  let last = performance.now();
  function loop(t) {
    raf = requestAnimationFrame(loop);
    if (!running || document.hidden) { last = t; return; }
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (auto && !reduce.matches) spin += dt * 0.22;
    controls.update(); drawSafe();
  }
  function drawSafe() {
    car.rotation.y = spin + scrollRot;
    if (!compare) { renderer.setScissorTest(false); apply(cfg); renderer.render(scene, camera); return; }
    const sx = Math.round(w * split);
    renderer.setScissorTest(true);
    apply(STOCK); renderer.setScissor(0, 0, sx, h); renderer.render(scene, camera);
    apply(cfg); renderer.setScissor(sx, 0, w - sx, h); renderer.render(scene, camera);
    renderer.setScissorTest(false);
  }
  raf = requestAnimationFrame(loop);

  function grab(tw, th, backdrop = true) {
    const out = document.createElement('canvas'); out.width = tw; out.height = th; const x = out.getContext('2d');
    if (backdrop) paintBackdrop(x, tw, th);
    const s = Math.max(tw / canvas.width, th / canvas.height), dw = canvas.width * s, dh = canvas.height * s;
    x.drawImage(canvas, (tw - dw) / 2, (th - dh) / 2, dw, dh);
    return out;
  }
  function withSize(tw, th, fn) { // render at an exact pixel size, then restore
    const pr = renderer.getPixelRatio(), ow = w, oh = h, of = camera.fov;
    renderer.setPixelRatio(1); renderer.setSize(tw, th, false); camera.aspect = tw / th; camera.fov = 30; camera.updateProjectionMatrix();
    try { return fn(); } finally {
      renderer.setPixelRatio(pr); renderer.setSize(ow, oh, false); camera.aspect = ow / oh; camera.fov = of; camera.updateProjectionMatrix();
    }
  }

  return {
    canvas,
    mount(el) { el.appendChild(canvas); ro.disconnect(); container = el; ro.observe(el); resize(); },
    setConfig(c) { cfg = { ...cfg, ...c }; },
    setCompare(on, s) { compare = on; if (s !== undefined) split = s; },
    setInteractive(on) { controls.enabled = on; auto = !on; canvas.style.pointerEvents = on ? 'auto' : 'none'; canvas.style.touchAction = on ? 'none' : 'auto'; },
    setScroll(p) { scrollRot = p * Math.PI * 1.15; },
    setRunning(on) { running = on; },
    resetView() { camera.position.copy(HOME); controls.target.set(0, 0.62, 0); spin = 0.0; controls.update(); },
    snapshot(tw = 960, th = 600) {
      return withSize(tw, th, () => { renderer.setScissorTest(false); car.rotation.y = spin + scrollRot; apply(cfg); renderer.render(scene, camera); return grab(tw, th); });
    },
    // Prepared demo "photo": a studio render of the coupe in stock silver plus pixel-accurate masks.
    renderSample(tw = 1200, th = 750) {
      const savedPos = camera.position.clone(), savedRot = car.rotation.y;
      camera.position.set(5.2, 1.75, 6.4); camera.lookAt(0, 0.62, 0); car.rotation.y = 0.18;
      const res = withSize(tw, th, () => {
        renderer.setScissorTest(false);
        apply(STOCK); renderer.render(scene, camera); const image = grab(tw, th);
        const swapped = []; const blackM = new THREE.MeshBasicMaterial({ color: 0x000000 }), whiteM = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const paints = new Set([parts.body.material, parts.cabin.material[0]]);
        const pass = (white, paintMask) => {
          scene.traverse((o) => {
            if (!o.isMesh) return; swapped.push([o, o.material]);
            const map = (m) => (paints.has(m) ? m : white.has(m) ? whiteM : blackM);
            o.material = Array.isArray(o.material) ? o.material.map(map) : map(o.material);
          });
          floor.visible = shadow.visible = false; uniforms.uMask.value = paintMask;
          renderer.setClearColor(0x000000, 1); renderer.render(scene, camera);
          const c = grab(tw, th, false);
          swapped.forEach(([o, m]) => { o.material = m; }); swapped.length = 0;
          floor.visible = shadow.visible = true; uniforms.uMask.value = 0; renderer.setClearColor(0x000000, 0);
          return c;
        };
        return { image, body: pass(new Set(), 1), glass: pass(new Set([parts.glass]), 2), wheels: pass(new Set([parts.wm.rim, parts.wm.rimIn]), 2) };
      });
      camera.position.copy(savedPos); car.rotation.y = savedRot; controls.update();
      return res;
    },
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); },
  };
}
