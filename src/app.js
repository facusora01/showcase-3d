import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { parse3MF } from './threemf.js';
import { t, lang, locale, initStatic, setLang } from './i18n.js';

const $ = (id) => document.getElementById(id);
initStatic(document.querySelector('.app'));
// valores de inicio de los ajustes, para "Restaurar ajustes" (la placa y las copias dependen del modelo)
const defaults = [...document.querySelectorAll('aside select, aside input:not([type=file])')]
  .filter((el) => el.id !== 'plateSel' && el.id !== 'copies').map((el) => [el, el.type === 'checkbox' ? el.checked : el.value]);
const defaultSegs = ['dirSeg', 'fmtSeg'].map((id) => document.querySelector('#' + id + ' [aria-pressed=true]'));
const canvas = $('c'), stage = $('stage');
const statusEl = $('status');
const setStatus = (msg, kind = '') => { statusEl.textContent = msg; statusEl.className = 'status ' + kind; };

// ---------- colores ----------
const FILAMENT = [
  ['Negro', '#1b1b1d'], ['Blanco', '#f2f2ef'], ['Gris', '#8a8f96'], ['Plateado', '#c3c7cc'],
  ['Rojo', '#d61f26'], ['Naranja', '#ec6c47'], ['Amarillo', '#f9d30e'], ['Verde', '#25c866'],
  ['Azul', '#1f5fd6'], ['Azul oscuro', '#173444'], ['Violeta', '#6b3fa0'], ['Magenta', '#e0158a'],
  ['Dorado', '#c9a23a'], ['Marrón', '#6d4a2f'],
];
const KEYS = [
  [/azul[ _-]?oscuro|navy/i, '#173444'], [/blanc|white/i, '#f2f2ef'], [/negr|black/i, '#1b1b1d'],
  [/magenta|rosa|fucsia|pink/i, '#e0158a'], [/verde|green/i, '#25c866'], [/amarill|yellow/i, '#f9d30e'],
  [/naranj|orange/i, '#ec6c47'], [/roj|red/i, '#d61f26'], [/azul|blue/i, '#1f5fd6'], [/gris|grey|gray/i, '#8a8f96'],
  [/dorad|gold/i, '#c9a23a'], [/platead|silver/i, '#c3c7cc'], [/violet|purple|lila/i, '#6b3fa0'], [/marr[oó]n|brown/i, '#6d4a2f'],
];
const AUTO = ['#c3c7cc', '#d61f26', '#1f5fd6', '#f9d30e', '#25c866', '#ec6c47', '#6b3fa0', '#1b1b1d'];
const colorFromName = (n, i) => (KEYS.find(([re]) => re.test(n)) || [0, AUTO[i % AUTO.length]])[1];

// ---------- escena ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 5000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.enablePan = false;

const hemi = new THREE.HemisphereLight(0xffffff, 0x202024, 0.35);
const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
const fill = new THREE.DirectionalLight(0xdfe7ff, 0.7);
const rim = new THREE.DirectionalLight(0xffffff, 1.1);
scene.add(hemi, key, key.target, fill, rim);

const turntable = new THREE.Group(), orient = new THREE.Group(), model = new THREE.Group();
orient.add(model); turntable.add(orient); scene.add(turntable);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.4 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

const state = {
  pose: 'print', dur: 10, turns: 1, dir: 1, tilt: 25, zoom: 1, mat: 'matte', light: 1, lightAng: -35,
  bg: 'studio', shadow: true, fmt: '1:1', qual: 1080, fps: 30, caption: '', playing: true, angle: 0,
};
const speed = () => state.dir * state.turns * 2 * Math.PI / state.dur; // rad/s, igual en vista previa y video
let parts = [], selected = 0, lastVideo = null;
let mode = 'preview'; // preview | sim | export
let sim = null;

