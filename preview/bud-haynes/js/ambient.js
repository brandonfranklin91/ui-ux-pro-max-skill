// Bud Haynes — ambient 3D background behind everything below the hero.
// Airflow trails and dust drift through depth, two large fan guards turn
// slowly, and the whole field parallaxes with scroll and pointer. It is
// decorative only: pointer-events off, hidden from assistive tech, and not
// started at all for visitors who prefer reduced motion.
import * as THREE from 'three';
import { VANILLA } from './kit.js';

const canvas = document.querySelector('.ambient');
const hero = document.querySelector('.hero');
const still = new URLSearchParams(location.search).has('p');
if (canvas && !still && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  try { start(); } catch (err) { console.error(err); canvas.remove(); }
}

function start() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 60);
  camera.position.set(0, 0, 10);
  const small = matchMedia('(max-width: 767px)').matches;
  const rnd = (() => { let a = 2024; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; })();
  const uniforms = { uTime: { value: 0 }, uScroll: { value: 0 }, uColor: { value: new THREE.Color(VANILLA) }, uPx: { value: 1 } };

  // shared: where a seed sits in the field, wrapped vertically so scrolling never runs out
  const field = `
    uniform float uTime, uScroll;
    float depthOf(float w) { return mix(-14.0, 3.5, w); }
    float wrapY(float y0, float depth) { return mod(y0 + uScroll * mix(0.35, 1.7, depth) + 11.0, 22.0) - 11.0; }`;

  // --- airflow trails ---
  const N = small ? 70 : 150, K = 22;
  const seed = new Float32Array(N * K * 2 * 4), seed2 = new Float32Array(N * K * 2 * 2), at = new Float32Array(N * K * 2);
  for (let i = 0, v = 0; i < N; i++) {
    const s = [rnd(), rnd(), rnd(), rnd()], s2 = [rnd(), rnd()];
    for (let k = 0; k < K; k++) for (let e = 0; e < 2; e++, v++) { seed.set(s, v * 4); seed2.set(s2, v * 2); at[v] = (k + e) / K; }
  }
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * K * 2 * 3), 3));
  tg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  tg.setAttribute('aSeed2', new THREE.BufferAttribute(seed2, 2));
  tg.setAttribute('aT', new THREE.BufferAttribute(at, 1));
  const trails = new THREE.LineSegments(tg, new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `${field}
      attribute vec4 aSeed; attribute vec2 aSeed2; attribute float aT; varying float vA;
      void main() {
        float head = fract(aSeed.z + uTime * mix(0.018, 0.05, aSeed.x));
        float u = head * 1.2 - aT * mix(0.07, 0.2, aSeed.y);
        float z = depthOf(aSeed.w), depth = aSeed.w, ph = aSeed2.y * 6.283;
        float x = mix(-19.0, 19.0, u);
        float y = wrapY(mix(-11.0, 11.0, aSeed2.x), depth) + 0.9 * sin(x * 0.33 + ph + uTime * 0.16) + 0.3 * sin(x * 0.9 + ph * 2.0);
        z += 1.3 * cos(x * 0.28 + ph + uTime * 0.11);
        vA = (1.0 - aT) * smoothstep(0.0, 0.1, u) * (1.0 - smoothstep(0.92, 1.05, u)) * mix(0.35, 1.0, depth);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(x, y, z, 1.0);
      }`,
    fragmentShader: `uniform vec3 uColor; varying float vA; void main() { gl_FragColor = vec4(uColor, vA * 0.95); }`,
  }));
  trails.frustumCulled = false; scene.add(trails);

  // --- dust motes ---
  const M = small ? 180 : 420, ms = new Float32Array(M * 4);
  for (let i = 0; i < M * 4; i++) ms[i] = rnd();
  const mg = new THREE.BufferGeometry();
  mg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(M * 3), 3));
  mg.setAttribute('aSeed', new THREE.BufferAttribute(ms, 4));
  const motes = new THREE.Points(mg, new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `${field}
      uniform float uPx; attribute vec4 aSeed; varying float vA;
      void main() {
        float depth = aSeed.w, z = depthOf(depth), ph = aSeed.z * 6.283;
        float x = mod(mix(-19.0, 19.0, aSeed.x) + uTime * mix(0.05, 0.3, depth) + 19.0, 38.0) - 19.0;
        float y = wrapY(mix(-11.0, 11.0, aSeed.y), depth) + 0.4 * sin(uTime * 0.2 + ph);
        vec4 mv = modelViewMatrix * vec4(x, y, z + 0.6 * cos(uTime * 0.17 + ph), 1.0);
        vA = mix(0.25, 0.9, depth) * (0.6 + 0.4 * sin(uTime * 0.6 + ph));
        gl_PointSize = uPx * mix(14.0, 44.0, aSeed.z) / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform vec3 uColor; varying float vA;
      void main() { float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(uColor, vA * smoothstep(0.5, 0.05, d)); }`,
  }));
  motes.frustumCulled = false; scene.add(motes);

  // --- slow-turning fan guards ---
  function guard(radius, rings, spokes, opacity) {
    const v = [];
    for (let r = 1; r <= rings; r++) {
      const rad = (radius * r) / rings;
      for (let i = 0; i < 96; i++) { const a = (i / 96) * 6.2832, b = ((i + 1) / 96) * 6.2832; v.push(Math.cos(a) * rad, Math.sin(a) * rad, 0, Math.cos(b) * rad, Math.sin(b) * rad, 0); }
    }
    for (let i = 0; i < spokes; i++) { const a = (i / spokes) * 6.2832; v.push(Math.cos(a) * radius * 0.12, Math.sin(a) * radius * 0.12, 0, Math.cos(a) * radius, Math.sin(a) * radius, 0); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    const spin = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: VANILLA, transparent: true, opacity, depthWrite: false }));
    const tilt = new THREE.Group(); tilt.add(spin); scene.add(tilt);
    return { tilt, spin };
  }
  const g1 = guard(6.2, 9, 16, 0.3); g1.tilt.position.set(8.5, 1.5, -7); g1.tilt.rotation.set(-0.5, -0.75, 0.1);
  const g2 = guard(4.2, 7, 12, 0.22); g2.tilt.position.set(-10, -5, -11); g2.tilt.rotation.set(0.6, 0.7, 0);

  function resize() {
    const w = innerWidth, h = innerHeight, dpr = Math.min(devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = w < h ? 68 : 50; camera.updateProjectionMatrix();
    uniforms.uPx.value = dpr * h / 900;
    if (small) { g1.tilt.position.x = 3.5; g2.tilt.position.x = -4.5; }
  }
  addEventListener('resize', resize); resize();

  let px = 0, py = 0;
  addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5; } }, { passive: true });

  // Only render once the hero has started to leave the screen, and never in a hidden tab.
  let raf = 0, last = 0, t = 0, scroll = scrollY, shown = false;
  const wanted = () => !document.hidden && (!hero || hero.getBoundingClientRect().bottom < innerHeight * 1.5);
  function frame(now) {
    raf = 0;
    if (!wanted()) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now; t += dt;
    scroll += (scrollY - scroll) * (1 - Math.exp(-dt * 6));
    uniforms.uTime.value = t; uniforms.uScroll.value = scroll * 0.004;
    g1.spin.rotation.z = t * 0.07 + scroll * 0.0006; g2.spin.rotation.z = -t * 0.05 - scroll * 0.0005;
    g1.tilt.position.y = 1.5 + Math.sin(scroll * 0.0009) * 2.2; g2.tilt.position.y = -5 + Math.cos(scroll * 0.0007) * 2.5;
    camera.position.x += (px * 1.4 - camera.position.x) * 0.04; camera.position.y += (-py * 0.9 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, -4);
    renderer.render(scene, camera);
    if (!shown) { shown = true; canvas.classList.add('is-on'); }
    raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf && wanted()) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  addEventListener('scroll', kick, { passive: true });
  document.addEventListener('visibilitychange', kick);
  canvas.addEventListener('webglcontextlost', () => canvas.remove());
  kick();
}
