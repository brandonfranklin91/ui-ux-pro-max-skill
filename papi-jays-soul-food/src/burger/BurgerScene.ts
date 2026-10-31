import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import {
  bumpTexture,
  emberTexture,
  fbm,
  pattyTexture,
  pickleTexture,
  rng,
  shadowTexture,
  tomatoTexture,
} from './textures'

export type LayerKey = 'bottomBun' | 'patty' | 'patty2' | 'pickles' | 'tomato' | 'lettuce' | 'topBun'
export const labelKeys = ['topBun', 'lettuce', 'tomato', 'pickles', 'patty', 'bottomBun'] as const
export type LabelKey = (typeof labelKeys)[number]

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * Scroll story, as weights in 0..1 derived from overall progress p:
 *   e  explode the stack into labelled layers
 *   f  close-up on the jerk patty (embers)
 *   d  second patty grows in (double)
 *   s  settle: burger slides aside for the price card, fries land
 */
export function phases(p: number) {
  return {
    e: smooth(0.12, 0.3, p) * (1 - smooth(0.5, 0.64, p)),
    f: smooth(0.4, 0.5, p) * (1 - smooth(0.6, 0.68, p)),
    d: smooth(0.66, 0.76, p),
    s: smooth(0.8, 0.92, p),
    fr: smooth(0.82, 0.98, p),
  }
}

interface Layer {
  key: LayerKey
  obj: THREE.Object3D
  h: number
  r: number
  twist: number
}

const C = (hex: string) => new THREE.Color(hex)

/** LatheGeometry with per-vertex colour and optional displacement. */
function lathe(
  pts: THREE.Vector2[],
  segments: number,
  color: (j: number, pos: THREE.Vector3, theta: number) => THREE.Color,
  displace?: (pos: THREE.Vector3, j: number) => void,
  planarUV = false,
) {
  const geo = new THREE.LatheGeometry(pts, segments)
  const pos = geo.attributes.position as THREE.BufferAttribute
  const uv = geo.attributes.uv as THREE.BufferAttribute
  const colors = new Float32Array(pos.count * 3)
  const v = new THREE.Vector3()
  const n = pts.length
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const j = i % n
    const theta = Math.atan2(v.z, v.x)
    displace?.(v, j)
    pos.setXYZ(i, v.x, v.y, v.z)
    const c = color(j, v, theta)
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
    if (planarUV) uv.setXY(i, v.x / 2.4 + 0.5, v.z / 2.4 + 0.5)
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  return geo
}

function mixNoisy(a: THREE.Color, b: THREE.Color, t: number, pos: THREE.Vector3, amount = 0.08) {
  const c = a.clone().lerp(b, clamp01(t))
  const k = 1 + fbm(pos.x * 6 + 3, pos.z * 6 + pos.y * 4) * amount
  return c.multiplyScalar(k)
}

export class BurgerScene {
  readonly renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
  private outer = new THREE.Group()
  private spin = new THREE.Group()
  private layers: Layer[] = []
  private fries: THREE.Mesh[] = []
  private embers!: THREE.Points
  private emberSpeed: Float32Array = new Float32Array(0)
  private shadowPlane!: THREE.Mesh
  private keyLight!: THREE.DirectionalLight
  private clock = new THREE.Clock()
  private raf = 0
  private running = false
  private disposables: { dispose(): void }[] = []

  private pTarget = 0
  private p = 0
  private pointer = new THREE.Vector2()
  private pointerSmooth = new THREE.Vector2()
  private doubleOverride: boolean | null = null
  private dbl = 0
  private dblV = 0
  private idle = 0
  private w = 1
  private h = 1
  private labels: Partial<Record<LabelKey, HTMLElement>> = {}
  private tmp = new THREE.Vector3()

  /** Keep a user's single/double choice even at the top of the page (static mode). */
  stickyDouble = false
  /** Called every rendered frame with the smoothed progress. */
  onFrame?: (p: number, doubleOn: boolean) => void

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.08
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    const pmrem = new THREE.PMREMGenerator(this.renderer)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    this.scene.environment = env
    this.scene.environmentIntensity = 0.5
    this.disposables.push(env, pmrem)