// ---------- fondo ----------
function studioBg() {
  const c = document.createElement('canvas'); c.width = 16; c.height = 512;
  const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, '#2b2f36'); gr.addColorStop(0.55, '#16181c'); gr.addColorStop(1, '#0b0c0e');
  g.fillStyle = gr; g.fillRect(0, 0, 16, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const BG = { studio: studioBg(), black: new THREE.Color('#050505'), grey: new THREE.Color('#d9dbde'), white: new THREE.Color('#ffffff') };
const lightBg = () => state.bg === 'white' || state.bg === 'grey';
function applyBg() { scene.background = BG[state.bg]; floor.material.opacity = lightBg() ? 0.22 : 0.45; updateCapPreview(); }

// ---------- materiales ----------
function tune(m) {
  const P = {
    matte: { roughness: 0.62, metalness: 0, clearcoat: 0, envMapIntensity: 0.55 },
    silk: { roughness: 0.26, metalness: 0.38, clearcoat: 0.2, envMapIntensity: 1.0 },
    gloss: { roughness: 0.16, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.1, envMapIntensity: 0.9 },
    resin: { roughness: 0.35, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.3, envMapIntensity: 0.7 },
  }[state.mat];
  Object.assign(m, P); m.needsUpdate = true;
}
const makeMat = (color) => { const m = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color) }); tune(m); return m; };

// ---------- piezas ----------
function addPart(name, geometry, color) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, makeMat(color)); mesh.castShadow = true; mesh.receiveShadow = true;
  model.add(mesh); parts.push({ name, mesh, color });
}
function clearParts() {
  for (const p of parts) { model.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }
  parts = []; selected = 0;
}
function recenter() {
  model.position.set(0, 0, 0); model.updateMatrixWorld(true);
  const box = new THREE.Box3();
  for (const p of parts) { p.mesh.geometry.computeBoundingBox(); box.union(p.mesh.geometry.boundingBox); }
  if (!box.isEmpty()) model.position.copy(box.getCenter(new THREE.Vector3()).negate());
  return box;
}
function autoPose(box) {
  // pieza plana (llavero, placa, cartel) -> de frente; volumen (figura, maceta) -> como se imprime
  const s = box.getSize(new THREE.Vector3());
  const flat = s.z < 0.25 * Math.min(s.x, s.y);
  setPose(flat ? 'front' : 'print');
}
function setPose(p) {
  state.pose = p;
  [...$('poseSeg').children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === p)));
  const t = p === 'print' ? 25 : 10; $('tilt').value = t; state.tilt = t; $('tiltO').textContent = t + '°';
  applyPose(); frameCamera();
}
function applyPose() {
  orient.rotation.set(state.pose === 'print' ? -Math.PI / 2 : 0, 0, 0);
  turntable.rotation.y = 0; turntable.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(orient);
  const r = box.isEmpty() ? 50 : box.getBoundingSphere(new THREE.Sphere()).radius;
  floor.position.y = box.isEmpty() ? -50 : box.min.y - r * 0.002;
  floor.scale.set(r * 14, r * 14, 1);
  turntable.rotation.y = state.angle;
}
function frameCamera() {
  const ar = aspect();
  const sphere = new THREE.Box3().setFromObject(orient).getBoundingSphere(new THREE.Sphere());
  const R = sphere.radius || 50;
  const vfov = THREE.MathUtils.degToRad(camera.fov), hfov = 2 * Math.atan(Math.tan(vfov / 2) * ar);
  const dist = (R / Math.sin(Math.min(vfov, hfov) / 2)) * 1.05 / state.zoom;
  const t = THREE.MathUtils.degToRad(state.tilt);
  camera.position.set(0, Math.sin(t) * dist, Math.cos(t) * dist);
  camera.near = dist / 50; camera.far = dist * 20; camera.updateProjectionMatrix();
  controls.target.set(0, 0, 0); controls.update();
  placeLights(R);
}
let lastR = 50;
function placeLights(R = lastR) {
  lastR = R;
  const a = THREE.MathUtils.degToRad(state.lightAng), d = R * 6;
  key.position.set(Math.sin(a) * d, d * 0.9, Math.cos(a) * d); key.intensity = 2.2 * state.light;
  const sc = key.shadow.camera, e = R * 2.2;
  Object.assign(sc, { left: -e, right: e, top: e, bottom: -e, near: d * 0.2, far: d * 3 }); sc.updateProjectionMatrix();
  fill.position.set(-Math.sin(a) * d, d * 0.3, d * 0.8); fill.intensity = 0.7 * state.light;
  rim.position.set(-Math.sin(a) * d * 0.6, d * 0.6, -d); rim.intensity = 1.1 * state.light;
  hemi.intensity = 0.35 * state.light;
  key.castShadow = state.shadow; floor.visible = state.shadow;
}
const aspect = () => { const [a, b] = state.fmt.split(':').map(Number); return a / b; };
function rotateParts(axis) {
  if (!parts.length) return;
  const m = axis === 'flip' ? new THREE.Matrix4().makeRotationY(Math.PI) : new THREE.Matrix4()[{ x: 'makeRotationX', y: 'makeRotationY', z: 'makeRotationZ' }[axis]](Math.PI / 2);
  for (const p of parts) { p.mesh.geometry.applyMatrix4(m); p.mesh.geometry.computeBoundingBox(); }
  recenter(); applyPose(); frameCamera();
}

