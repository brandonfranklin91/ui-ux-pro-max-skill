import * as THREE from 'three'

/** Deterministic PRNG so the burger looks identical on every load. */
export function rng(seed = 1) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Smooth 2D value noise in roughly [-1, 1], plus a 3-octave fbm. */
function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}
export function noise2(x: number, y: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash(xi, yi)
  const b = hash(xi + 1, yi)
  const c = hash(xi, yi + 1)
  const d = hash(xi + 1, yi + 1)
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1
}
export function fbm(x: number, y: number) {
  return noise2(x, y) * 0.55 + noise2(x * 2.1, y * 2.1) * 0.3 + noise2(x * 4.3, y * 4.3) * 0.15
}

function canvasTexture(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void, color = true) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  draw(g, size)
  const t = new THREE.CanvasTexture(c)
  if (color) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

function speckle(g: CanvasRenderingContext2D, s: number, r: () => number, n: number, color: string, min: number, max: number, alpha = 1) {
  g.fillStyle = color
  g.globalAlpha = alpha
  for (let i = 0; i < n; i++) {
    const rad = min + r() * (max - min)
    g.beginPath()
    g.ellipse(r() * s, r() * s, rad, rad * (0.5 + r() * 0.6), r() * Math.PI, 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 1
}

/** Seared beef with jerk-spice flecks (red pepper, allspice, scallion, black pepper). */
export function pattyTexture() {
  const r = rng(7)
  return canvasTexture(1024, (g, s) => {
    g.fillStyle = '#3a2013'
    g.fillRect(0, 0, s, s)
    speckle(g, s, r, 900, '#5a321b', 6, 22, 0.45)
    speckle(g, s, r, 700, '#1a0d07', 4, 18, 0.5)
    speckle(g, s, r, 500, '#7a4524', 2, 7, 0.55)
    speckle(g, s, r, 1100, '#a3301a', 1, 3.2, 0.9)
    speckle(g, s, r, 700, '#c9661f', 1, 2.6, 0.85)
    speckle(g, s, r, 320, '#4b6b22', 1, 2.6, 0.9)
    speckle(g, s, r, 900, '#0b0604', 0.8, 2, 0.9)
  })
}

/** Grayscale micro-relief shared by bread, patty, fries. */
export function bumpTexture() {
  const r = rng(11)
  const t = canvasTexture(
    256,
    (g, s) => {
      g.fillStyle = '#808080'
      g.fillRect(0, 0, s, s)
      speckle(g, s, r, 900, '#ffffff', 0.6, 2.4, 0.35)
      speckle(g, s, r, 900, '#000000', 0.6, 2.4, 0.35)
    },
    false,
  )
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(4, 4)
  return t
}

/** Tomato cross-section: skin ring, flesh, gel chambers with seeds, pale core. */
export function tomatoTexture() {
  const r = rng(3)
  return canvasTexture(512, (g, s) => {
    const c = s / 2
    g.fillStyle = '#b8231a'
    g.fillRect(0, 0, s, s)
    g.fillStyle = '#d63a28'
    g.beginPath()
    g.arc(c, c, c * 0.93, 0, Math.PI * 2)
    g.fill()
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.3
      g.save()
      g.translate(c + Math.cos(a) * c * 0.5, c + Math.sin(a) * c * 0.5)
      g.rotate(a)
      g.fillStyle = 'rgba(244,150,70,0.9)'
      g.beginPath()
      g.ellipse(0, 0, c * 0.26, c * 0.17, 0, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#f6e3a6'
      for (let i = 0; i < 7; i++) {
        g.beginPath()
        g.ellipse((r() - 0.5) * c * 0.3, (r() - 0.5) * c * 0.18, 5, 3, r() * 3, 0, Math.PI * 2)
        g.fill()
      }
      g.restore()
    }
    g.strokeStyle = 'rgba(240,120,90,0.6)'
    g.lineWidth = 6
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2
      g.beginPath()
      g.moveTo(c, c)
      g.lineTo(c + Math.cos(a) * c * 0.88, c + Math.sin(a) * c * 0.88)
      g.stroke()
    }
    g.fillStyle = '#e8644a'
    g.beginPath()
    g.arc(c, c, c * 0.17, 0, Math.PI * 2)
    g.fill()
  })
}

/** Dill pickle chip: dark skin ring, pale flesh, ring of seeds. */
export function pickleTexture() {
  const r = rng(5)
  return canvasTexture(256, (g, s) => {
    const c = s / 2
    g.fillStyle = '#3d5419'
    g.fillRect(0, 0, s, s)
    g.fillStyle = '#93a64a'
    g.beginPath()
    g.arc(c, c, c * 0.86, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#b9c56c'
    g.beginPath()
    g.arc(c, c, c * 0.5, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#e3e7b4'
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2 + r() * 0.2
      g.beginPath()
      g.ellipse(c + Math.cos(a) * c * 0.5, c + Math.sin(a) * c * 0.5, 6, 3.5, a, 0, Math.PI * 2)
      g.fill()
    }
  })
}

/** Soft radial dot for ember particles. */
export function emberTexture() {
  return canvasTexture(64, (g, s) => {
    const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
    grd.addColorStop(0, 'rgba(255,220,160,1)')
    grd.addColorStop(0.35, 'rgba(255,140,50,0.8)')
    grd.addColorStop(1, 'rgba(255,90,20,0)')
    g.fillStyle = grd
    g.fillRect(0, 0, s, s)
  })
}

/** Soft contact shadow under the burger. */
export function shadowTexture() {
  return canvasTexture(256, (g, s) => {
    const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
    grd.addColorStop(0, 'rgba(0,0,0,0.75)')
    grd.addColorStop(0.45, 'rgba(0,0,0,0.35)')
    grd.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grd
    g.fillRect(0, 0, s, s)
  })
}
