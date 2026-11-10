// Bud Haynes — procedural model kit.
// Everything the hero and the equipment stills are made of is built here from
// primitives and canvas textures, so the site ships no third-party imagery.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const VANILLA = 0xeeebda;
export const INDIGO = 0x282b4a;
export const INDIGO_DEEP = 0x14162a;
export const INDIGO_GLOW = 0x5b62b8;

/* ---------- deterministic random + canvas textures ---------- */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvasTex(w, h, draw, { repeat, srgb = true, wrap = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  return t;
}

// Speckle the canvas with light/dark grain. `amt` is the max 0-255 deviation.
export function grain(ctx, w, h, amt, seed = 7, cell = 1) {
  const r = rng(seed);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let y = 0; y < h; y += cell) {
    for (let x = 0; x < w; x += cell) {
      const n = (r() - 0.5) * 2 * amt;
      for (let yy = y; yy < Math.min(h, y + cell); yy++) {
        for (let xx = x; xx < Math.min(w, x + cell); xx++) {
          const i = (yy * w + xx) * 4;
          d[i] += n; d[i + 1] += n; d[i + 2] += n;
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

function blotches(ctx, w, h, n, color, rmin, rmax, seed) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, rad = rmin + r() * (rmax - rmin);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
}

export const tex = {
  louver(base = '#75706a') {
    const draw = (bump) => (ctx, w, h) => {
      ctx.fillStyle = bump ? '#808080' : base; ctx.fillRect(0, 0, w, h);
      const p = w / 30;
      for (let i = 0; i < 30; i++) {
        const x = i * p;
        const g = ctx.createLinearGradient(x, 0, x + p, 0);
        if (bump) {
          g.addColorStop(0, '#000'); g.addColorStop(0.3, '#000'); g.addColorStop(0.36, '#fff');
          g.addColorStop(0.9, '#999'); g.addColorStop(1, '#000');
        } else {
          g.addColorStop(0, '#0b0b0d'); g.addColorStop(0.3, '#0d0d10'); g.addColorStop(0.36, 'rgba(255,255,255,.22)');
          g.addColorStop(0.6, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.5)');
        }
        ctx.fillStyle = g; ctx.fillRect(x, 0, p, h);
      }
      // horizontal stiffening bands
      ctx.fillStyle = bump ? '#b0b0b0' : base;
      [0.0, 0.325, 0.66, 0.975].forEach((v) => ctx.fillRect(0, v * h, w, h * 0.025));
      if (!bump) {
        ctx.fillStyle = 'rgba(0,0,0,.25)';
        [0.025, 0.35, 0.685].forEach((v) => ctx.fillRect(0, v * h, w, 2));
        grain(ctx, w, h, 7, 3);
      }
    };
    return { map: canvasTex(512, 512, draw(false)), bump: canvasTex(512, 512, draw(true), { srgb: false }) };
  },
  fins() {
    return canvasTex(256, 64, (ctx, w, h) => {
      ctx.fillStyle = '#8f9399'; ctx.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 4) { ctx.fillStyle = '#3c4046'; ctx.fillRect(x, 0, 1.5, h); }
    }, { repeat: [6, 1] });
  },
  stucco() {
    return canvasTex(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#9b999d'; ctx.fillRect(0, 0, w, h);
      blotches(ctx, w, h, 30, 'rgba(90,84,78,.045)', 60, 160, 11);
      grain(ctx, w, h, 12, 5); grain(ctx, w, h, 8, 9, 3);
    }, { repeat: [4, 2] });
  },
  concrete() {
    return canvasTex(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#8b8a86'; ctx.fillRect(0, 0, w, h);
      blotches(ctx, w, h, 60, 'rgba(40,40,44,.12)', 20, 110, 21);
      blotches(ctx, w, h, 30, 'rgba(255,255,255,.07)', 20, 90, 22);
      grain(ctx, w, h, 16, 6);
    });
  },
  ground() {
    return canvasTex(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#222b20'; ctx.fillRect(0, 0, w, h);
      const r = rng(31);
      for (let i = 0; i < 9000; i++) {
        const g = 30 + r() * 36;
        ctx.strokeStyle = `rgba(${g * 0.75},${g},${g * 0.5},.55)`;
        const x = r() * w, y = r() * h;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 5, y - 3 - r() * 6); ctx.stroke();
      }
      grain(ctx, w, h, 10, 4);
    }, { repeat: [14, 14] });
  },
  gravel() {
    return canvasTex(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#403e3b'; ctx.fillRect(0, 0, w, h);
      const r = rng(41);
      for (let i = 0; i < 2600; i++) {
        const g = 50 + r() * 70;
        ctx.fillStyle = `rgb(${g},${g * 0.97},${g * 0.92})`;
        ctx.beginPath(); ctx.ellipse(r() * w, r() * h, 3 + r() * 6, 2 + r() * 4, r() * 3, 0, 7); ctx.fill();
      }
      grain(ctx, w, h, 10, 8);
    }, { repeat: [16, 3] });
  },
  hedge() {
    return canvasTex(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#1f2c1c'; ctx.fillRect(0, 0, w, h);
      const r = rng(51);
      for (let i = 0; i < 2600; i++) {
        const g = 45 + r() * 70;
        ctx.fillStyle = `rgba(${g * 0.6},${g},${g * 0.45},.8)`;
        ctx.beginPath(); ctx.ellipse(r() * w, r() * h, 2 + r() * 4, 1 + r() * 2.5, r() * 3, 0, 7); ctx.fill();
      }
    }, { repeat: [3, 1.5] });
  },
  planks(a = '#8d6a49', b = '#755539') {
    return canvasTex(1024, 1024, (ctx, w, h) => {
      const r = rng(61);
      const rows = 12, ph = h / rows;
      for (let i = 0; i < rows; i++) {
        const t = r();
        ctx.fillStyle = t < 0.5 ? a : b; ctx.globalAlpha = 1;
        ctx.fillRect(0, i * ph, w, ph);
        ctx.fillStyle = t < 0.5 ? b : a; ctx.globalAlpha = 0.35 * r();
        ctx.fillRect(0, i * ph, w, ph); ctx.globalAlpha = 1;
        for (let k = 0; k < 26; k++) {
          ctx.strokeStyle = `rgba(60,38,20,${0.05 + r() * 0.12})`; ctx.lineWidth = 0.6 + r() * 1.4;
          const y = i * ph + r() * ph; ctx.beginPath(); ctx.moveTo(0, y);
          ctx.bezierCurveTo(w * 0.3, y + (r() - 0.5) * 8, w * 0.6, y + (r() - 0.5) * 8, w, y + (r() - 0.5) * 6); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(30,18,8,.6)'; ctx.fillRect(0, i * ph, w, 2);
        const off = r() * w; ctx.fillRect(off, i * ph, 2, ph); ctx.fillRect((off + w * 0.55) % w, i * ph, 2, ph);
      }
      grain(ctx, w, h, 6, 12);
    }, { repeat: [2.2, 2.6] });
  },
  slats() {
    return canvasTex(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#17100b'; ctx.fillRect(0, 0, w, h);
      const r = rng(71); const n = 16, p = w / n;
      for (let i = 0; i < n; i++) {
        const g = ctx.createLinearGradient(i * p, 0, i * p + p * 0.74, 0);
        const k = 0.85 + r() * 0.3;
        g.addColorStop(0, `rgb(${96 * k},${62 * k},${40 * k})`); g.addColorStop(0.5, `rgb(${122 * k},${80 * k},${52 * k})`); g.addColorStop(1, `rgb(${70 * k},${44 * k},${28 * k})`);
        ctx.fillStyle = g; ctx.fillRect(i * p, 0, p * 0.74, h);
        for (let s = 0; s < 5; s++) { ctx.fillStyle = `rgba(40,22,10,${0.1 + r() * 0.15})`; ctx.fillRect(i * p + r() * p * 0.7, 0, 1, h); }
      }
    }, { repeat: [5, 1] });
  },
  fabric(base = '#d6cdb8') {
    return canvasTex(256, 256, (ctx, w, h) => {
      ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
      const r = rng(81);
      for (let i = 0; i < 5000; i++) {
        ctx.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.16)' : 'rgba(90,80,60,.10)';
        ctx.beginPath(); ctx.arc(r() * w, r() * h, 0.8 + r() * 1.8, 0, 7); ctx.fill();
      }
    }, { repeat: [3, 3] });
  },
  rug() {
    return canvasTex(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#b9b09b'; ctx.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 6) { ctx.fillStyle = y % 12 ? 'rgba(255,255,255,.10)' : 'rgba(80,70,50,.08)'; ctx.fillRect(0, y, w, 3); }
      ctx.strokeStyle = 'rgba(40,43,74,.35)'; ctx.lineWidth = 5; ctx.strokeRect(26, 26, w - 52, h - 52);
      grain(ctx, w, h, 9, 14);
    }, { wrap: false });
  },
  // Warm interior seen through the exterior windows.
  windowGlow(seed = 1) {
    return canvasTex(256, 512, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#ffcf8a'); g.addColorStop(0.55, '#f2a758'); g.addColorStop(1, '#8a4f24');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      const r = rng(seed);
      const lx = w * (0.3 + r() * 0.4), ly = h * (0.3 + r() * 0.2);
      const l = ctx.createRadialGradient(lx, ly, 0, lx, ly, w * 0.6);
      l.addColorStop(0, 'rgba(255,244,214,.95)'); l.addColorStop(1, 'rgba(255,220,160,0)');
      ctx.fillStyle = l; ctx.fillRect(0, 0, w, h);
      // sheer curtain folds
      for (let x = 0; x < w * 0.34; x += 7) { ctx.fillStyle = `rgba(120,70,30,${0.10 + 0.1 * Math.sin(x)})`; ctx.fillRect(x, 0, 3, h); }
      ctx.fillStyle = 'rgba(60,32,14,.55)'; ctx.fillRect(w * 0.55, h * 0.72, w * 0.4, h * 0.28); // furniture silhouette
    }, { wrap: false });
  },
  sky() {
    return canvasTex(1024, 512, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#11142e'); g.addColorStop(0.3, '#232857'); g.addColorStop(0.43, '#4f4a7c');
      g.addColorStop(0.5, '#b97f70'); g.addColorStop(0.535, '#f0b47c'); g.addColorStop(0.57, '#4a3f5c'); g.addColorStop(1, '#2a2740');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      const s = ctx.createRadialGradient(w * 0.32, h * 0.53, 0, w * 0.32, h * 0.53, w * 0.22);
      s.addColorStop(0, 'rgba(255,214,150,.9)'); s.addColorStop(1, 'rgba(255,190,120,0)');
      ctx.fillStyle = s; ctx.fillRect(0, 0, w, h);
      const r = rng(91);
      for (let i = 0; i < 14; i++) { // soft cloud streaks
        const x = r() * w, y = h * (0.36 + r() * 0.14), cw = 80 + r() * 220;
        const c = ctx.createRadialGradient(x, y, 0, x, y, cw);
        c.addColorStop(0, 'rgba(255,200,170,.16)'); c.addColorStop(1, 'rgba(255,200,170,0)');
        ctx.save(); ctx.translate(0, y); ctx.scale(1, 0.14); ctx.translate(0, -y); ctx.fillStyle = c; ctx.fillRect(x - cw, y - cw, cw * 2, cw * 2); ctx.restore();
      }
      for (let i = 0; i < 90; i++) { ctx.fillStyle = `rgba(238,235,218,${r() * 0.7})`; ctx.fillRect(r() * w, r() * h * 0.36, 1.3, 1.3); }
    }, { wrap: false });
  },
  // Evening garden seen through the living-room windows.
  evening() {
    return canvasTex(1024, 512, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#1b1f45'); g.addColorStop(0.45, '#3a4180'); g.addColorStop(0.66, '#8f6f8a'); g.addColorStop(0.76, '#e0a070'); g.addColorStop(0.8, '#1a1d2e'); g.addColorStop(1, '#0d0f1a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      const r = rng(101);
      for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(238,235,218,${r() * 0.8})`; ctx.fillRect(r() * w, r() * h * 0.4, 1.5, 1.5); }
      ctx.fillStyle = '#0b0d18';
      for (let i = 0; i < 22; i++) { // tree line
        const x = r() * w, rad = 30 + r() * 70, y = h * 0.78 - rad * 0.5;
        for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.arc(x + (r() - 0.5) * rad * 1.6, y + (r() - 0.5) * rad, rad * (0.35 + r() * 0.4), 0, 7); ctx.fill(); }
        ctx.fillRect(x - 3, y, 6, h * 0.8 - y);
      }
      for (let i = 0; i < 9; i++) { // garden lights
        const x = r() * w, y = h * (0.8 + r() * 0.1);
        const l = ctx.createRadialGradient(x, y, 0, x, y, 26); l.addColorStop(0, 'rgba(255,206,140,.9)'); l.addColorStop(1, 'rgba(255,190,120,0)');
        ctx.fillStyle = l; ctx.fillRect(x - 26, y - 26, 52, 52);
      }
    }, { wrap: false });
  },
  pcb() {
    return canvasTex(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#1b1e3a'; ctx.fillRect(0, 0, w, h);
      const r = rng(111); ctx.strokeStyle = '#eeebda'; ctx.fillStyle = '#eeebda'; ctx.lineWidth = 2;
      for (let i = 0; i < 26; i++) {
        let x = 16 + Math.floor(r() * 14) * 16, y = 16 + Math.floor(r() * 14) * 16;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let k = 0; k < 3; k++) { if (r() < 0.5) x += (r() < 0.5 ? -1 : 1) * 32; else y += (r() < 0.5 ? -1 : 1) * 32; ctx.lineTo(x, y); }
        ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fill();
      }
      for (let i = 0; i < 7; i++) ctx.strokeRect(20 + r() * 180, 20 + r() * 180, 20 + r() * 26, 14 + r() * 20);
    }, { wrap: false });
  },
  filter(dirty) {
    return canvasTex(512, 512, (ctx, w, h) => {
      ctx.fillStyle = dirty ? '#8d8474' : '#f4f2ea'; ctx.fillRect(0, 0, w, h);
      if (dirty) {
        blotches(ctx, w, h, 90, 'rgba(52,44,36,.5)', 14, 90, 121);
        blotches(ctx, w, h, 50, 'rgba(160,150,132,.4)', 10, 50, 122);
        const r = rng(123);
        for (let i = 0; i < 900; i++) { // lint and fibres
          ctx.strokeStyle = `rgba(${40 + r() * 40},${36 + r() * 34},${30 + r() * 30},${0.25 + r() * 0.4})`; ctx.lineWidth = 0.6 + r() * 1.6;
          const x = r() * w, y = r() * h; ctx.beginPath(); ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x + (r() - 0.5) * 30, y + (r() - 0.5) * 30, x + (r() - 0.5) * 40, y + (r() - 0.5) * 40); ctx.stroke();
        }
        grain(ctx, w, h, 26, 124, 2);
      } else grain(ctx, w, h, 5, 125);
    }, { wrap: false });
  },
};

/* ---------- "technical view" material registry ---------- */
// Solids registered with ghost() fade toward a faint indigo-lit shell; lines
// registered with line() fade in. One set() call drives the whole look.
export class TechSet {
  constructor() { this.mats = []; this.lines = []; this.value = -1; }
  ghost(mat, min = 0.1, glow = 0.3) {
    // Always "transparent" so the fade never forces a shader recompile mid-scroll.
    mat.transparent = true;
    mat.userData.ghostMin = min; mat.userData.glow = glow;
    mat.userData.em0 = mat.emissive ? mat.emissive.clone() : null;
    mat.userData.emI0 = mat.emissiveIntensity ?? 0;
    this.mats.push(mat); return mat;
  }
  line(max = 0.9, color = VANILLA) {
    const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false });
    m.userData.max = max; this.lines.push(m); return m;
  }
  set(t) {
    if (Math.abs(t - this.value) < 0.0005) return;
    this.value = t;
    const glow = new THREE.Color(INDIGO_GLOW);
    for (const m of this.mats) {
      m.opacity = THREE.MathUtils.lerp(1, m.userData.ghostMin, t);
      m.depthWrite = t < 0.5;
      if (m.userData.em0) {
        m.emissive.copy(m.userData.em0).lerp(glow, t);
        m.emissiveIntensity = THREE.MathUtils.lerp(m.userData.emI0, m.userData.glow, t);
      }
    }
    for (const l of this.lines) { l.opacity = l.userData.max * t; l.visible = t > 0.002; }
  }
}

export function addEdges(mesh, lineMat, angle = 28) {
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, angle), lineMat);
  e.raycast = () => {};
  mesh.add(e); return e;
}

function std(color, o = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.2, ...o }); }
function mesh(geo, mat, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = shadow; return m;
}
function tube(points, r, mat, seg = 40) {
  const c = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.4);
  const m = new THREE.Mesh(new THREE.TubeGeometry(c, seg, r, 8), mat); m.castShadow = true; return m;
}
function roundedSquare(half, r, y, seg = 5) {
  const pts = [];
  const corners = [[1, 1, 0], [-1, 1, Math.PI / 2], [-1, -1, Math.PI], [1, -1, Math.PI * 1.5]];
  for (const [sx, sz, a0] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * Math.PI / 2;
      pts.push(new THREE.Vector3(sx * (half - r) + Math.cos(a) * r, y, sz * (half - r) + Math.sin(a) * r));
    }
  }
  return pts;
}
function loopSegments(loops) {
  const v = [];
  for (const pts of loops) for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; v.push(a.x, a.y, a.z, b.x, b.y, b.z); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); return g;
}
function segGeo(v) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); return g; }

// Round fan guard: concentric rings + spokes, lying in the XZ plane.
function fanGuard(radius, mat, rings = 7, spokes = 10) {
  const g = new THREE.Group();
  for (let i = 1; i <= rings; i++) {
    const t = mesh(new THREE.TorusGeometry((radius * i) / rings, 0.0035, 6, 56), mat); t.rotation.x = Math.PI / 2; g.add(t);
  }
  for (let i = 0; i < spokes; i++) {
    const s = mesh(new THREE.CylinderGeometry(0.004, 0.004, radius, 5), mat);
    const a = (i / spokes) * Math.PI * 2; s.rotation.z = Math.PI / 2; s.rotation.y = a;
    s.position.set(Math.cos(a) * radius / 2, 0.004, -Math.sin(a) * radius / 2); g.add(s);
  }
  g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 24), mat, 0, 0.004, 0));
  return g;
}
function fanBlades(radius, mat, n = 3) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 20), mat));
  for (let i = 0; i < n; i++) {
    const arm = new THREE.Group(); arm.rotation.y = (i / n) * Math.PI * 2;
    const shape = new THREE.Shape();
    shape.moveTo(0.04, -0.02); shape.quadraticCurveTo(radius * 0.7, -0.11, radius, -0.05);
    shape.quadraticCurveTo(radius * 1.02, 0.05, radius * 0.75, 0.085); shape.quadraticCurveTo(radius * 0.4, 0.07, 0.04, 0.02);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.004, bevelEnabled: false, curveSegments: 10 });
    geo.rotateX(-Math.PI / 2);
    const b = mesh(geo, mat); b.rotation.x = 0.36; arm.add(b); g.add(arm);
  }
  return g;
}

/* ---------- outdoor condenser (the hero unit) ---------- */
export function makeCondenser(tech = new TechSet()) {
  const root = new THREE.Group();
  const line = tech.line(0.85);
  const fine = tech.line(0.2);
  const coilLine = tech.line(0.7);
  const lv = tex.louver();
  const mCase = tech.ghost(std(0x6f6a63, { metalness: 0.65, roughness: 0.42 }), 0.05);
  const mLouver = tech.ghost(std(0xffffff, { map: lv.map, bumpMap: lv.bump, bumpScale: 2.2, metalness: 0.6, roughness: 0.48 }), 0.03);
  const mDark = tech.ghost(std(0x1a1b1f, { metalness: 0.5, roughness: 0.5 }), 0.22);
  const mBlack = tech.ghost(std(0x101114, { metalness: 0.35, roughness: 0.38 }), 0.92, 0.5);
  const mBlade = tech.ghost(std(0x1a1b1f, { metalness: 0.5, roughness: 0.5 }), 0.3, 0.5);
  const mGuard = tech.ghost(std(0x1a1b1f, { metalness: 0.5, roughness: 0.5 }), 0.95, 1.6);
  const mCopper = tech.ghost(std(0xb87348, { metalness: 0.9, roughness: 0.3 }), 0.9, 0.5);
  const mFin = tech.ghost(std(0xffffff, { map: tex.fins(), metalness: 0.7, roughness: 0.5 }), 0.035);
  const mPcb = tech.ghost(std(0xffffff, { map: tex.pcb(), roughness: 0.6, metalness: 0.1, emissiveMap: tex.pcb(), emissive: 0x000000 }), 0.95, 1.4);

  const H = 0.82, half = 0.43;
  // base pan + feet
  const pan = mesh(new THREE.BoxGeometry(0.9, 0.035, 0.9), mDark, 0, 0.0175, 0); addEdges(pan, line); root.add(pan);
  // corner posts
  for (const [sx, sz] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
    const p = mesh(new THREE.BoxGeometry(0.05, H - 0.035, 0.05), mCase, sx * (half - 0.012), 0.035 + (H - 0.035) / 2, sz * (half - 0.012));
    addEdges(p, line); root.add(p);
  }
  // louvered panels (slide outward a touch when exploded)
  const panels = [];
  const slat = [];
  for (let i = 0; i <= 26; i++) { const x = -0.38 + (0.76 * i) / 26; slat.push(x, -0.37, 0, x, 0.37, 0); }
  for (const y of [-0.37, -0.12, 0.13, 0.37]) slat.push(-0.38, y, 0, 0.38, y, 0);
  const slatGeo = segGeo(slat);
  for (let i = 0; i < 4; i++) {
    const holder = new THREE.Group(); holder.rotation.y = (i * Math.PI) / 2;
    const p = mesh(new THREE.BoxGeometry(0.77, 0.75, 0.012), mLouver, 0, 0.035 + 0.385, half - 0.004);
    p.add(new THREE.LineSegments(slatGeo, fine)); addEdges(p, line);
    holder.add(p); root.add(holder); panels.push(p);
  }
  // condenser coil: finned walls + copper tube loops
  const coil = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const w = mesh(new THREE.BoxGeometry(0.72, 0.7, 0.03), mFin, 0, 0.41, 0.375, false);
    const h = new THREE.Group(); h.rotation.y = (i * Math.PI) / 2; h.add(w); coil.add(h);
  }
  const loops = [];
  for (let i = 0; i < 20; i++) loops.push(roundedSquare(0.385, 0.07, 0.085 + i * 0.034));
  coil.add(new THREE.LineSegments(loopSegments(loops), coilLine));
  root.add(coil);
  // compressor, accumulator, tubing
  const comp = new THREE.Group(); comp.position.set(-0.07, 0.035, 0.04);
  const body = mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.34, 28), mBlack, 0, 0.17, 0); addEdges(body, line, 60);
  const dome = mesh(new THREE.SphereGeometry(0.105, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), mBlack, 0, 0.34, 0); dome.scale.y = 0.55;
  const term = mesh(new THREE.BoxGeometry(0.07, 0.07, 0.04), mDark, 0, 0.22, 0.115); addEdges(term, line);
  const ring = mesh(new THREE.TorusGeometry(0.106, 0.006, 6, 40), mDark, 0, 0.04, 0); ring.rotation.x = Math.PI / 2;
  comp.add(body, dome, term, ring);
  const acc = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.27, 20), mBlack, -0.17, 0.135, -0.03); addEdges(acc, line, 60);
  const accTop = mesh(new THREE.SphereGeometry(0.045, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mBlack, -0.17, 0.27, -0.03);
  comp.add(acc, accTop);
  comp.add(tube([[0, 0.4, 0], [0.0, 0.5, 0.0], [0.1, 0.56, -0.1], [0.3, 0.52, -0.28], [0.36, 0.3, -0.34]], 0.011, mCopper));
  comp.add(tube([[-0.17, 0.29, -0.03], [-0.17, 0.36, -0.03], [-0.1, 0.4, 0.06], [-0.02, 0.33, 0.1]], 0.009, mCopper));
  comp.add(tube([[0.09, 0.1, 0.05], [0.2, 0.1, 0.0], [0.34, 0.12, -0.2], [0.4, 0.14, -0.34]], 0.008, mCopper));
  root.add(comp);
  // control box with board + capacitor
  const ctrl = new THREE.Group(); ctrl.position.set(0.19, 0.3, 0.31);
  const cb = mesh(new THREE.BoxGeometry(0.24, 0.3, 0.06), mDark, 0, 0.15, 0); addEdges(cb, line);
  const board = mesh(new THREE.PlaneGeometry(0.2, 0.26), mPcb, 0, 0.15, -0.032, false); board.rotation.y = Math.PI;
  const board2 = mesh(new THREE.PlaneGeometry(0.2, 0.26), mPcb, 0, 0.15, 0.032, false);
  const cap = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 16), std(0xb9bcc2, { metalness: 0.9, roughness: 0.25 }), -0.2, 0.08, -0.03);
  tech.ghost(cap.material, 0.5); addEdges(cap, line, 60);
  ctrl.add(cb, board, board2, cap); root.add(ctrl);
  // service valves on the wall-side corner
  const valves = new THREE.Group(); valves.position.set(0.33, 0.16, -0.445);
  valves.add(mesh(new THREE.BoxGeometry(0.16, 0.2, 0.02), mCase, 0, 0.03, 0.012));
  for (const [x, y, r] of [[-0.03, 0.07, 0.016], [0.03, 0.0, 0.011]]) {
    const v = mesh(new THREE.CylinderGeometry(r, r, 0.06, 12), mCopper, x, y, -0.02); v.rotation.x = Math.PI / 2; valves.add(v);
  }
  root.add(valves);

  // fan + motor (lifts on explode)
  const fan = new THREE.Group(); fan.position.y = 0.7;
  const motor = mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.13, 20), mBlack, 0, -0.03, 0); addEdges(motor, line, 60);
  const blades = fanBlades(0.3, mBlade); blades.position.y = 0.06;
  blades.traverse((o) => { if (o.isMesh && o.geometry.type === 'ExtrudeGeometry') addEdges(o, line, 40); });
  fan.add(motor, blades); root.add(fan);

  // top panel with guard (lifts further)
  const top = new THREE.Group(); top.position.y = H;
  const s = new THREE.Shape(); const R = 0.45, rr = 0.05;
  s.moveTo(-R + rr, -R); s.lineTo(R - rr, -R); s.quadraticCurveTo(R, -R, R, -R + rr); s.lineTo(R, R - rr); s.quadraticCurveTo(R, R, R - rr, R);
  s.lineTo(-R + rr, R); s.quadraticCurveTo(-R, R, -R, R - rr); s.lineTo(-R, -R + rr); s.quadraticCurveTo(-R, -R, -R + rr, -R);
  const hole = new THREE.Path(); hole.absarc(0, 0, 0.345, 0, Math.PI * 2, true); s.holes.push(hole);
  const tg = new THREE.ExtrudeGeometry(s, { depth: 0.045, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2, curveSegments: 40 });
  tg.rotateX(-Math.PI / 2);
  const lid = mesh(tg, mCase); addEdges(lid, line, 40);
  const guard = fanGuard(0.345, mGuard); guard.position.y = 0.05;
  top.add(lid, guard); root.add(top);

  // dashed guides between body and lifted parts
  const guideMat = new THREE.LineDashedMaterial({ color: VANILLA, dashSize: 0.025, gapSize: 0.02, transparent: true, opacity: 0, depthWrite: false });
  const gv = [];
  for (const [sx, sz] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) gv.push(sx * half, H, sz * half, sx * half, H + 1, sz * half);
  gv.push(0, 0.72, 0, 0, 0.72 + 1, 0);
  const guides = new THREE.LineSegments(segGeo(gv), guideMat); guides.computeLineDistances(); root.add(guides);

  // label anchors (children, so they follow the exploded parts)
  const anchor = (parent, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o; };
  const anchors = {
    guard: anchor(top, -0.2, 0.06, 0.22),
    fan: anchor(fan, 0.2, 0.07, 0.12),
    coil: anchor(root, 0.435, 0.66, 0.1),
    compressor: anchor(comp, -0.02, 0.3, 0.1),
    control: anchor(ctrl, 0.06, 0.2, 0.04),
    valves: anchor(valves, 0, 0.03, -0.03),
  };

  let explode = 0;
  return {
    group: root, tech, anchors, fan: blades,
    setExplode(e) {
      if (Math.abs(e - explode) < 0.0005 && e !== 0) return;
      explode = e;
      top.position.y = H + e * 0.4;
      fan.position.y = 0.7 + e * 0.2;
      for (const p of panels) p.position.z = half - 0.004 + e * 0.05;
      guides.scale.y = 1; guides.visible = e > 0.01;
      const pos = guides.geometry.attributes.position;
      for (let i = 0; i < 4; i++) pos.setY(i * 2 + 1, H + Math.max(0.001, e * 0.4));
      pos.setY(9, 0.72 + Math.max(0.001, e * 0.2 + 0.05));
      pos.needsUpdate = true; guides.computeLineDistances();
      guideMat.opacity = 0.7 * e;
    },
  };
}

/* ---------- indoor air handler / furnace cabinet ---------- */
export function makeAirHandler(tech = new TechSet()) {
  const root = new THREE.Group();
  const line = tech.line(0.85), coilLine = tech.line(1);
  const mCab = tech.ghost(std(0xc9cacb, { metalness: 0.55, roughness: 0.45 }), 0.05);
  const mDark = tech.ghost(std(0x2a2c33, { metalness: 0.5, roughness: 0.5 }), 0.3);
  const mCopper = tech.ghost(std(0xb87348, { metalness: 0.9, roughness: 0.3 }), 0.6);
  const mFin = tech.ghost(std(0xffffff, { map: tex.fins(), metalness: 0.7, roughness: 0.5 }), 0.12);
  const W = 0.56, D = 0.6;
  const base = mesh(new THREE.BoxGeometry(W + 0.02, 0.2, D + 0.02), mDark, 0, 0.1, 0); addEdges(base, line); root.add(base); // return/filter base
  const lower = mesh(new THREE.BoxGeometry(W, 0.62, D), mCab, 0, 0.2 + 0.31, 0); addEdges(lower, line); root.add(lower);
  const upper = mesh(new THREE.BoxGeometry(W, 0.6, D), mCab, 0, 0.82 + 0.3, 0); addEdges(upper, line); root.add(upper);
  // door seams, vents and handle recesses on the front (+z)
  const seam = std(0x5c5e63, { metalness: 0.4, roughness: 0.6 }); tech.ghost(seam, 0.1);
  root.add(mesh(new THREE.BoxGeometry(W - 0.02, 0.012, 0.004), seam, 0, 0.822, D / 2 + 0.001, false));
  for (let i = 0; i < 7; i++) root.add(mesh(new THREE.BoxGeometry(0.2, 0.008, 0.004), seam, 0.12, 0.32 + i * 0.022, D / 2 + 0.001, false));
  root.add(mesh(new THREE.BoxGeometry(0.09, 0.022, 0.006), seam, -0.16, 0.74, D / 2 + 0.001, false));
  root.add(mesh(new THREE.BoxGeometry(0.09, 0.022, 0.006), seam, -0.16, 1.34, D / 2 + 0.001, false));
  const glass = mesh(new THREE.CircleGeometry(0.022, 20), std(0x7fa0ff, { emissive: 0x7fa0ff, emissiveIntensity: 0.6 }), 0.17, 1.0, D / 2 + 0.002, false);
  tech.ghost(glass.material, 0.8); root.add(glass);
  // blower wheel
  const blower = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.3, 26, 1, true), mDark, 0, 0.5, 0); blower.rotation.z = Math.PI / 2; addEdges(blower, line, 10); root.add(blower);
  const scroll = mesh(new THREE.TorusGeometry(0.2, 0.012, 6, 30), mDark, 0.16, 0.5, 0); scroll.rotation.y = Math.PI / 2; root.add(scroll);
  const scroll2 = scroll.clone(); scroll2.position.x = -0.16; root.add(scroll2);
  // A-coil
  for (const s of [-1, 1]) {
    const slab = mesh(new THREE.BoxGeometry(0.035, 0.52, D - 0.1), mFin, s * 0.1, 1.11, 0, false); slab.rotation.z = s * 0.36; addEdges(slab, coilLine); root.add(slab);
    const v = [];
    for (let i = 0; i < 10; i++) { const y = -0.24 + i * 0.053; v.push(0, y, -(D - 0.1) / 2, 0, y, (D - 0.1) / 2); }
    slab.add(new THREE.LineSegments(segGeo(v), coilLine));
  }
  // supply plenum
  const plenum = mesh(new THREE.BoxGeometry(W - 0.04, 0.5, D - 0.04), mCab, 0, 1.42 + 0.25, 0); addEdges(plenum, line); root.add(plenum);
  // line set stubs + drain
  root.add(tube([[W / 2, 1.0, 0.2], [W / 2 + 0.07, 1.0, 0.2], [W / 2 + 0.1, 0.9, 0.24]], 0.012, mCopper, 12));
  root.add(tube([[W / 2, 0.94, 0.14], [W / 2 + 0.06, 0.94, 0.14], [W / 2 + 0.09, 0.85, 0.2]], 0.007, mCopper, 12));
  return { group: root, tech, top: 1.92 };
}

/* ---------- side-discharge outdoor unit (heat pump / ductless) ---------- */
export function makeSideDischarge(fans = 1) {
  const root = new THREE.Group();
  const W = 0.94, D = 0.36, H = fans === 2 ? 1.32 : 0.7;
  const mBody = std(0xdad7cf, { metalness: 0.35, roughness: 0.42 });
  const mDark = std(0x17181c, { metalness: 0.5, roughness: 0.45 });
  const mTrim = std(0x8a8b8e, { metalness: 0.6, roughness: 0.4 });
  root.add(mesh(new RoundedBoxGeometry(W, H, D, 3, 0.02), mBody, 0, 0.06 + H / 2, 0));
  root.add(mesh(new THREE.BoxGeometry(0.1, 0.06, D + 0.06), mDark, -0.3, 0.03, 0), mesh(new THREE.BoxGeometry(0.1, 0.06, D + 0.06), mDark, 0.3, 0.03, 0));
  for (let i = 0; i < fans; i++) {
    const cy = 0.06 + (fans === 2 ? 0.34 + i * 0.64 : H / 2);
    const cav = mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 40), mDark, -0.14, cy, D / 2 - 0.022);
    const rimR = mesh(new THREE.TorusGeometry(0.287, 0.012, 8, 48), mBody, -0.14, cy, D / 2 + 0.03); root.add(rimR); cav.rotation.x = Math.PI / 2; root.add(cav);
    const bl = fanBlades(0.25, mTrim); bl.rotation.x = Math.PI / 2; bl.position.set(-0.14, cy, D / 2 + 0.03); bl.rotation.z = i * 0.7; root.add(bl);
    const g = fanGuard(0.285, mDark, 9, 12); g.rotation.x = Math.PI / 2; g.position.set(-0.14, cy, D / 2 + 0.065); root.add(g);
  }
  // service cover + seam on the right
  root.add(mesh(new THREE.BoxGeometry(0.006, H - 0.04, 0.004), mTrim, 0.2, 0.06 + H / 2, D / 2 + 0.001, false));
  root.add(mesh(new RoundedBoxGeometry(0.16, 0.2, 0.05, 2, 0.012), mBody, W / 2 - 0.02, 0.24, 0.05));
  // rear coil visible on the left end
  root.add(mesh(new THREE.BoxGeometry(0.01, H - 0.1, D - 0.08), std(0xffffff, { map: tex.fins(), metalness: 0.7, roughness: 0.5 }), -W / 2 - 0.002, 0.06 + H / 2, 0, false));
  return { group: root, height: H + 0.06 };
}

/* ---------- ductless wall head ---------- */
export function makeWallHead() {
  const root = new THREE.Group();
  const white = std(0xf2f0e8, { roughness: 0.35, metalness: 0.05 });
  const dark = std(0x24262c, { roughness: 0.5 });
  root.add(mesh(new RoundedBoxGeometry(0.92, 0.3, 0.21, 4, 0.06), white, 0, 0, 0.105));
  const vane = mesh(new RoundedBoxGeometry(0.84, 0.012, 0.09, 2, 0.005), white, 0, -0.145, 0.16); vane.rotation.x = 0.55; root.add(vane);
  root.add(mesh(new THREE.BoxGeometry(0.82, 0.03, 0.1), dark, 0, -0.14, 0.11, false));
  root.add(mesh(new THREE.BoxGeometry(0.86, 0.004, 0.004), std(0xc9c6bb), 0, 0.02, 0.212, false));
  const led = mesh(new THREE.CircleGeometry(0.006, 12), new THREE.MeshBasicMaterial({ color: VANILLA }), 0.36, -0.07, 0.213, false); root.add(led);
  return { group: root };
}

/* ---------- pleated air filter ---------- */
export function makeFilter(dirty) {
  const root = new THREE.Group();
  const S = 0.5, n = 26, depth = 0.022;
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= n * 2; i++) {
    const x = -S / 2 + (S * i) / (n * 2), z = i % 2 ? 0 : depth;
    pos.push(x, -S / 2, z, x, S / 2, z); uv.push(i / (n * 2), 0, i / (n * 2), 1);
    if (i < n * 2) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const media = new THREE.Mesh(g, std(0xffffff, { map: tex.filter(dirty), roughness: 0.95, metalness: 0, side: THREE.DoubleSide }));
  media.castShadow = media.receiveShadow = true; root.add(media);
  const card = std(dirty ? 0xa89f8c : 0xe6e1d2, { roughness: 0.9, metalness: 0 });
  const b = 0.035;
  for (const [w, h, x, y] of [[S + b * 2, b, 0, S / 2 + b / 2], [S + b * 2, b, 0, -S / 2 - b / 2], [b, S, -S / 2 - b / 2, 0], [b, S, S / 2 + b / 2, 0]]) root.add(mesh(new THREE.BoxGeometry(w, h, 0.03), card, x, y, 0.012));
  // wire support
  const wire = std(dirty ? 0x6d675c : 0xb8b6ae, { metalness: 0.8, roughness: 0.4 });
  for (let i = 1; i < 5; i++) root.add(mesh(new THREE.BoxGeometry(S, 0.003, 0.003), wire, 0, -S / 2 + (S * i) / 5, depth + 0.002, false));
  return { group: root };
}

export { RoundedBoxGeometry, std, mesh, tube, segGeo, fanGuard };