// ---------- panel de piezas ----------
function renderParts() {
  const box = $('parts'); box.textContent = '';
  parts.forEach((p, i) => {
    const row = document.createElement('div'); row.className = 'part' + (i === selected ? ' sel' : '');
    const col = document.createElement('input'); col.type = 'color'; col.value = p.color; col.id = 'pc' + i;
    col.setAttribute('aria-label', t('Color de {0}', p.name));
    col.addEventListener('input', () => { p.color = col.value; p.mesh.material.color.set(col.value); });
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = p.name; nm.title = p.name;
    const del = document.createElement('button'); del.type = 'button'; del.textContent = '×'; del.title = t('Quitar esta pieza');
    del.addEventListener('click', (e) => { e.stopPropagation(); model.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); parts.splice(i, 1); selected = 0; afterChange(false); });
    row.addEventListener('click', () => { selected = i; renderParts(); });
    row.append(col, nm, del); box.append(row);
  });
  if (parts.length) { const h = document.createElement('p'); h.className = 'hint'; h.textContent = t('Tocá una pieza y elegí su color abajo.'); box.append(h); }
  $('empty').hidden = parts.length > 0;
}
function renderChips() {
  $('chips').textContent = '';
  for (const [n, c] of FILAMENT) {
    const b = document.createElement('button'); b.type = 'button'; b.style.background = c; b.title = t(n);
    b.setAttribute('aria-label', t('Pintar la pieza seleccionada de {0}', t(n)));
    b.addEventListener('click', () => { const p = parts[selected]; if (!p) return; p.color = c; p.mesh.material.color.set(c); renderParts(); });
    $('chips').append(b);
  }
}