    this.scene.add(this.outer)
    this.outer.add(this.spin)
    this.buildLights()
    this.buildBurger()
    this.buildSet()
  }

  // ---------------------------------------------------------------- build

  private buildLights() {
    const key = new THREE.DirectionalLight('#ffd6a0', 2.6)
    key.position.set(3.2, 7, 4.2)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.left = -4.2
    key.shadow.camera.right = 4.2
    key.shadow.camera.top = 6.5
    key.shadow.camera.bottom = -3
    key.shadow.camera.near = 1
    key.shadow.camera.far = 22
    key.shadow.bias = -0.0004
    key.shadow.normalBias = 0.02
    key.shadow.radius = 4
    key.target.position.set(0, 1.4, 0)
    this.outer.add(key, key.target)
    this.keyLight = key

    const rim = new THREE.DirectionalLight('#ffb067', 2.2)
    rim.position.set(-4.5, 3.5, -5)
    const rim2 = new THREE.DirectionalLight('#f4ecdc', 0.7)
    rim2.position.set(5, 2, -3)
    const hemi = new THREE.HemisphereLight('#f4ecdc', '#1a1c19', 0.45)
    this.outer.add(rim, rim2, hemi)
  }

  private buildBurger() {
    const bump = bumpTexture()
    this.disposables.push(bump)

    // Buns -------------------------------------------------------------
    const crumb = C('#e2bf82')
    const crustLight = C('#c4823c')
    const crustDark = C('#7a3a10')
    const bunMat = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.58,
      clearcoat: 0.3,
      clearcoatRoughness: 0.45,
      bumpMap: bump,
      bumpScale: 1.2,
      sheen: 0.15,
      sheenColor: C('#ffd9a0'),
    })
    this.disposables.push(bunMat)

    const topPts: THREE.Vector2[] = []
    for (let j = 0; j <= 5; j++) topPts.push(new THREE.Vector2(0.001 + 0.99 * (j / 5), 0))
    topPts.push(new THREE.Vector2(1.025, 0.035), new THREE.Vector2(1.045, 0.11), new THREE.Vector2(1.04, 0.19))
    const dome = (t: number) => {
      const a = (t * Math.PI) / 2
      return new THREE.Vector2(Math.max(0.001, 1.04 * Math.pow(Math.cos(a), 0.8)), 0.19 + 0.74 * Math.pow(Math.sin(a), 0.85))
    }
    for (let k = 1; k <= 22; k++) topPts.push(dome(k / 22))
    const topGeo = lathe(topPts, 120, (j, p) => {
      if (j <= 5) return mixNoisy(crumb, crumb, 0, p, 0.12)
      if (j <= 8) return mixNoisy(crumb, crustLight, (j - 5) / 3, p)
      return mixNoisy(crustLight, crustDark, Math.pow((j - 8) / 22, 0.7), p, 0.12)
    })
    const topBun = new THREE.Mesh(topGeo, bunMat)

    // Sesame seeds, oriented flat along the dome surface.
    const seedGeo = new THREE.SphereGeometry(1, 10, 6)
    const seedMat = new THREE.MeshStandardMaterial({ color: '#f3e3b6', roughness: 0.45 })
    const seeds = new THREE.InstancedMesh(seedGeo, seedMat, 150)
    const r = rng(21)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const yaw = new THREE.Quaternion()
    const up = new THREE.Vector3(0, 1, 0)
    for (let i = 0; i < seeds.count; i++) {
      const t = 0.12 + Math.sqrt(r()) * 0.82
      const th = r() * Math.PI * 2
      const a = dome(t)
      const b = dome(Math.min(1, t + 0.01))
      const tangent = new THREE.Vector2(b.x - a.x, b.y - a.y).normalize()
      const nrm = new THREE.Vector3(tangent.y * Math.cos(th), -tangent.x, tangent.y * Math.sin(th)).normalize().negate()
      if (nrm.y < 0) nrm.negate()
      const pos = new THREE.Vector3(a.x * Math.cos(th), a.y, a.x * Math.sin(th)).addScaledVector(nrm, 0.004)
      q.setFromUnitVectors(up, nrm)
      yaw.setFromAxisAngle(up, r() * Math.PI)
      q.multiply(yaw)
      m.compose(pos, q, new THREE.Vector3(0.034, 0.011, 0.017))
      seeds.setMatrixAt(i, m)
    }
    seeds.castShadow = true
    const topGroup = new THREE.Group()
    topGroup.add(topBun, seeds)
    this.disposables.push(topGeo, seedGeo, seedMat)

    const botPts: THREE.Vector2[] = []
    for (let j = 0; j <= 5; j++) botPts.push(new THREE.Vector2(0.001 + 0.95 * (j / 5), 0))
    botPts.push(
      new THREE.Vector2(1.0, 0.03),
      new THREE.Vector2(1.035, 0.1),
      new THREE.Vector2(1.045, 0.2),
      new THREE.Vector2(1.04, 0.3),
      new THREE.Vector2(1.02, 0.37),
      new THREE.Vector2(0.99, 0.41),
    )
    for (let k = 0; k <= 6; k++) botPts.push(new THREE.Vector2(0.97 * (1 - k / 6) + 0.001, 0.42 + 0.015 * (k / 6)))
    const botGeo = lathe(botPts, 120, (j, p) => {
      if (j <= 5) return mixNoisy(crustDark, crustLight, 0.35, p)
      if (j <= 9) return mixNoisy(crustLight, crustLight, 0, p)
      if (j <= 11) return mixNoisy(crustLight, crumb, (j - 9) / 2, p)
      return mixNoisy(crumb, crumb, 0, p, 0.12)
    })
    const bottomBun = new THREE.Mesh(botGeo, bunMat)
    this.disposables.push(botGeo)

    // Jerk patty ------------------------------------------------------
    const pTex = pattyTexture()
    const pattyMat = new THREE.MeshPhysicalMaterial({
      map: pTex,
      vertexColors: true,
      roughness: 0.62,
      bumpMap: bump,
      bumpScale: 1.6,
      clearcoat: 0.25,
      clearcoatRoughness: 0.5,
    })
    this.disposables.push(pTex, pattyMat)
    const pPts: THREE.Vector2[] = []
    for (let j = 0; j <= 5; j++) pPts.push(new THREE.Vector2(0.001 + 0.96 * (j / 5), 0))
    pPts.push(
      new THREE.Vector2(1.03, 0.025),
      new THREE.Vector2(1.075, 0.08),
      new THREE.Vector2(1.09, 0.15),
      new THREE.Vector2(1.075, 0.22),
      new THREE.Vector2(1.03, 0.275),
      new THREE.Vector2(0.97, 0.305),
    )
    for (let k = 1; k <= 8; k++) pPts.push(new THREE.Vector2(0.97 * (1 - k / 8) + 0.001, 0.31 + 0.012 * (k / 8)))
    const pattyGeo = (seed: number) =>
      lathe(
        pPts,
        160,
        (_j, p) => {
          const k = 0.85 + fbm(p.x * 3 + seed, p.z * 3) * 0.25
          return C('#ffffff').multiplyScalar(k)
        },
        (p) => {
          const th = Math.atan2(p.z, p.x)
          const rad = Math.hypot(p.x, p.z)
          const f = 1 + 0.045 * fbm(Math.cos(th) * 1.8 + seed, Math.sin(th) * 1.8 + p.y * 3)
          p.x *= f
          p.z *= f
          if (p.y > 0.28) p.y += 0.022 * fbm(p.x * 3.5 + seed, p.z * 3.5) * Math.min(1, (1.05 - rad) * 4)
          if (p.y < 0.02) p.y -= 0.006 * Math.abs(fbm(p.x * 4, p.z * 4 + seed))
        },
        true,
      )
    const pg1 = pattyGeo(0)
    const pg2 = pattyGeo(9)
    this.disposables.push(pg1, pg2)
    const patty = new THREE.Mesh(pg1, pattyMat)
    const patty2 = new THREE.Mesh(pg2, pattyMat)
    patty2.rotation.y = 1.3

    // Pickles --------------------------------------------------------
    const pkTex = pickleTexture()
    const pkGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.035, 48, 1)
    const pkPos = pkGeo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pkPos.count; i++) {
      const x = pkPos.getX(i)
      const z = pkPos.getZ(i)
      const rr = Math.hypot(x, z)
      if (rr > 0.01) {
        const k = 1 + 0.05 * Math.sin(Math.atan2(z, x) * 16)
        pkPos.setX(i, x * k)
        pkPos.setZ(i, z * k)
      }
    }
    pkGeo.translate(0, 0.0175, 0)
    pkGeo.computeVertexNormals()
    const pkSide = new THREE.MeshPhysicalMaterial({ color: '#33491a', roughness: 0.35, clearcoat: 0.6 })
    const pkCap = new THREE.MeshPhysicalMaterial({ map: pkTex, roughness: 0.3, clearcoat: 0.7 })
    this.disposables.push(pkTex, pkGeo, pkSide, pkCap)
    const pickles = new THREE.Group()
    const pr = rng(4)
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + pr() * 0.5
      const rad = 0.42 + pr() * 0.22
      const mesh = new THREE.Mesh(pkGeo, [pkSide, pkCap, pkCap])
      mesh.position.set(Math.cos(a) * rad, i * 0.004, Math.sin(a) * rad)
      mesh.rotation.set((pr() - 0.5) * 0.12, pr() * 3, (pr() - 0.5) * 0.12)
      pickles.add(mesh)
    }

    // Tomatoes -------------------------------------------------------
    const tTex = tomatoTexture()
    const tGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.085, 72, 1)
    tGeo.translate(0, 0.0425, 0)
    const tSide = new THREE.MeshPhysicalMaterial({ color: '#b3231a', roughness: 0.3, clearcoat: 0.8 })
    const tCap = new THREE.MeshPhysicalMaterial({ map: tTex, roughness: 0.25, clearcoat: 0.9, clearcoatRoughness: 0.15 })
    this.disposables.push(tTex, tGeo, tSide, tCap)
    const tomato = new THREE.Group()
    ;[
      [-0.38, 0.02, 0.15],
      [0.4, -0.05, 2.1],
    ].forEach(([x, z, ry], i) => {
      const mesh = new THREE.Mesh(tGeo, [tSide, tCap, tCap])
      mesh.position.set(x, i * 0.01, z)
      mesh.rotation.set(0, ry, i ? 0.03 : -0.03)
      tomato.add(mesh)
    })

    // Lettuce --------------------------------------------------------
    const lettuce = new THREE.Mesh(this.lettuceGeometry(), new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.5,
      side: THREE.DoubleSide,
      clearcoat: 0.25,
      clearcoatRoughness: 0.35,
      sheen: 0.2,
      sheenColor: C('#e8ffb0'),
    }))
    this.disposables.push(lettuce.geometry, lettuce.material as THREE.Material)

    const add = (key: LayerKey, obj: THREE.Object3D, h: number, r: number, twist: number) => {
      obj.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          o.castShadow = true
          o.receiveShadow = true
        }
      })
      const holder = new THREE.Group()
      holder.add(obj)
      this.spin.add(holder)
      this.layers.push({ key, obj: holder, h, r, twist })
    }
    add('bottomBun', bottomBun, 0.44, 1.05, -0.25)
    add('patty', patty, 0.31, 1.1, 0.5)
    add('patty2', patty2, 0.31, 1.1, -0.4)
    add('pickles', pickles, 0.045, 0.7, 0.9)
    add('tomato', tomato, 0.09, 1.02, -0.6)
    add('lettuce', lettuce, 0.07, 1.25, 0.35)
    add('topBun', topGroup, 0.93, 1.05, -0.3)
  }

  private lettuceGeometry() {
    const rings = 16
    const segs = 200
    const R = (th: number) => 1.24 * (1 + 0.05 * Math.sin(5 * th + 0.4) + 0.035 * Math.sin(13 * th + 1.2) + 0.02 * Math.sin(29 * th))
    const positions: number[] = [0, 0.02, 0]
    const colors: number[] = []
    const inner = C('#c2d873')
    const mid = C('#6fa834')
    const edge = C('#2f7322')
    colors.push(inner.r, inner.g, inner.b)
    for (let k = 1; k <= rings; k++) {
      const t = k / rings
      for (let s = 0; s < segs; s++) {
        const th = (s / segs) * Math.PI * 2
        const rad = t * R(th)
        const ruffle = Math.pow(t, 2.2) * (0.085 * Math.sin(9 * th + 2 * Math.sin(3 * th)) + 0.035 * Math.sin(23 * th + t * 4))
        const y = 0.02 + ruffle - 0.07 * Math.pow(t, 3)
        positions.push(Math.cos(th) * rad, y, Math.sin(th) * rad)
        const c = (t < 0.55 ? inner.clone().lerp(mid, t / 0.55) : mid.clone().lerp(edge, (t - 0.55) / 0.45))
          .multiplyScalar(1 + 0.12 * fbm(Math.cos(th) * 3 + t * 5, Math.sin(th) * 3) + 0.08 * Math.abs(Math.sin(th * 30)) * (1 - t))
        colors.push(c.r, c.g, c.b)
      }
    }
    const idx: number[] = []
    for (let s = 0; s < segs; s++) idx.push(0, 1 + ((s + 1) % segs), 1 + s)
    for (let k = 1; k < rings; k++) {
      const a0 = 1 + (k - 1) * segs
      const b0 = 1 + k * segs
      for (let s = 0; s < segs; s++) {
        const s1 = (s + 1) % segs
        idx.push(a0 + s, a0 + s1, b0 + s, a0 + s1, b0 + s1, b0 + s)
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geo.setIndex(idx)
    geo.computeVertexNormals()
    return geo
  }

  private buildSet() {
    // Dark serving board grounds the burger and catches its shadow.
    const board = new THREE.Mesh(
      new THREE.CylinderGeometry(2.35, 2.42, 0.12, 120, 1),
      new THREE.MeshStandardMaterial({ color: '#141210', roughness: 0.78, metalness: 0.1 }),
    )
    board.position.y = -0.06
    board.receiveShadow = true
    this.outer.add(board)
    this.disposables.push(board.geometry, board.material as THREE.Material)

    const shTex = shadowTexture()
    this.shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 3.2),
      new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, opacity: 0.8 }),
    )
    this.shadowPlane.rotation.x = -Math.PI / 2
    this.shadowPlane.position.y = 0.002
    this.outer.add(this.shadowPlane)
    this.disposables.push(shTex, this.shadowPlane.geometry, this.shadowPlane.material as THREE.Material)

    // Fries land on the board in the final beat ("fries included").
    const fryGeo = new THREE.BoxGeometry(0.075, 0.075, 1, 1, 1, 6)
    const fryMat = new THREE.MeshPhysicalMaterial({ color: '#e9ad4c', roughness: 0.55, clearcoat: 0.2, bumpMap: bumpTexture(), bumpScale: 0.8 })
    this.disposables.push(fryGeo, fryMat)
    const fr = rng(17)
    for (let i = 0; i < 16; i++) {
      const fry = new THREE.Mesh(fryGeo, fryMat)
      const len = 0.5 + fr() * 0.35
      fry.scale.set(1, 1, len)
      const side = i % 2 ? 1 : -1
      fry.userData = {
        x: side * (0.35 + fr() * 0.85),
        z: 1.35 + fr() * 0.55,
        ry: fr() * Math.PI,
        rz: (fr() - 0.5) * 0.3,
        stack: (i % 3) * 0.06,
      }
      fry.castShadow = true
      fry.receiveShadow = true
      fry.visible = false
      this.outer.add(fry)
      this.fries.push(fry)
    }

    // Embers rise around the patty during the close-up.
    const count = 140
    const pos = new Float32Array(count * 3)
    this.emberSpeed = new Float32Array(count)
    const er = rng(31)
    for (let i = 0; i < count; i++) {
      const a = er() * Math.PI * 2
      const rad = 0.9 + er() * 1.1
      pos[i * 3] = Math.cos(a) * rad
      pos[i * 3 + 1] = er() * 2.2
      pos[i * 3 + 2] = Math.sin(a) * rad
      this.emberSpeed[i] = 0.25 + er() * 0.6
    }
    const eg = new THREE.BufferGeometry()
    eg.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const eTex = emberTexture()
    const em = new THREE.PointsMaterial({
      size: 0.07,
      map: eTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0,
    })
    this.embers = new THREE.Points(eg, em)
    this.outer.add(this.embers)
    this.disposables.push(eg, em, eTex)
  }

  // ---------------------------------------------------------------- api

  setLabelElements(map: Partial<Record<LabelKey, HTMLElement>>) {
    this.labels = map
  }
  setProgress(p: number) {
    this.pTarget = clamp01(p)
  }
  /** Jump straight to a progress value (no easing), e.g. for reduced motion. */
  snapProgress(p: number) {
    this.pTarget = this.p = clamp01(p)
  }
  setPointer(x: number, y: number) {
    this.pointer.set(x, y)
  }
  setDouble(v: boolean | null) {
    this.doubleOverride = v
  }
  snapDouble(v: boolean) {
    this.doubleOverride = v
    this.dbl = v ? 1 : 0
    this.dblV = 0
  }
  setSize(w: number, h: number) {
    this.w = Math.max(1, w)
    this.h = Math.max(1, h)
    const dpr = Math.min(window.devicePixelRatio || 1, w < 768 ? 1.75 : 2)
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(this.w, this.h, false)
    this.camera.aspect = this.w / this.h
    this.camera.updateProjectionMatrix()
    this.keyLight.shadow.mapSize.setScalar(w < 768 ? 1024 : 2048)
  }
  start() {
    if (this.running) return
    this.running = true
    this.clock.getDelta()
    const loop = () => {
      if (!this.running) return
      this.frame(Math.min(this.clock.getDelta(), 0.25))
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }
  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
  }
  renderOnce() {
    this.frame(0)
  }
  /** Advance exactly `dt` seconds and render (deterministic, for video capture). */
  step(dt: number) {
    this.frame(dt)
  }
  dispose() {
    this.stop()
    this.disposables.forEach((d) => d.dispose())
    this.renderer.dispose()
  }

  // ---------------------------------------------------------------- frame

  private frame(dt: number) {
    const ease = 1 - Math.exp(-dt * 5.5)
    const sdt = Math.min(dt, 1 / 30) // physics step stays stable
    this.p = dt ? lerp(this.p, this.pTarget, ease) : this.pTarget
    const p = this.p
    const { e, f, d, s, fr } = phases(p)
    const narrow = this.w < 768
    this.idle += dt * 0.22

    // Double patty: a little spring so it pops in.
    if (!this.stickyDouble && this.doubleOverride !== null && p < 0.62) this.doubleOverride = null
    const target = this.doubleOverride ?? d > 0.5
    const tgt = target ? 1 : 0
    if (dt) {
      for (let k = 0, n = Math.ceil(dt / sdt); k < n; k++) {
        const acc = (tgt - this.dbl) * 120 - this.dblV * 14
        this.dblV += acc * (dt / n)
        this.dbl += this.dblV * (dt / n)
      }
    } else {
      this.dbl = tgt
    }
    const dbl = Math.max(0, this.dbl)

    // Stack the layers bottom-up; explode adds a gap between each.
    const gap = 0.55 * e
    let y = 0
    let pattyY = 0
    const centers: Partial<Record<LayerKey, number>> = {}
    this.layers.forEach((L, i) => {
      const hh = L.key === 'patty2' ? L.h * Math.min(1.15, dbl) : L.h
      L.obj.position.y = y
      L.obj.rotation.y = e * L.twist
      if (L.key === 'patty2') {
        L.obj.visible = dbl > 0.002
        const g = 0.82 + 0.18 * Math.min(1, dbl)
        L.obj.scale.set(g, Math.max(0.001, dbl), g)
      }
      centers[L.key] = y + hh / 2
      if (L.key === 'patty') pattyY = y + hh / 2
      y += hh + (L.key === 'patty2' && dbl < 0.01 ? 0 : i < this.layers.length - 1 ? gap : 0)
    })
    const total = y

    this.spin.rotation.y = this.idle + p * Math.PI * 2.4
    this.pointerSmooth.lerp(this.pointer, dt ? 1 - Math.exp(-dt * 4) : 1)
    this.outer.rotation.x = this.pointerSmooth.y * 0.06
    this.outer.rotation.z = -this.pointerSmooth.x * 0.04
    this.outer.position.x = narrow ? 0 : lerp(1.15, 1.3, s) - 0.25 * f
    ;(this.shadowPlane.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - e * 0.6)

    // Fries drop onto the board one after another.
    this.fries.forEach((fry, i) => {
      const t = clamp01((fr - i * 0.035) / 0.35)
      fry.visible = t > 0
      if (!fry.visible) return
      const u = fry.userData
      const fall = 1 - (1 - t) * (1 - t)
      fry.position.set(u.x, 0.04 + u.stack + (1 - fall) * 3, u.z)
      // Lies flat along its length; tumbles a little on the way down.
      fry.rotation.set((1 - fall) * 1.6 + u.rz * 0.2, u.ry, u.rz * 0.15)
    })

    // Embers.
    const ep = this.embers.geometry.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < ep.count; i++) {
      let yy = ep.getY(i) + this.emberSpeed[i] * dt
      if (yy > 2.4) yy = 0
      ep.setY(i, yy)
    }
    ep.needsUpdate = true
    this.embers.position.y = pattyY - 0.6
    ;(this.embers.material as THREE.PointsMaterial).opacity = f * 0.95

    // Camera: orbit distance and target follow the story beats.
    const aspect = this.w / this.h
    const fit = aspect < 1.2 ? Math.pow(1.2 / aspect, 0.62) : 1
    const dist = (7.3 + 3.6 * e - 2.9 * f + (narrow ? 2.6 : 0.5) * s) * fit
    let lookY = lerp(total * 0.5, pattyY + 0.15, f)
    const visH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(15))
    // Phones: keep the burger in the top half, and higher still under the order card.
    if (narrow) lookY -= (0.2 + 0.08 * s) * visH
    else lookY -= 0.08 * s * visH
    const elev = 0.3 + 0.06 * e - 0.1 * f
    this.camera.position.set(0, lookY + dist * Math.sin(elev), dist * Math.cos(elev))
    this.camera.lookAt(0, lookY, 0)

    this.renderer.render(this.scene, this.camera)
    this.placeLabels(e, f, centers)
    this.onFrame?.(p, target)
  }

  private placeLabels(e: number, f: number, centers: Partial<Record<LayerKey, number>>) {
    this.outer.updateMatrixWorld()
    labelKeys.forEach((key, i) => {
      const el = this.labels[key]
      if (!el) return
      const L = this.layers.find((l) => l.key === key)!
      this.tmp.set(L.r + 0.08, centers[key] ?? 0, 0).applyMatrix4(this.outer.matrixWorld).project(this.camera)
      let x = ((this.tmp.x + 1) / 2) * this.w
      const y = ((1 - this.tmp.y) / 2) * this.h
      // Stay clear of the chapter rail on wide screens.
      const maxX = this.w - el.offsetWidth - (this.w >= 1024 ? 190 : 12)
      if (x > maxX) x = maxX
      // During the patty close-up only the patty keeps its label.
      const o = clamp01(e * 1.8 - i * 0.12) * (key === 'patty' ? 1 : 1 - f)
      el.style.opacity = String(o)
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${(y - el.offsetHeight / 2).toFixed(1)}px, 0) translateX(${((1 - o) * 16).toFixed(1)}px)`
    })
  }
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas')
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'))
  } catch {
    return false
  }
}
