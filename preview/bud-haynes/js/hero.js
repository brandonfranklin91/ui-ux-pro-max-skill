// Bud Haynes — scroll director for the pinned hero.
// Native scrolling only: the hero is a tall section with a sticky stage, and
// scroll position (lightly eased) is mapped onto camera, equipment and copy.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildWorld, UNIT } from './world.js';

const root = document.documentElement;
const hero = document.querySelector('.hero');
const stage = hero?.querySelector('.hero__stage');
const canvas = hero?.querySelector('.hero__canvas');
const params = new URLSearchParams(location.search);
const forced = params.has('p') ? parseFloat(params.get('p')) : null;

const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = THREE.MathUtils.lerp;

function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches && forced === null;

if (!hero || reduce || !webglOK()) {
  toStatic(); // stacked poster panels, see site.css
} else {
  try { start(); } catch (err) { console.error(err); toStatic(); }
}

function toStatic() {
  root.classList.remove('hero-pinned', 'hero-live');
  hero?.querySelectorAll('.scene').forEach((el) => { el.inert = false; el.removeAttribute('style'); });
}

function start() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: forced !== null });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const fogExt = new THREE.Color(0x2b2e52), fogDeep = new THREE.Color(0x14162a);
  scene.fog = new THREE.FogExp2(fogExt.clone(), 0.012);
  scene.background = fogExt.clone();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.03, 160);
  const world = buildWorld(scene);

  // --- camera path: [progress, position, look-at] ---
  const U = UNIT;
  const keys = [
    [0.00, [-1.8, 1.28, 3.95], [-0.62, 0.62, 1.0]],
    [0.20, [-1.45, 1.2, 3.3], [-0.5, 0.68, 1.0]],
    [0.34, [-1.3, 1.3, 3.35], [-0.42, 0.98, 1.1]],
    [0.45, [-0.9, 1.15, 2.85], [-0.12, 0.88, 1.0]],
    [0.52, [-0.12, 0.9, 1.35], [0.4, 0.95, -0.9]],
    [0.56, [0.1, 1.35, 0.45], [0.6, 1.4, -1.6]],
    [0.60, [0.6, 2.56, -0.1], [0.6, 2.6, -4]],
    [0.64, [0.6, 2.6, -1.7], [0.6, 2.6, -6]],
    [0.70, [0.6, 2.6, -5.2], [0.6, 2.6, -10]],
    [0.755, [0.6, 2.6, -8.75], [0.55, 2.35, -12.5]],
    [0.80, [0.45, 2.3, -9.85], [0.5, 1.4, -14]],
    [0.90, [-0.75, 1.55, -10.2], [0.75, 0.95, -14.6]],
    [1.00, [-1.55, 1.25, -10.25], [0.85, 0.85, -15]],
  ];
  const times = keys.map((k) => k[0]);
  const posCurve = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k[1])), false, 'centripetal');
  const tgtCurve = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k[2])), false, 'centripetal');
  const curveU = (p) => {
    let i = 0; while (i < times.length - 2 && p > times[i + 1]) i++;
    const t = (p - times[i]) / (times[i + 1] - times[i]);
    return Math.min(1, Math.max(0, (i + t) / (times.length - 1)));
  };

  // --- post ---
  let composer = null, bloom = null;
  const useBloom = !matchMedia('(max-width: 767px)').matches || forced !== null;
  if (useBloom) {
    const rt = new THREE.WebGLRenderTarget(4, 4, { samples: 4, type: THREE.HalfFloatType });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(4, 4), 0.32, 0.7, 0.9);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  // --- overlay elements ---
  const scenes = [...hero.querySelectorAll('.scene')];
  const ranges = [[-1, 0.17], [0.235, 0.42], [0.485, 0.715], [0.815, 2]];
  const labels = [...hero.querySelectorAll('.tag')].map((el) => ({
    el, anchor: world.unit.anchors[el.dataset.anchor], dx: +el.dataset.dx, dy: +el.dataset.dy,
    path: hero.querySelector(`.hero__leaders [data-for="${el.dataset.anchor}"]`),
    dot: hero.querySelector(`.hero__leaders circle[data-dot="${el.dataset.anchor}"]`),
  }));
  const labelLayer = hero.querySelector('.hero__tags');
  const leaders = hero.querySelector('.hero__leaders');
  const veil = hero.querySelector('.hero__veil');
  const hint = hero.querySelector('.hero__hint');
  const chapNum = hero.querySelector('.hero__chapter-num');
  const chapName = hero.querySelector('.hero__chapter-name');
  const chapBar = hero.querySelector('.hero__chapter-bar i');
  const chapNames = ['Outside', 'Inside the unit', 'Through the system', 'At home'];

  let W = 0, H = 0, portrait = 0;
  function resize() {
    W = stage.clientWidth; H = stage.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, W < 768 ? 1.5 : 2);
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
    if (composer) { composer.setPixelRatio(dpr); composer.setSize(W, H); }
    camera.aspect = W / H;
    portrait = 1 - ss(0.8, 1.5, camera.aspect); // 1 on phones, 0 on landscape screens
    const hfov = THREE.MathUtils.degToRad(40);
    const vPortrait = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hfov / 2) / Math.min(camera.aspect, 1.5)));
    camera.fov = lerp(40, Math.min(vPortrait, 78), portrait);
    camera.updateProjectionMatrix();
    leaders.setAttribute('viewBox', `0 0 ${W} ${H}`);
  }
  new ResizeObserver(resize).observe(stage); resize();

  // --- scroll progress ---
  let target = forced ?? 0, cur = forced ?? 0;
  function readScroll() {
    if (forced !== null) return;
    const r = hero.getBoundingClientRect();
    const span = r.height - innerHeight;
    target = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
  }
  addEventListener('scroll', readScroll, { passive: true }); readScroll(); cur = target;

  const pos = new THREE.Vector3(), tgt = new THREE.Vector3(), v = new THREE.Vector3();
  const skyTop = new THREE.Color(0x6672d8), warmTop = new THREE.Color(0xfff0dc), gndExt = new THREE.Color(0x2a2622), gndRoom = new THREE.Color(0x8a6a4a);
  let lastExplode = -1, lastScene = -1;

  function apply(p) {
    const techIn = ss(0.2, 0.3, p);
    const tech = techIn * (1 - ss(0.735, 0.79, p));
    const explode = ss(0.21, 0.37, p);
    const roomK = ss(0.66, 0.77, p);

    world.ext.visible = p < 0.7;
    world.sys.visible = p > 0.19 && p < 0.8;
    world.room.visible = p > 0.62;
    world.setTech(tech);
    world.setRoom(roomK);
    world.unit.setExplode(explode);
    if (Math.abs(explode - lastExplode) > 0.002) { world.sun.shadow.needsUpdate = true; lastExplode = explode; }

    world.hemi.intensity = lerp(lerp(0.62, 0.16, techIn), 0.42, roomK);
    world.hemi.color.copy(skyTop).lerp(warmTop, roomK);
    world.hemi.groundColor.copy(gndExt).lerp(gndRoom, roomK);
    scene.fog.color.copy(fogExt).lerp(fogDeep, techIn);
    scene.background.copy(scene.fog.color);
    scene.fog.density = lerp(lerp(0.012, 0.085, techIn), 0, ss(0.74, 0.79, p));
    scene.environmentIntensity = lerp(lerp(0.3, 0.12, techIn), 0.32, roomK);
    renderer.toneMappingExposure = lerp(1.0, 0.92, roomK);
    if (bloom) bloom.strength = lerp(lerp(0.3, 0.5, tech), 0.2, roomK);
    world.endGlow.opacity = 0.85 * ss(0.57, 0.63, p);
    world.trails.opacity = 0.75 * ss(0.5, 0.6, p) * (1 - ss(0.76, 0.8, p));

    // camera
    const u = curveU(p);
    posCurve.getPoint(u, pos); tgtCurve.getPoint(u, tgt);
    if (portrait > 0) { // phones: lift the subject above the copy block
      const d = pos.distanceTo(tgt);
      tgt.y -= portrait * d * lerp(0.2, 0.1, ss(0.5, 0.62, p)) * (1 - ss(0.58, 0.64, p) * (1 - ss(0.76, 0.84, p)));
    }
    if (portrait > 0) tgt.x += portrait * 0.34 * (1 - ss(0.44, 0.52, p)); // keep the unit centred on narrow screens
    camera.position.copy(pos); camera.lookAt(tgt);

    // copy
    scenes.forEach((el, i) => {
      const [a, b] = ranges[i];
      const o = ss(a - 0.035, a, p) * (1 - ss(b, b + 0.035, p));
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translate3d(0,${((1 - o) * (p > b ? -18 : 18)).toFixed(1)}px,0)`;
      const on = o > 0.5;
      if (el._on !== on) { el._on = on; el.inert = !on; el.classList.toggle('is-on', on); }
      el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
    });
    const sIdx = p < 0.2 ? 0 : p < 0.45 ? 1 : p < 0.75 ? 2 : 3;
    if (sIdx !== lastScene) { lastScene = sIdx; chapNum.textContent = `0${sIdx + 1}`; chapName.textContent = chapNames[sIdx]; }
    chapBar.style.transform = `scaleX(${p.toFixed(4)})`;
    hint.style.opacity = (1 - ss(0.01, 0.05, p)).toFixed(3);
    veil.style.opacity = (ss(0.73, 0.762, p) * (1 - ss(0.768, 0.805, p)) * 0.9).toFixed(3);

    // component labels with leader lines
    const lo = ss(0.3, 0.335, p) * (1 - ss(0.425, 0.455, p));
    labelLayer.style.opacity = leaders.style.opacity = lo.toFixed(3);
    labelLayer.style.visibility = leaders.style.visibility = lo < 0.01 ? 'hidden' : 'visible';
    if (lo >= 0.01) {
      camera.updateMatrixWorld();
      const k = W < 768 ? 0.42 : W < 1100 ? 0.7 : 1;
      const placed = [];
      for (const L of labels) {
        if (!L.el.offsetParent) continue;
        L.anchor.getWorldPosition(v).project(camera);
        L.ax = (v.x * 0.5 + 0.5) * W; L.ay = (-v.y * 0.5 + 0.5) * H;
        L.lw = L.el.offsetWidth; L.lh = L.el.offsetHeight; L.right = L.dx > 0;
        L.lx = Math.min(W - 12 - (L.right ? L.lw : 0), Math.max(12 + (L.right ? 0 : L.lw), L.ax + L.dx * k));
        L.ly = L.ay + L.dy * k;
        placed.push(L);
      }
      // keep each side's labels from stacking on top of one another
      for (const side of [true, false]) {
        const col = placed.filter((L) => L.right === side).sort((a, b) => a.ly - b.ly);
        let floor = 84;
        for (const L of col) { L.ly = Math.max(L.ly, floor + L.lh / 2); floor = L.ly + L.lh / 2 + 8; }
        let ceil = H - (W < 768 ? 300 : 84);
        for (const L of col.reverse()) { L.ly = Math.min(L.ly, ceil - L.lh / 2); ceil = L.ly - L.lh / 2 - 8; }
      }
      for (const L of placed) {
        L.el.style.transform = `translate3d(${(L.right ? L.lx : L.lx - L.lw).toFixed(1)}px,${(L.ly - L.lh / 2).toFixed(1)}px,0)`;
        const elbow = L.right ? L.lx - 14 : L.lx + 14;
        L.path.setAttribute('d', `M${L.ax.toFixed(1)} ${L.ay.toFixed(1)} L${elbow.toFixed(1)} ${L.ly.toFixed(1)} L${L.lx.toFixed(1)} ${L.ly.toFixed(1)}`);
        L.dot.setAttribute('cx', L.ax.toFixed(1)); L.dot.setAttribute('cy', L.ay.toFixed(1));
      }
    }
  }

  // --- loop: only runs while the hero is on screen ---
  let visible = true, raf = 0, last = performance.now(), frames = 0;
  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    cur += (target - cur) * (1 - Math.exp(-dt * 7));
    if (Math.abs(target - cur) < 0.00005) cur = target;
    world.tick(forced !== null ? 0.4 : dt);
    apply(cur);
    if (composer) composer.render(); else renderer.render(scene, camera);
    if (++frames === 3) { root.classList.add('hero-live'); window.__heroReady = true; }
    if (visible) raf = requestAnimationFrame(frame);
  }
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }).observe(hero);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } });
  raf = requestAnimationFrame(frame);

  canvas.addEventListener('webglcontextlost', () => { visible = false; toStatic(); });
  if (forced !== null) root.classList.add('hero-still');
  window.__hero = { set: (p) => { target = cur = p; } };
}
