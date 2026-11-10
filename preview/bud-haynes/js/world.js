// Bud Haynes — the hero world: dusk exterior, x-ray system run, living room.
// One continuous space: condenser outside the wall (z > 0), air handler and
// supply duct behind it, and the duct ends at a register in the living room.
import * as THREE from 'three';
import {
  VANILLA, INDIGO_DEEP, tex, canvasTex, rng, TechSet, addEdges, makeCondenser, makeAirHandler,
  RoundedBoxGeometry, std, mesh, tube, segGeo,
} from './kit.js';

export const UNIT = new THREE.Vector3(0, 0.1, 1.1);
export const DUCT = { x: 0.6, y: 2.6, z0: -0.7, z1: -9.0, w: 0.7, h: 0.45 };

export function buildWorld(scene) {
  const tech = new TechSet();      // exterior + condenser: driven by scroll
  const sysTech = new TechSet();   // air handler + duct: always technical
  const ext = new THREE.Group(), sys = new THREE.Group(), room = new THREE.Group();
  scene.add(ext, sys, room);
  const line = tech.line(0.55);

  /* ============ exterior ============ */
  const skyMat = new THREE.MeshBasicMaterial({ map: tex.sky(), side: THREE.BackSide, fog: false, depthWrite: false });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(70, 40, 20), skyMat);
  sky.rotation.y = 2.1; sky.position.y = -6; ext.add(sky);

  const ground = mesh(new THREE.PlaneGeometry(90, 90), std(0xffffff, { map: tex.ground(), roughness: 1, metalness: 0 }));
  ground.rotation.x = -Math.PI / 2; ground.castShadow = false; ext.add(ground);
  const gravel = mesh(new THREE.PlaneGeometry(13, 2.4), std(0xffffff, { map: tex.gravel(), roughness: 1, metalness: 0 }), -2.6, 0.006, 1.2);
  gravel.rotation.x = -Math.PI / 2; gravel.castShadow = false; ext.add(gravel);
  const pad = mesh(new THREE.BoxGeometry(1.2, 0.1, 1.2), std(0xffffff, { map: tex.concrete(), roughness: 0.95, metalness: 0 }), UNIT.x, 0.05, UNIT.z);
  addEdges(pad, line); ext.add(pad);

  // house shell
  const sd = tex.siding();
  const mWall = tech.ghost(std(0xffffff, { map: sd.map, bumpMap: sd.bump, bumpScale: 3, roughness: 0.82, metalness: 0 }), 0.035, 0.06);
  const mTrim = tech.ghost(std(0x1b1c22, { roughness: 0.6, metalness: 0.4 }), 0.1, 0.1);
  const front = mesh(new THREE.BoxGeometry(10.8, 3.6, 0.2), mWall, -3.8, 1.8, -0.1); addEdges(front, line); front.renderOrder = -2; ext.add(front);
  const side = mesh(new THREE.BoxGeometry(0.2, 3.6, 8), mWall, 1.5, 1.8, -4.2); addEdges(side, line); side.renderOrder = -2; ext.add(side);
  const roof = mesh(new THREE.BoxGeometry(12.2, 0.22, 9.6), mTrim, -3.6, 3.71, -3.6); addEdges(roof, line); roof.renderOrder = -2; ext.add(roof);
  const plinth = mesh(new THREE.BoxGeometry(10.84, 0.22, 0.24), tech.ghost(std(0x4b4a4d, { roughness: 0.9 }), 0.08), -3.8, 0.11, -0.1); ext.add(plinth);

  // windows with warm interior light
  const glows = [];
  [[-3.95, 1.5, 11], [-2.2, 1.5, 12]].forEach(([x, w, seed]) => {
    const m = new THREE.MeshStandardMaterial({ color: 0x1a1208, emissive: 0xffffff, emissiveMap: tex.windowGlow(seed), emissiveIntensity: 1.5, roughness: 0.2 });
    glows.push(m);
    ext.add(mesh(new THREE.PlaneGeometry(w, 2.3), m, x, 1.75, 0.012, false));
    const f = 0.06;
    for (const [bw, bh, bx, by] of [[w + f * 2, f, 0, 1.15 + f / 2], [w + f * 2, f, 0, -1.15 - f / 2], [f, 2.3, -w / 2 - f / 2, 0], [f, 2.3, w / 2 + f / 2, 0], [0.035, 2.3, 0, 0], [w, 0.035, 0, 0.62]]) {
      const b = mesh(new THREE.BoxGeometry(bw, bh, 0.07), mTrim, x + bx, 1.75 + by, 0.03); addEdges(b, line); ext.add(b);
    }
  });
  const winLight = new THREE.PointLight(0xffb66e, 7, 7, 1.6); winLight.position.set(-3.0, 1.6, 1.1); ext.add(winLight);

  // wall sconce beside the unit
  const sconceMat = new THREE.MeshStandardMaterial({ color: 0x241a10, emissive: 0xffd39a, emissiveIntensity: 3 });
  ext.add(mesh(new THREE.BoxGeometry(0.1, 0.24, 0.07), mTrim, 0.95, 2.28, 0.04));
  ext.add(mesh(new THREE.BoxGeometry(0.07, 0.05, 0.05), sconceMat, 0.95, 2.14, 0.05, false));
  const sconce = new THREE.PointLight(0xffc98f, 1.6, 5, 1.8); sconce.position.set(0.95, 2.0, 0.32); ext.add(sconce);

  // disconnect box + whip, line set through the wall
  const mBox = tech.ghost(std(0x8d8f93, { metalness: 0.6, roughness: 0.5 }), 0.25);
  const disc = mesh(new THREE.BoxGeometry(0.18, 0.26, 0.09), mBox, 1.12, 0.95, 0.045); addEdges(disc, line); ext.add(disc);
  const mIns = tech.ghost(std(0x0d0d10, { roughness: 0.85, metalness: 0 }), 0.6);
  const mCu = tech.ghost(std(0xb87348, { metalness: 0.9, roughness: 0.3 }), 0.7);
  ext.add(tube([[1.12, 0.82, 0.06], [1.08, 0.6, 0.2], [0.8, 0.4, 0.5], [0.46, 0.4, 0.68]], 0.014, mIns, 24));
  const path = [[0.3, 0.33, 0.63], [0.34, 0.3, 0.42], [0.4, 0.36, 0.12], [0.44, 0.44, -0.1], [0.72, 0.62, -0.55], [0.98, 0.82, -1.0], [0.98, 0.9, -1.36]];
  ext.add(tube(path, 0.024, mIns, 60));
  ext.add(tube(path.map(([x, y, z]) => [x + 0.05, y - 0.03, z]), 0.009, mCu, 60));
  const flow = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(new THREE.CatmullRomCurve3(path.map((p) => new THREE.Vector3(...p))).getPoints(60)),
    tech.line(1));
  ext.add(flow);

  // planting + distance
  // clipped hedge under the windows: a dark core dressed in a few thousand leaves
  const r = rng(5);
  ext.add(mesh(new THREE.BoxGeometry(7.6, 0.74, 0.5), std(0x0f1a10, { roughness: 1, metalness: 0 }), -5.05, 0.37, 0.5));
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, -0.5); leafShape.quadraticCurveTo(0.42, -0.1, 0, 0.5); leafShape.quadraticCurveTo(-0.42, -0.1, 0, -0.5);
  const LEAVES = 7000;
  const leaves = new THREE.InstancedMesh(new THREE.ShapeGeometry(leafShape, 3), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0, side: THREE.DoubleSide }), LEAVES);
  const dummy = new THREE.Object3D(), lc = new THREE.Color();
  for (let i = 0; i < LEAVES; i++) {
    const x = -8.9 + r() * 7.75, bump = Math.sin(x * 2.3) * 0.035 + Math.sin(x * 5.1 + 1) * 0.02, f = r();
    if (f < 0.5) dummy.position.set(x, 0.04 + r() * 0.78, 0.76 + bump + r() * 0.07);          // front
    else if (f < 0.93) dummy.position.set(x, 0.76 + bump + r() * 0.07, 0.22 + r() * 0.6);      // top
    else dummy.position.set(-1.2 + r() * 0.07, 0.04 + r() * 0.78, 0.22 + r() * 0.6);           // end
    dummy.rotation.set(r() * 6.28, r() * 6.28, r() * 6.28); dummy.scale.setScalar(0.06 + r() * 0.06); dummy.updateMatrix();
    leaves.setMatrixAt(i, dummy.matrix);
    const g = 0.05 + r() * 0.2; leaves.setColorAt(i, lc.setRGB(g * 0.55, g, g * 0.38));
  }
  leaves.castShadow = leaves.receiveShadow = true; ext.add(leaves);
  // far neighbourhood silhouette on the horizon
  const horizon = new THREE.Mesh(new THREE.CylinderGeometry(46, 46, 9, 64, 1, true), new THREE.MeshBasicMaterial({ map: tex.treeline(), transparent: true, side: THREE.BackSide, depthWrite: false }));
  horizon.position.y = 4.1; horizon.renderOrder = -3; ext.add(horizon);
  const treeMat = std(0x10161a, { roughness: 1, metalness: 0 });

  // the hero unit
  const unit = makeCondenser(tech);
  unit.group.position.copy(UNIT); ext.add(unit.group);

  // exterior lights
  const sun = new THREE.DirectionalLight(0xff9050, 1.9); sun.position.set(6.0, 2.7, 7.5); sun.target.position.set(0, 0.4, 0.8);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -5, right: 4, top: 4.5, bottom: -2, near: 1, far: 22 });
  sun.shadow.autoUpdate = false; sun.shadow.needsUpdate = true;
  ext.add(sun, sun.target);

  /* ============ interior system (x-ray) ============ */
  const ah = makeAirHandler(sysTech);
  ah.group.position.set(0.6, 0, -1.6); sys.add(ah.group);
  const sLine = sysTech.line(0.7);
  // riser from plenum to the trunk
  const riser = mesh(new THREE.BoxGeometry(0.5, DUCT.y - ah.top + DUCT.h / 2, 0.5), sysTech.ghost(std(0xc9cacb, { metalness: 0.6, roughness: 0.4 }), 0.05), 0.6, (ah.top + DUCT.y + DUCT.h / 2) / 2, -1.6, false);
  addEdges(riser, sLine); sys.add(riser);
  // supply trunk — rendered from the inside, open at both ends
  const len = DUCT.z0 - DUCT.z1;
  const ductIn = new THREE.MeshStandardMaterial({ color: 0x3b406f, metalness: 0.15, roughness: 0.9, emissive: 0x23264a, emissiveIntensity: 0.55, side: THREE.BackSide });
  const none = new THREE.MeshBasicMaterial({ visible: false });
  const duct = new THREE.Mesh(new THREE.BoxGeometry(DUCT.w, DUCT.h, len), [ductIn, ductIn, ductIn, ductIn, none, none]);
  duct.position.set(DUCT.x, DUCT.y, (DUCT.z0 + DUCT.z1) / 2); sys.add(duct);
  const seams = [];
  const hw = DUCT.w / 2 - 0.002, hh = DUCT.h / 2 - 0.002;
  for (let z = DUCT.z0; z >= DUCT.z1; z -= 0.52) {
    seams.push(-hw, -hh, z, hw, -hh, z, hw, -hh, z, hw, hh, z, hw, hh, z, -hw, hh, z, -hw, hh, z, -hw, -hh, z);
  }
  for (const [sx, sy] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) seams.push(sx * hw, sy * hh, DUCT.z0, sx * hw, sy * hh, DUCT.z1);
  const seamLines = new THREE.LineSegments(segGeo(seams), sysTech.line(0.5)); seamLines.position.set(DUCT.x, DUCT.y, 0); sys.add(seamLines);
  // airflow trails
  const N = 90, tr = rng(77);
  const trail = { z: new Float32Array(N), x: new Float32Array(N), y: new Float32Array(N), v: new Float32Array(N), l: new Float32Array(N), ph: new Float32Array(N) };
  for (let i = 0; i < N; i++) {
    trail.z[i] = DUCT.z0 + 1 - tr() * (len + 1); trail.x[i] = (tr() - 0.5) * (DUCT.w - 0.12); trail.y[i] = (tr() - 0.5) * (DUCT.h - 0.1);
    trail.v[i] = 1.2 + tr() * 2.2; trail.l[i] = 0.25 + tr() * 0.7; trail.ph[i] = tr() * 6.28;
  }
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 6), 3));
  const tc = new Float32Array(N * 6);
  for (let i = 0; i < N; i++) tc.set([0.93, 0.92, 0.85, 0.1, 0.1, 0.2], i * 6); // bright head, faded tail
  trailGeo.setAttribute('color', new THREE.BufferAttribute(tc, 3));
  const trailMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false });
  const trails = new THREE.LineSegments(trailGeo, trailMat); trails.frustumCulled = false; sys.add(trails);
  // warm light at the register end
  const glowTex = canvasTex(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,236,200,1)'); g.addColorStop(0.4, 'rgba(255,214,160,.45)'); g.addColorStop(1, 'rgba(255,200,140,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }, { wrap: false });
  const endGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.85 }));
  endGlow.position.set(DUCT.x, DUCT.y, DUCT.z1 - 0.1); endGlow.scale.set(1.5, 1.2, 1); sys.add(endGlow);
  const endLight = new THREE.PointLight(0xffd6a0, 1.2, 5, 1.6); endLight.position.set(DUCT.x, DUCT.y, DUCT.z1 + 0.5); sys.add(endLight);
  sysTech.set(1);

  /* ============ living room ============ */
  const RX = 4, Z0 = -9, Z1 = -17, RH = 3.2, zc = (Z0 + Z1) / 2;
  const cream = std(0xd9d2c1, { roughness: 0.95, metalness: 0 });
  const floor = mesh(new THREE.PlaneGeometry(RX * 2, Z0 - Z1), std(0xffffff, { map: tex.planks(), roughness: 0.55, metalness: 0.05 }), 0, 0.012, zc);
  floor.rotation.x = -Math.PI / 2; room.add(floor);
  const ceil = mesh(new THREE.PlaneGeometry(RX * 2, Z0 - Z1), cream, 0, RH, zc, false); ceil.rotation.x = Math.PI / 2; room.add(ceil);
  const lw = mesh(new THREE.PlaneGeometry(Z0 - Z1, RH), cream, -RX, RH / 2, zc, false); lw.rotation.y = Math.PI / 2; lw.receiveShadow = true; room.add(lw);
  const rw = mesh(new THREE.PlaneGeometry(Z0 - Z1, RH), std(0xffffff, { map: tex.slats(), roughness: 0.6, metalness: 0 }), RX, RH / 2, zc, false); rw.rotation.y = -Math.PI / 2; room.add(rw);
  // register the camera arrives through
  const reg = new THREE.Group(); reg.position.set(DUCT.x, DUCT.y, Z0 - 0.01);
  const regMat = std(0xf3efe2, { roughness: 0.5, metalness: 0.2 });
  for (const [w, h, x, y] of [[DUCT.w + 0.1, 0.05, 0, DUCT.h / 2 + 0.025], [DUCT.w + 0.1, 0.05, 0, -DUCT.h / 2 - 0.025], [0.05, DUCT.h, -DUCT.w / 2 - 0.025, 0], [0.05, DUCT.h, DUCT.w / 2 + 0.025, 0]]) reg.add(mesh(new THREE.BoxGeometry(w, h, 0.03), regMat, x, y, 0, false));
  for (let i = 0; i < 7; i++) { const s = mesh(new THREE.BoxGeometry(DUCT.w, 0.006, 0.05), regMat, 0, -DUCT.h / 2 + 0.03 + i * 0.065, 0, false); s.rotation.x = -0.5; reg.add(s); }
  room.add(reg);

  // window wall + evening view
  const frame = std(0x16171c, { roughness: 0.5, metalness: 0.5 });
  room.add(mesh(new THREE.BoxGeometry(RX * 2, 0.3, 0.2), cream, 0, RH - 0.15, Z1));
  room.add(mesh(new THREE.BoxGeometry(RX * 2, 0.06, 0.1), frame, 0, 0.03, Z1));
  room.add(mesh(new THREE.BoxGeometry(RX * 2, 0.05, 0.08), frame, 0, 2.25, Z1));
  for (let i = 0; i <= 5; i++) room.add(mesh(new THREE.BoxGeometry(0.06, RH - 0.3, 0.1), frame, -RX + (i * RX * 2) / 5, (RH - 0.3) / 2, Z1));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(RX * 2, RH - 0.3), new THREE.MeshStandardMaterial({ color: 0x1b2040, transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.9 }));
  glass.position.set(0, (RH - 0.3) / 2, Z1 + 0.02); room.add(glass);
  const view = new THREE.Mesh(new THREE.PlaneGeometry(26, 10), new THREE.MeshBasicMaterial({ map: tex.evening(), fog: false }));
  view.position.set(0, 2.2, Z1 - 7); room.add(view);
  const terrace = mesh(new THREE.PlaneGeometry(26, 8), std(0x0e0f16, { roughness: 0.5, metalness: 0.2 }), 0, 0, Z1 - 3.5, false); terrace.rotation.x = -Math.PI / 2; room.add(terrace);
  const garden = new THREE.PointLight(0xffc27a, 1.0, 6, 1.6); garden.position.set(0.5, 0.5, Z1 - 2.2); room.add(garden);

  // sheer curtains
  const curtainMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c2, roughness: 0.95, metalness: 0, side: THREE.DoubleSide, transparent: true, opacity: 0.93 });
  for (const [cx, w] of [[-RX + 0.75, 1.5], [RX - 0.6, 1.2]]) {
    const g = new THREE.PlaneGeometry(w, RH - 0.34, 60, 1); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 26) * 0.045 + Math.sin(p.getX(i) * 9) * 0.02);
    g.computeVertexNormals();
    const c = mesh(g, curtainMat, cx, (RH - 0.34) / 2, Z1 + 0.28); room.add(c);
  }
  room.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, RX * 2, 8), frame, 0, RH - 0.34, Z1 + 0.28, false).rotateZ(Math.PI / 2));

  // sofa
  const fab = std(0xffffff, { map: tex.fabric(), roughness: 1, metalness: 0 });
  const rb = (w, h, d, x, y, z, m = fab, rad = 0.08) => mesh(new RoundedBoxGeometry(w, h, d, 4, rad), m, x, y, z);
  const sofa = new THREE.Group();
  sofa.add(rb(1.0, 0.3, 2.9, 0, 0.25, 0), rb(0.26, 0.6, 2.9, 0.42, 0.56, 0), rb(1.0, 0.5, 0.24, 0, 0.42, 1.45), rb(1.7, 0.3, 0.95, -0.4, 0.25, -1.55, fab));
  sofa.add(rb(0.26, 0.6, 1.0, 0.42, 0.56, -1.55));
  for (let i = 0; i < 3; i++) {
    sofa.add(rb(0.74, 0.17, 0.9, -0.1, 0.47, 0.88 - i * 0.92, fab, 0.07));
    const bc = rb(0.2, 0.44, 0.84, 0.24, 0.74, 0.88 - i * 0.92, fab, 0.09); bc.rotation.z = -0.14; sofa.add(bc);
  }
  sofa.add(rb(1.5, 0.17, 0.86, -0.46, 0.47, -1.55, fab, 0.07));
  const pIndigo = std(0x34386a, { roughness: 1 }), pSand = std(0xcbb894, { roughness: 1 });
  const p1 = rb(0.14, 0.42, 0.42, 0.08, 0.76, 1.1, pIndigo, 0.065); p1.rotation.set(0.1, 0.3, -0.25); sofa.add(p1);
  const p2 = rb(0.13, 0.36, 0.5, 0.1, 0.74, -1.5, pSand, 0.06); p2.rotation.set(-0.1, -0.2, -0.22); sofa.add(p2);
  const throwB = rb(0.5, 0.05, 0.75, -0.25, 0.575, -0.3, pIndigo, 0.02); throwB.rotation.y = 0.2; sofa.add(throwB);
  for (const [x, z] of [[-0.4, 1.3], [0.4, 1.3], [-0.4, -1.9], [0.4, -1.9], [-1.15, -1.9]]) sofa.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8), frame, x, 0.05, z));
  sofa.position.set(2.15, 0.012, -13.45); room.add(sofa);

  // rug, tables, objects
  const rug = mesh(new THREE.PlaneGeometry(3.7, 4.6), std(0xffffff, { map: tex.rug(), roughness: 1 }), 0.6, 0.02, -13.5); rug.rotation.x = -Math.PI / 2; rug.castShadow = false; room.add(rug);
  const stone = std(0xd3c8b2, { roughness: 0.7, metalness: 0 });
  room.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 48), stone, 0.3, 0.17, -13.6));
  room.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.4, 40), std(0x6e4c33, { roughness: 0.55 }), -0.2, 0.22, -12.95));
  room.add(rb(0.3, 0.035, 0.22, 0.42, 0.34, -13.45, std(0x34386a, { roughness: 0.8 }), 0.008), rb(0.26, 0.03, 0.2, 0.42, 0.372, -13.45, pSand, 0.008));
  const vase = mesh(new THREE.LatheGeometry([[0, 0], [0.06, 0], [0.09, 0.08], [0.07, 0.2], [0.035, 0.27], [0.045, 0.31]].map(([x, y]) => new THREE.Vector2(x, y)), 24), std(0xeee7d6, { roughness: 0.6, side: THREE.DoubleSide }), 0.12, 0.32, -13.8); room.add(vase);
  room.add(mesh(new THREE.SphereGeometry(0.11, 24, 10, 0, 6.3, Math.PI / 2, Math.PI / 2), std(0x2a2c40, { roughness: 0.5, side: THREE.DoubleSide }), -0.2, 0.53, -12.95));

  // armchair
  const chair = new THREE.Group();
  chair.add(rb(0.85, 0.3, 0.85, 0, 0.27, 0), rb(0.85, 0.5, 0.22, 0, 0.6, -0.36), rb(0.2, 0.34, 0.8, -0.38, 0.5, 0.02), rb(0.2, 0.34, 0.8, 0.38, 0.5, 0.02), rb(0.52, 0.14, 0.6, 0, 0.47, 0.07, fab, 0.06));
  chair.position.set(-1.55, 0.012, -14.6); chair.rotation.y = 1.15; room.add(chair);

  // credenza + art on the left wall
  const walnut = std(0x5a3d29, { roughness: 0.5, metalness: 0.05 });
  room.add(rb(0.45, 0.55, 2.2, -RX + 0.26, 0.38, -12.4, walnut, 0.015));
  const art = canvasTex(256, 320, (ctx, w, h) => {
    ctx.fillStyle = '#eeebda'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#282b4a'; ctx.beginPath(); ctx.arc(w * 0.42, h * 0.6, w * 0.34, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#b9a47c'; ctx.beginPath(); ctx.arc(w * 0.66, h * 0.36, w * 0.16, 0, 7); ctx.fill();
    ctx.fillStyle = '#282b4a'; ctx.fillRect(w * 0.08, h * 0.6, w * 0.84, 3);
  }, { wrap: false });
  const pic = mesh(new THREE.PlaneGeometry(0.9, 1.12), std(0xffffff, { map: art, roughness: 0.9 }), -RX + 0.03, 1.7, -12.4, false); pic.rotation.y = Math.PI / 2; room.add(pic);
  const picF = mesh(new THREE.BoxGeometry(0.03, 1.2, 0.98), walnut, -RX + 0.012, 1.7, -12.4, false); room.add(picF);
  const lampB = mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.26, 16), stone, -RX + 0.28, 0.79, -11.75); room.add(lampB);
  const shadeMat = new THREE.MeshStandardMaterial({ color: 0xfff0d2, emissive: 0xffcf8f, emissiveIntensity: 0.9, roughness: 0.9, side: THREE.DoubleSide });
  room.add(mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.2, 24, 1, true), shadeMat, -RX + 0.28, 1.02, -11.75, false));
  const tableLamp = new THREE.PointLight(0xffc88a, 2.2, 7, 1.7); tableLamp.position.set(-RX + 0.45, 1.05, -11.75); room.add(tableLamp);

  // floor lamp in the window corner
  room.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 24), frame, 3.2, 0.022, -16.0), mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.55, 8), frame, 3.2, 0.8, -16.0));
  room.add(mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.3, 28, 1, true), shadeMat, 3.2, 1.66, -16.0, false));
  const floorLamp = new THREE.PointLight(0xffc88a, 4.5, 9, 1.6); floorLamp.position.set(3.1, 1.6, -15.9); room.add(floorLamp);

  // olive tree
  const pot = mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.42, 24), stone, -3.0, 0.22, -16.0); room.add(pot);
  room.add(mesh(new THREE.CylinderGeometry(0.025, 0.035, 1.3, 6), std(0x4a3b2c, { roughness: 1 }), -3.0, 1.0, -16.0));
  const leaf = std(0x566247, { roughness: 1 }); const lr = rng(15);
  for (let i = 0; i < 9; i++) room.add(mesh(new THREE.IcosahedronGeometry(0.2 + lr() * 0.16, 1), leaf, -3.0 + (lr() - 0.5) * 0.8, 1.65 + (lr() - 0.4) * 0.7, -16.0 + (lr() - 0.5) * 0.7));

  // recessed ceiling lights + soft key
  const spotMat = new THREE.MeshBasicMaterial({ color: 0xfff1d6 });
  for (const x of [-2, 0.6, 3]) for (const z of [-11, -13.5, -16]) { const d = mesh(new THREE.CircleGeometry(0.05, 16), spotMat, x, RH - 0.004, z, false); d.rotation.x = Math.PI / 2; room.add(d); }
  const key = new THREE.SpotLight(0xffe2bd, 16, 9, 1.0, 0.85, 1.2); key.position.set(0.2, RH - 0.05, -13.0); key.target.position.set(0.9, 0, -13.7);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0006; key.shadow.autoUpdate = false; key.shadow.needsUpdate = true;
  room.add(key, key.target);

  const hemi = new THREE.HemisphereLight(0x6672d8, 0x1d1a1c, 0.62); scene.add(hemi);

  // Lights stay in the scene graph at all times (toggling them would force
  // shader recompiles mid-scroll); the director just fades their intensity.
  const extLights = [[sun, 1.9], [winLight, 7], [sconce, 1.6]];
  const roomLights = [[key, 16], [floorLamp, 4.5], [tableLamp, 2.2], [garden, 1.0], [endLight, 1.2]];

  let t = 0;
  return {
    tech, sysTech, ext, sys, room, unit, hemi, sun, key, sky, trails: trailMat, endGlow: endGlow.material,
    setTech(v) {
      tech.set(v);
      for (const [l, i] of extLights) l.intensity = i * (1 - 0.92 * v);
      for (const g of glows) g.emissiveIntensity = 1.5 * (1 - 0.8 * v);
      sconceMat.emissiveIntensity = 3 * (1 - 0.8 * v);
      skyMat.color.setScalar(1 - 0.9 * v);
    },
    setRoom(v) { for (const [l, i] of roomLights) l.intensity = i * v; },
    tick(dt) {
      t += dt;
      unit.fan.rotation.y -= dt * 7;
      const p = trailGeo.attributes.position;
      for (let i = 0; i < N; i++) {
        trail.z[i] -= trail.v[i] * dt;
        if (trail.z[i] < DUCT.z1 - 0.6) trail.z[i] = DUCT.z0 + 1;
        const x = DUCT.x + trail.x[i] + Math.sin(t * 1.3 + trail.ph[i] + trail.z[i]) * 0.03;
        const y = DUCT.y + trail.y[i] + Math.cos(t * 1.1 + trail.ph[i] + trail.z[i] * 1.4) * 0.025;
        p.setXYZ(i * 2, x, y, trail.z[i]); p.setXYZ(i * 2 + 1, x, y, trail.z[i] + trail.l[i]);
      }
      p.needsUpdate = true;
    },
  };
}

export { INDIGO_DEEP, VANILLA };