// ---------- carga ----------
const loader = new STLLoader();
let current3mf = null; // {doc, name}
async function loadFiles(files, add = false) {
  const all = [...files];
  const mf = all.filter((f) => /\.3mf$/i.test(f.name));
  const stl = all.filter((f) => /\.stl$/i.test(f.name));
  const skipped = all.length - stl.length - mf.length;
  if (!stl.length && !mf.length) { setStatus(t('Solo abre archivos .stl y .3mf.'), 'warn'); return; }
  if (!add) { clearParts(); current3mf = null; show3mfControls(); }
  let bad = 0;
  if (mf.length) {
    const f = mf[0];
    setStatus(t('Leyendo {0}…', f.name));
    await new Promise((r) => setTimeout(r, 30));
    try {
      const doc = parse3MF(await f.arrayBuffer());
      current3mf = { doc, name: f.name.replace(/\.3mf$/i, '') };
      add3mfParts(0, false);
      show3mfControls();
    } catch (e) { bad++; setStatus(t('No pude leer {0}: {1}', f.name, t(e.message || String(e))), 'warn'); }
  }
  stl.sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }));
  for (let i = 0; i < stl.length; i++) {
    try {
      const geo = loader.parse(await stl[i].arrayBuffer());
      if (!geo.attributes.position || !geo.attributes.position.count) throw new Error('vacío');
      addPart(stl[i].name.replace(/\.stl$/i, '').replace(/_/g, ' '), geo, colorFromName(stl[i].name, parts.length));
    } catch (e) { bad++; }
  }
  if (!parts.length) { renderParts(); return; }
  afterChange(!add);
  const tris = parts.reduce((s, p) => s + p.mesh.geometry.attributes.position.count / 3, 0);
  const extra = (mf.length > 1 ? t(' Abrí solo el primer 3MF ({0}).', mf[0].name) : '') + (skipped ? t(' Ignoré {0} archivo(s) que no son STL ni 3MF.', skipped) : '');
  setStatus(bad ? t('No pude leer {0} archivo(s).', bad) + extra :
    t('Listo: {0} pieza(s) de color, {1} triángulos.', parts.length, Math.round(tris).toLocaleString(locale())) + extra, bad ? 'warn' : 'ok');
}
function add3mfParts(plateIdx, allCopies) {
  const list = current3mf.doc.buildParts(plateIdx, allCopies);
  list.forEach((p) => addPart(p.name, p.geometry, p.color || colorFromName(p.name, p.ext - 1)));
}
function show3mfControls() {
  const box = $('mfBox'); const d = current3mf && current3mf.doc;
  box.hidden = !d || (d.plates.length < 2 && !d.hasCopies);
  if (!d) return;
  const sel = $('plateSel'); sel.textContent = '';
  d.plates.forEach((id, i) => { const o = document.createElement('option'); o.value = i; o.textContent = t('Placa {0}', id); sel.append(o); });
  $('plateRow').hidden = d.plates.length < 2;
  $('copiesRow').hidden = !d.hasCopies;
  $('copies').checked = false;
}
function reload3mf() {
  if (!current3mf) return;
  clearParts();
  add3mfParts(+$('plateSel').value, $('copies').checked);
  afterChange(true);
  setStatus(t($('copies').checked ? 'Mostrando {0} con todas las copias.' : 'Mostrando {0}.', $('plateSel').selectedOptions[0]?.textContent || t('Placa')), 'ok');
}
function layerParts() {
  // la pieza más grande (la base) cede en las caras que comparte con las demás, para que no titilen
  const vol = (p) => { const g = p.mesh.geometry; g.computeBoundingBox(); const s = g.boundingBox.getSize(new THREE.Vector3()); return s.x * s.y * Math.max(s.z, 1e-3); };
  let big = null, bv = -1;
  for (const p of parts) { const v = vol(p); p.mesh.material.polygonOffset = false; if (v > bv) { bv = v; big = p; } }
  if (big && parts.length > 1) Object.assign(big.mesh.material, { polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 8 });
  parts.forEach((p) => (p.mesh.material.needsUpdate = true));
}
function afterChange(reorient) {
  layerParts();
  const box = recenter(); state.angle = 0;
  if (reorient && parts.length) autoPose(box); else { applyPose(); frameCamera(); }
  renderParts();
}
async function loadSample() {
  clearParts();
  const data = JSON.parse($('sample').textContent);
  for (const p of data) {
    const bin = Uint8Array.from(atob(p.data), (ch) => ch.charCodeAt(0));
    const buf = await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buf, 0, p.nv * 3), 3));
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(buf.slice(p.nv * 12), 0, p.ni), 1));
    addPart(t('Ejemplo {0}', t(p.name)), g, colorFromName(p.name, 0));
  }
  afterChange(true);
  setStatus(t('Ejemplo cargado. Arrastrá tus STL para reemplazarlo.'), 'ok');
}

