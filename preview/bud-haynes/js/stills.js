// Dev tool (not loaded by the site): studio renders of the kit models.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { TechSet, makeCondenser, makeAirHandler, makeSideDischarge, makeWallHead, makeFilter, std, mesh, tex } from './kit.js';

const shot = new URLSearchParams(location.search).get('shot') || 'sys-central';
const square = shot.startsWith('filter');
const W = square ? 900 : 1200, H = 900;
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const BG = 0x13152a;
const scene = new THREE.Scene(); scene.background = new THREE.Color(BG); scene.fog = new THREE.Fog(BG, 5, 11);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.35;
const cam = new THREE.PerspectiveCamera(30, W / H, 0.05, 50);

const floor = mesh(new THREE.PlaneGeometry(40, 40), std(0x1a1c36, { roughness: 0.55, metalness: 0.2 })); floor.rotation.x = -Math.PI / 2; floor.castShadow = false; scene.add(floor);
const key = new THREE.SpotLight(0xfff0d8, 60, 14, 0.5, 0.7, 1.4); key.position.set(-2.6, 4.2, 3.2); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0005; scene.add(key, key.target);
const rim = new THREE.DirectionalLight(0x9aa2ff, 1.6); rim.position.set(3.5, 2.5, -3.5); scene.add(rim);
scene.add(new THREE.HemisphereLight(0x8088d0, 0x15162a, 0.35));
const look = (px, py, pz, tx, ty, tz) => { cam.position.set(px, py, pz); cam.lookAt(tx, ty, tz); key.target.position.set(tx, ty, tz); };

if (shot === 'sys-central' || shot === 'svc-ac') {
  const t = new TechSet(); const u = makeCondenser(t); t.set(0); u.setExplode(0); u.group.rotation.y = -0.5; scene.add(u.group);
  scene.add(mesh(new THREE.BoxGeometry(1.2, 0.06, 1.2), std(0xffffff, { map: tex.concrete(), roughness: 0.95 }), 0, 0.03, 0).rotateY(-0.5)); u.group.position.y = 0.06;
  if (shot === 'sys-central') { cam.fov = 24; look(-0.5, 1.2, 3.9, 0, 0.47, 0); } else { cam.fov = 26; look(-0.9, 1.75, 1.7, 0.02, 0.84, 0.05); }
} else if (shot === 'svc-heat') {
  const t = new TechSet(); const a = makeAirHandler(t); t.set(0); a.group.rotation.y = 0.5; scene.add(a.group);
  const wall = mesh(new THREE.PlaneGeometry(12, 6), std(0x20233f, { roughness: 0.9 }), 0, 3, -0.9, false); wall.receiveShadow = true; scene.add(wall);
  cam.fov = 28; look(-0.9, 1.2, 5.0, 0, 0.98, 0);
} else if (shot === 'sys-heatpump') {
  const u = makeSideDischarge(2); u.group.rotation.y = -0.45; scene.add(u.group);
  cam.fov = 24; look(-0.7, 1.1, 4.4, 0, 0.7, 0);
} else if (shot === 'sys-ductless') {
  const wall = mesh(new THREE.PlaneGeometry(12, 6), std(0x2a2d50, { roughness: 0.9 }), 0, 3, 0, false); wall.receiveShadow = true; scene.add(wall);
  const h = makeWallHead(); h.group.position.set(-0.55, 1.75, 0); scene.add(h.group);
  const u = makeSideDischarge(1); u.group.position.set(0.95, 0, 0.5); u.group.rotation.y = -0.25; scene.add(u.group);
  key.position.set(-2.2, 4.0, 4.2); cam.fov = 24; look(-0.4, 1.25, 5.6, 0.28, 0.9, 0);
} else if (square) {
  scene.fog = null; floor.visible = false; scene.environmentIntensity = 0.2;
  const f = makeFilter(shot === 'filter-dirty'); f.group.position.set(0, 0, 0); scene.add(f.group);
  const back = mesh(new THREE.PlaneGeometry(6, 6), std(0x191b33, { roughness: 1 }), 0, 0, -0.06, false); back.receiveShadow = true; scene.add(back);
  key.position.set(-1.6, 1.9, 2.4); key.intensity = 26; key.angle = 0.45; rim.intensity = 0.25; rim.position.set(2, -1, 3);
  cam.fov = 24; look(0, 0, 1.72, 0, 0, 0);
}
cam.updateProjectionMatrix();
let n = 0; (function loop() { renderer.render(scene, cam); if (++n < 4) requestAnimationFrame(loop); else window.__ready = true; })();