// ---------- escenario ----------
function layoutStage() {
  const ar = aspect(), wrapW = stage.parentElement.clientWidth;
  const maxH = Math.max(280, window.innerHeight - 150);
  let w = wrapW, h = w / ar; if (h > maxH) { h = maxH; w = h * ar; }
  stage.style.width = Math.round(w) + 'px'; stage.style.height = Math.round(h) + 'px';
  if (mode !== 'export') {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(Math.round(w), Math.round(h), false);
    camera.aspect = ar; camera.updateProjectionMatrix();
  }
  updateCapPreview();
}
new ResizeObserver(layoutStage).observe(stage.parentElement);
window.addEventListener('resize', layoutStage);

function updateCapPreview() {
  const el = $('capPrev'); const t = state.caption.trim();
  el.hidden = !t; el.textContent = t;
  el.style.fontSize = Math.round(Math.min(stage.clientWidth, stage.clientHeight) * 0.06) + 'px';
  el.style.color = lightBg() ? '#14161a' : '#ffffff';
}

// ---------- loop ----------
let lastT = performance.now();
function tick() {
  const now = performance.now();
  const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
  if (mode === 'preview') {
    if (state.playing) state.angle += speed() * dt;
    turntable.rotation.y = state.angle;
  } else if (mode === 'sim') {
    const el = (performance.now() - sim.t0) / 1000;
    turntable.rotation.y = sim.start + speed() * Math.min(el, state.dur);
    $('busyBar').style.width = Math.min(100, 100 * el / state.dur).toFixed(1) + '%';
    $('busyTxt').textContent = t('Simulación: {0} / {1} s', Math.min(el, state.dur).toFixed(1), state.dur);
    if (el >= state.dur || sim.cancel) endSim();
  }
  if (mode !== 'export') { controls.update(); renderer.render(scene, camera); }
  requestAnimationFrame(tick);
}
function startSim() {
  if (!parts.length) { setStatus(t('Primero cargá una pieza.'), 'warn'); return; }
  mode = 'sim'; sim = { t0: performance.now(), start: 0, cancel: false };
  $('busy').hidden = false; lockButtons(true); $('simBtn').disabled = true;
  setStatus(t('Así va a quedar el video. Si te gusta, tocá Grabar video MP4.'));
}
function endSim() { turntable.rotation.y = state.angle = 0; mode = 'preview'; $('busy').hidden = true; lockButtons(false); }
function lockButtons(on) { ['recBtn', 'snapBtn', 'simBtn'].forEach((id) => ($(id).disabled = on)); }

// ---------- texto en el video ----------
function drawCaption(ctx, W, H) {
  const txt = state.caption.trim(); if (!txt) return;
  const size = Math.round(Math.min(W, H) * 0.06);
  ctx.font = `700 ${size}px "Barlow Semi Condensed", "Arial Narrow", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = lightBg() ? '#14161a' : '#ffffff';
  ctx.shadowColor = lightBg() ? 'rgba(255,255,255,.4)' : 'rgba(0,0,0,.6)'; ctx.shadowBlur = size * 0.3;
  ctx.fillText(txt.toUpperCase(), W / 2, H - H * 0.045 - size * 0.2);
  ctx.shadowBlur = 0;
}

// ---------- guardar ----------
let dl = null;
const dlReady = (window.claude && window.claude.use) ? window.claude.use('downloads').then((d) => (dl = d)).catch(() => (dl = null)) : Promise.resolve(null);
const NL = window.Neutralino || null; // versión de escritorio (.exe)
if (NL) {
  try {
    NL.init();
    // cerrar el programa al tocar la X de la ventana
    NL.events.on('windowClose', () => { try { NL.app.exit(); } catch (e) { window.close(); } });
  } catch (e) {}
}
async function saveFile(blob, filename) {
  if (NL) {
    try {
      const ext = filename.split('.').pop();
      let dir = ''; try { dir = await NL.os.getPath(ext === 'png' ? 'pictures' : 'videos'); } catch (e) {}
      const path = await NL.os.showSaveDialog(t(ext === 'png' ? 'Guardar foto' : 'Guardar video'), {
        defaultPath: dir ? dir + '\\' + filename : filename,
        filters: [{ name: ext === 'png' ? t('Imagen PNG') : 'Video ' + ext.toUpperCase(), extensions: [ext] }],
      });
      if (!path) { setStatus(t('No se guardó. Usá “Guardar de nuevo” si lo querés.'), 'warn'); return; }
      const finalPath = /\.[a-z0-9]+$/i.test(path) ? path : path + '.' + ext;
      await NL.filesystem.writeBinaryFile(finalPath, await blob.arrayBuffer());
      setStatus(t('Guardado en {0}', finalPath), 'ok');
    } catch (e) { setStatus(t('No se pudo guardar: {0}', e && (e.message || e.code) || e), 'warn'); }
    return;
  }
  await dlReady;
  if (dl) {
    try { await dl.save({ filename, data: blob }); setStatus(t('Guardado: {0}', filename), 'ok'); }
    catch (e) {
      const c = e && e.code;
      setStatus(c === 'declined' ? t('No se guardó. Usá “Guardar de nuevo” si lo querés.') :
        c === 'rate_limited' ? t('Hay otra descarga esperando confirmación.') : t('Esta vista no permite descargar; usá la versión del escritorio.'), 'warn');
    }
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  setStatus(t('Guardado en tu carpeta Descargas: {0}', filename), 'ok');
}
function baseName() {
  const n = (parts[0] && parts[0].name || t('pieza')).replace(/\s+\d+\s+\D+$/, '').replace(/[^\w\- áéíóúñÁÉÍÓÚÑ]/g, '').trim();
  return (n || t('pieza')).replace(/\s+/g, '_');
}

// ---------- exportar ----------
function outSize() {
  const [a, b] = state.fmt.split(':').map(Number), s = state.qual;
  let W, H; if (a >= b) { H = s; W = Math.round(s * a / b); } else { W = s; H = Math.round(s * b / a); }
  return [W + (W % 2), H + (H % 2)];
}
async function pickAvc(W, H, fps) {
  if (!('VideoEncoder' in window)) return null;
  const bitrate = Math.round(W * H * fps * 0.16);
  for (const codec of ['avc1.640033', 'avc1.4d0033', 'avc1.42e033', 'avc1.640028', 'avc1.42e028']) {
    const cfg = { codec, width: W, height: H, bitrate, framerate: fps, avc: { format: 'avc' } };
    try { if ((await VideoEncoder.isConfigSupported(cfg)).supported) return cfg; } catch (e) {}
  }
  return null;
}
let cancelReq = false;
function beginExport(W, H) {
  mode = 'export'; cancelReq = false; $('busy').hidden = false; $('busyBar').style.width = '0%'; lockButtons(true);
  renderer.setPixelRatio(1); renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
}
function endExport() { mode = 'preview'; $('busy').hidden = true; lockButtons(false); layoutStage(); }
const yieldUI = () => new Promise((r) => setTimeout(r, 0));

async function recordVideo() {
  if (!parts.length) { setStatus(t('Primero cargá una pieza.'), 'warn'); return; }
  const [W, H] = outSize(), fps = state.fps, dur = state.dur, N = Math.round(dur * fps);
  try { await document.fonts.load('700 40px "Barlow Semi Condensed"'); } catch (e) {}
  const comp = document.createElement('canvas'); comp.width = W; comp.height = H;
  const ctx = comp.getContext('2d');
  const start = 0, w = speed(); // el video siempre arranca de frente
  const cfg = await pickAvc(W, H, fps);
  beginExport(W, H);
  const draw = (tSec) => {
    turntable.rotation.y = start + w * tSec;
    renderer.render(scene, camera);
    ctx.drawImage(renderer.domElement, 0, 0, W, H); drawCaption(ctx, W, H);
  };
  const fname = `${baseName()}_${dur}s_${state.fmt.replace(':', 'x')}`;
  try {
    if (cfg) {
      $('busyTxt').textContent = t('Generando video de {0} s…', dur);
      const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'avc', width: W, height: H, frameRate: fps }, fastStart: 'in-memory' });
      let err = null;
      const enc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => (err = e) });
      enc.configure(cfg);
      for (let i = 0; i < N; i++) {
        if (cancelReq || err) break;
        draw(i / fps);
        const fr = new VideoFrame(comp, { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) });
        enc.encode(fr, { keyFrame: i % (fps * 2) === 0 }); fr.close();
        while (enc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 4));
        if (i % 3 === 0) { $('busyBar').style.width = (100 * i / N).toFixed(1) + '%'; $('busyTxt').textContent = t('Generando video: {0}%', Math.round(100 * i / N)); await yieldUI(); }
      }
      if (err) throw err;
      if (cancelReq) { enc.close(); setStatus(t('Grabación cancelada.'), 'warn'); return; }
      await enc.flush(); enc.close(); muxer.finalize();
      finish(new Blob([muxer.target.buffer], { type: 'video/mp4' }), fname + '.mp4', W, H, dur);
    } else {
      const mime = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
      if (!mime) throw new Error(t('este navegador no puede grabar video; usá Edge o Chrome actualizados.'));
      $('busyTxt').textContent = t('Grabando en tiempo real ({0} s)…', dur);
      const rec = new MediaRecorder(comp.captureStream(fps), { mimeType: mime, videoBitsPerSecond: Math.round(W * H * fps * 0.16) });
      const chunks = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const stopped = new Promise((r) => (rec.onstop = r));
      rec.start(250); const t0 = performance.now();
      await new Promise((res) => { const step = () => { const el = (performance.now() - t0) / 1000; if (cancelReq || el >= dur) return res(); draw(el); $('busyBar').style.width = (100 * el / dur).toFixed(1) + '%'; requestAnimationFrame(step); }; step(); });
      rec.stop(); await stopped;
      if (cancelReq) { setStatus(t('Grabación cancelada.'), 'warn'); return; }
      const ext = mime.includes('mp4') ? 'mp4' : 'webm';
      finish(new Blob(chunks, { type: mime.split(';')[0] }), fname + '.' + ext, W, H, dur);
    }
  } catch (e) { setStatus(t('No se pudo grabar: {0}', e && e.message || e), 'warn'); }
  finally { turntable.rotation.y = state.angle = 0; endExport(); }
}
function finish(blob, name, W, H, dur) {
  lastVideo = { blob, name };
  const v = $('resultVid'); if (v.src) URL.revokeObjectURL(v.src); v.src = URL.createObjectURL(blob);
  $('resultInfo').textContent = `${W}×${H} · ${dur} s · ${(blob.size / 1048576).toFixed(1)} MB`;
  $('resultBox').hidden = false; saveFile(blob, name);
}
async function snapshot() {
  if (!parts.length) { setStatus(t('Primero cargá una pieza.'), 'warn'); return; }
  const [W, H] = outSize(); beginExport(W, H);
  try {
    try { await document.fonts.load('700 40px "Barlow Semi Condensed"'); } catch (e) {}
    renderer.render(scene, camera);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d'); ctx.drawImage(renderer.domElement, 0, 0, W, H); drawCaption(ctx, W, H);
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    await saveFile(blob, baseName() + '.png');
  } finally { endExport(); }
}

// ---------- controles ----------
function seg(id, k, cast, after) {
  $(id).addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (k) { [...$(id).children].forEach((x) => x.setAttribute('aria-pressed', String(x === b))); state[k] = cast(b.dataset.v); }
    after && after(b.dataset.v);
  });
}
function range(id, k, fmt, cast, after) {
  const el = $(id), out = $(id + 'O');
  const upd = () => { state[k] = cast(+el.value); out.textContent = fmt(+el.value); after && after(); };
  el.addEventListener('input', upd); upd();
}
seg('poseSeg', null, null, (v) => setPose(v));
seg('rotSeg', null, null, (v) => rotateParts(v));
seg('dirSeg', 'dir', Number);
seg('fmtSeg', 'fmt', String, () => { layoutStage(); frameCamera(); });
range('tilt', 'tilt', (v) => v + '°', Number, () => frameCamera());
range('zoom', 'zoom', (v) => v + '%', (v) => v / 100, () => frameCamera());
range('light', 'light', (v) => v + '%', (v) => v / 100, () => placeLights());
range('lightAng', 'lightAng', (v) => v + '°', Number, () => placeLights());
$('dur').addEventListener('change', (e) => (state.dur = +e.target.value));
$('turns').addEventListener('change', (e) => (state.turns = +e.target.value));
$('mat').addEventListener('change', (e) => { state.mat = e.target.value; parts.forEach((p) => tune(p.mesh.material)); });
$('bgSel').addEventListener('change', (e) => { state.bg = e.target.value; applyBg(); });
$('shadow').addEventListener('change', (e) => { state.shadow = e.target.checked; placeLights(); });
$('qual').addEventListener('change', (e) => (state.qual = +e.target.value));
$('fps').addEventListener('change', (e) => (state.fps = +e.target.value));
$('caption').addEventListener('input', (e) => { state.caption = e.target.value; updateCapPreview(); });
$('playBtn').addEventListener('click', () => {
  state.playing = !state.playing; $('playBtn').setAttribute('aria-pressed', String(state.playing));
  $('playBtn').textContent = t(state.playing ? 'Pausar giro' : 'Girar');
});
$('resetBtn').addEventListener('click', () => {
  for (const [el, v] of defaults) {
    if (el.type === 'checkbox') el.checked = v; else el.value = v;
    el.dispatchEvent(new Event(el.type === 'range' || el.type === 'text' ? 'input' : 'change'));
  }
  defaultSegs.forEach((b) => b.click());
  state.angle = 0;
  if (parts.length) autoPose(recenter()); else setPose('print');
  setStatus(t('Ajustes restaurados.'), 'ok');
});
$('frameBtn').addEventListener('click', () => { state.angle = 0; frameCamera(); });
$('simBtn').addEventListener('click', startSim);
$('recBtn').addEventListener('click', recordVideo);
$('snapBtn').addEventListener('click', snapshot);
$('cancelBtn').addEventListener('click', () => { cancelReq = true; if (sim) sim.cancel = true; });
$('saveAgainBtn').addEventListener('click', () => lastVideo && saveFile(lastVideo.blob, lastVideo.name));
$('clearBtn').addEventListener('click', () => { clearParts(); current3mf = null; show3mfControls(); afterChange(false); setStatus(''); });
$('plateSel').addEventListener('change', reload3mf);
$('copies').addEventListener('change', reload3mf);
$('sampleBtn').addEventListener('click', () => loadSample().catch(() => setStatus(t('No pude abrir el ejemplo.'), 'warn')));
for (const [id, add] of [['fileIn', false], ['fileIn2', false], ['fileAdd', true]])
  $(id).addEventListener('change', (e) => { loadFiles(e.target.files, add); e.target.value = ''; });
// arrastrar y soltar en toda la ventana
let depth = 0;
window.addEventListener('dragenter', (e) => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); depth++; $('drop').hidden = false; } });
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('dragleave', () => { if (--depth <= 0) { depth = 0; $('drop').hidden = true; } });
window.addEventListener('drop', (e) => { e.preventDefault(); depth = 0; $('drop').hidden = true; if (e.dataTransfer.files.length) loadFiles(e.dataTransfer.files, e.shiftKey); });

// idioma: reescribe los textos fijos y los que arma el programa
function applyLang() {
  [...$('langSeg').children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === lang)));
  $('playBtn').textContent = t(state.playing ? 'Pausar giro' : 'Girar');
  if (current3mf) [...$('plateSel').options].forEach((o, i) => (o.textContent = t('Placa {0}', current3mf.doc.plates[i])));
  renderChips(); renderParts();
  if (!parts.length) setStatus(t('Arrastrá un 3MF o uno o varios STL a la ventana para empezar.'));
}
seg('langSeg', null, null, (v) => setLang(v, applyLang));

applyBg(); layoutStage(); applyPose(); frameCamera();
setLang(lang, applyLang);
requestAnimationFrame(tick);
window.__showcase = { state, parts: () => parts };
