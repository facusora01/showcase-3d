// Lector de 3MF (núcleo + extensión de producción de Bambu/OrcaSlicer, pintura multicolor y colores de filamento)
import { unzipSync, strFromU8 } from 'fflate';
import * as THREE from 'three';

const UNIT = { micron: 0.001, millimeter: 1, centimeter: 10, inch: 25.4, foot: 304.8, meter: 1000 };
const attr = (s, name) => { const m = new RegExp('(?:^|\\s)' + name + '="([^"]*)"').exec(s); return m ? m[1] : null; };

function mat3mf(t) {
  const m = new THREE.Matrix4();
  if (!t) return m;
  const v = t.trim().split(/\s+/).map(Number);
  if (v.length !== 12) return m;
  // 3MF usa vectores fila: p' = p * M (4x3)
  m.set(v[0], v[3], v[6], v[9], v[1], v[4], v[7], v[10], v[2], v[5], v[8], v[11], 0, 0, 0, 1);
  return m;
}

// --- pintura de OrcaSlicer/Prusa (TriangleSelector serializado en hex) ---
function paintState(hex) {
  // devuelve el estado (0 = sin pintar, n = filamento n) dominante del triángulo
  let ni = hex.length - 1, bitPos = 0, cur = 0;
  const nextNib = () => { if (ni < 0) return 0; const c = parseInt(hex[ni--], 16); return isNaN(c) ? 0 : c; };
  cur = nextNib();
  const bit = () => { if (bitPos === 4) { cur = nextNib(); bitPos = 0; } return (cur >> bitPos++) & 1; };
  const bits = (n) => { let v = 0; for (let i = 0; i < n; i++) v |= bit() << i; return v; };
  const counts = new Map();
  const node = (depth) => {
    if (depth > 24) return;
    const split = bits(2);
    if (split) { bits(2); for (let i = 0; i <= split; i++) node(depth + 1); return; }
    let st = bits(2);
    if (st === 3) st = 3 + bits(4);
    const w = Math.pow(4, -depth); // los hijos chicos pesan menos
    counts.set(st, (counts.get(st) || 0) + w);
  };
  node(0);
  let best = 0, bw = -1;
  for (const [s, w] of counts) if (w > bw) { bw = w; best = s; }
  return best;
}

function parseModelXml(xml, unitScale) {
  // objetos: id -> {name, mesh:{pos:Float32Array, tri:Uint32Array, paint:Int16Array|null, pid, pindex}, components:[{path, objectid, m}]}
  const objects = new Map();
  const reObj = /<object\b([^>]*)>([\s\S]*?)<\/object>/g;
  let om;
  while ((om = reObj.exec(xml))) {
    const a = om[1], body = om[2];
    const id = attr(a, 'id');
    const o = { id, name: attr(a, 'name') || '', type: attr(a, 'type') || 'model', pid: attr(a, 'pid'), pindex: attr(a, 'pindex'), mesh: null, components: [] };
    const vi = body.indexOf('<vertices');
    if (vi >= 0) {
      const ve = body.indexOf('</vertices>', vi);
      const vs = body.slice(vi, ve);
      const pos = [];
      const rv = /<vertex\b([^>]*)\/?>/g; let v;
      while ((v = rv.exec(vs))) pos.push(+attr(v[1], 'x') * unitScale, +attr(v[1], 'y') * unitScale, +attr(v[1], 'z') * unitScale);
      const ti = body.indexOf('<triangles', ve), te = body.indexOf('</triangles>', ti);
      const ts = body.slice(ti, te);
      const tri = [], paint = [], tcol = []; let hasPaint = false;
      const rt = /<triangle\b([^>]*)\/?>/g; let t;
      while ((t = rt.exec(ts))) {
        const s = t[1];
        tri.push(+attr(s, 'v1'), +attr(s, 'v2'), +attr(s, 'v3'));
        const pc = attr(s, 'paint_color') || attr(s, 'slic3rpe:mmu_segmentation');
        if (pc) { hasPaint = true; paint.push(paintState(pc)); } else paint.push(0);
        const tp = attr(s, 'p1'); tcol.push(tp !== null ? +tp : -1);
      }
      o.mesh = { pos: new Float32Array(pos), tri: new Uint32Array(tri), paint: hasPaint ? Int16Array.from(paint) : null, tpidx: tcol, tpid: null };
    }
    const rc = /<component\b([^>]*)\/?>/g; let c;
    while ((c = rc.exec(body))) {
      const s = c[1];
      o.components.push({ path: attr(s, 'p:path'), objectid: attr(s, 'objectid'), m: mat3mf(attr(s, 'transform')) });
    }
    objects.set(id, o);
  }
  // colores del núcleo 3MF (basematerials / colorgroup)
  const colors = new Map();
  const rb = /<(?:basematerials|m:colorgroup|colorgroup)\b([^>]*)>([\s\S]*?)<\/(?:basematerials|m:colorgroup|colorgroup)>/g; let b;
  while ((b = rb.exec(xml))) {
    const gid = attr(b[1], 'id'); const list = [];
    const re = /<(?:base|m:color|color)\b([^>]*)\/?>/g; let e;
    while ((e = re.exec(b[2]))) { const col = attr(e[1], 'displaycolor') || attr(e[1], 'color'); if (col) list.push(col.slice(0, 7)); }
    colors.set(gid, list);
  }
  const build = [];
  const bi = xml.indexOf('<build');
  if (bi >= 0) {
    const rI = /<item\b([^>]*)\/?>/g; rI.lastIndex = bi; let it;
    while ((it = rI.exec(xml))) build.push({ objectid: attr(it[1], 'objectid'), m: mat3mf(attr(it[1], 'transform')), printable: attr(it[1], 'printable') !== '0' });
  }
  return { objects, colors, build };
}

export function parse3MF(buffer) {
  const files = unzipSync(new Uint8Array(buffer));
  const get = (p) => { p = p.replace(/^\//, ''); const k = Object.keys(files).find((f) => f.toLowerCase() === p.toLowerCase()); return k ? files[k] : null; };
  // modelo raíz desde _rels/.rels
  let rootPath = '3D/3dmodel.model';
  const rels = get('_rels/.rels');
  if (rels) { const m = /Target="([^"]+\.model)"/i.exec(strFromU8(rels)); if (m) rootPath = m[1].replace(/^\//, ''); }
  const rootU8 = get(rootPath);
  if (!rootU8) throw new Error('el 3MF no tiene modelo 3D');
  const models = new Map();
  const loadModel = (path) => {
    path = (path || rootPath).replace(/^\//, '');
    if (models.has(path)) return models.get(path);
    const u8 = get(path); if (!u8) return null;
    const xml = strFromU8(u8);
    const unit = UNIT[(/<model\b[^>]*\bunit="([^"]+)"/.exec(xml) || [])[1]] || 1;
    const parsed = parseModelXml(xml, unit);
    models.set(path, parsed); return parsed;
  };
  const root = loadModel(rootPath);

  // ajustes de OrcaSlicer/Bambu: filamento por pieza, colores de filamento, placas
  const cfgXml = get('Metadata/model_settings.config') ? strFromU8(get('Metadata/model_settings.config')) : '';
  const objCfg = new Map(); // objectId -> {name, extruder, parts: Map(partId -> {name, extruder, subtype})}
  const rO = /<object id="(\d+)">([\s\S]*?)<\/object>/g; let o;
  while ((o = rO.exec(cfgXml))) {
    const body = o[2];
    const head = body.split('<part')[0];
    const meta = (s, k) => { const m = new RegExp('<metadata key="' + k + '" value="([^"]*)"').exec(s); return m ? m[1] : null; };
    const parts = new Map();
    const rP = /<part id="(\d+)"(?: subtype="([^"]*)")?>([\s\S]*?)<\/part>/g; let p;
    while ((p = rP.exec(body))) parts.set(p[1], { name: meta(p[3], 'name'), extruder: +(meta(p[3], 'extruder') || 0), subtype: p[2] || 'normal_part' });
    objCfg.set(o[1], { name: meta(head, 'name'), extruder: +(meta(head, 'extruder') || 1), parts });
  }
  const plates = [];
  const rPl = /<plate>([\s\S]*?)<\/plate>/g; let pl;
  while ((pl = rPl.exec(cfgXml))) {
    const id = +((/<metadata key="plater_id" value="(\d+)"/.exec(pl[1]) || [])[1] || plates.length + 1);
    const inst = []; const rMi = /<model_instance>([\s\S]*?)<\/model_instance>/g; let mi;
    while ((mi = rMi.exec(pl[1]))) inst.push({ objectId: (/key="object_id" value="(\d+)"/.exec(mi[1]) || [])[1], instance: +((/key="instance_id" value="(\d+)"/.exec(mi[1]) || [])[1] || 0) });
    plates.push({ id, inst });
  }
  let filamentColors = null;
  const ps = get('Metadata/project_settings.config');
  if (ps) { try { const j = JSON.parse(strFromU8(ps)); if (Array.isArray(j.filament_colour)) filamentColors = j.filament_colour.map((c) => c.slice(0, 7)); } catch (e) {} }

  // instancias: k-ésimo item de build con ese objectid = instance_id k
  const itemsByObj = new Map();
  root.build.forEach((it) => { if (!itemsByObj.has(it.objectid)) itemsByObj.set(it.objectid, []); itemsByObj.get(it.objectid).push(it); });

  function collect(model, objId, M, out, rootObjId, partHint) {
    const ob = model.objects.get(objId); if (!ob) return;
    if (ob.type === 'support' || ob.type === 'other') return;
    if (ob.mesh) out.push({ ob, M: M.clone(), rootObjId, partId: partHint || objId, model });
    for (const c of ob.components) {
      const sub = c.path ? loadModel(c.path) : model;
      if (!sub) continue;
      collect(sub, c.objectid, M.clone().multiply(c.m), out, rootObjId, c.objectid);
    }
  }

  function buildParts(plateIdx = 0, allCopies = false) {
    let items;
    if (plates.length) {
      const P = plates[Math.min(plateIdx, plates.length - 1)];
      items = [];
      const seen = new Set();
      for (const { objectId, instance } of P.inst) {
        if (seen.has(objectId)) { if (!allCopies) continue; }
        const list = itemsByObj.get(objectId) || [];
        if (allCopies) { if (!seen.has(objectId)) items.push(...list); }
        else { const it = list[instance] || list[0]; if (it) items.push(it); }
        seen.add(objectId);
      }
    } else {
      const seen = new Set();
      items = root.build.filter((it) => { if (allCopies) return true; if (seen.has(it.objectid)) return false; seen.add(it.objectid); return true; });
    }
    const groups = new Map(); // clave nombre+filamento -> {name, color, arrays}
    const v = new THREE.Vector3();
    for (const it of items) {
      const out = [];
      collect(root, it.objectid, it.m.clone(), out, it.objectid);
      const oc = objCfg.get(it.objectid);
      for (const { ob, M, partId, model } of out) {
        const pc = oc && oc.parts.get(partId);
        if (pc && pc.subtype && pc.subtype !== 'normal_part') continue; // modificadores, bloqueadores, negativos
        const baseExt = (pc && pc.extruder) || (oc && oc.extruder) || 1;
        const partName = (pc && pc.name) || ob.name || (oc && oc.name) || 'Pieza';
        // color del núcleo 3MF si lo hay
        let coreColor = null;
        if (ob.pid && model.colors.has(ob.pid)) coreColor = model.colors.get(ob.pid)[+ob.pindex || 0] || null;
        const { pos, tri, paint } = ob.mesh;
        for (let t = 0; t < tri.length / 3; t++) {
          const ext = paint && paint[t] > 0 ? paint[t] : baseExt;
          const key = partName + '|' + ext + '|' + (paint ? 'p' : '');
          let g = groups.get(key);
          if (!g) {
            g = { partName, ext, painted: !!paint, coreColor, data: [] };
            groups.set(key, g);
          }
          for (let k = 0; k < 3; k++) {
            const i = tri[t * 3 + k] * 3;
            v.set(pos[i], pos[i + 1], pos[i + 2]).applyMatrix4(M);
            g.data.push(v.x, v.y, v.z);
          }
        }
      }
    }
    const res = [];
    const multiExt = new Set([...groups.values()].map((g) => g.ext)).size > 1;
    for (const g of groups.values()) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(g.data), 3));
      const nm = g.partName.replace(/\.stl$/i, '') + (multiExt || g.painted ? ' · filamento ' + g.ext : '');
      const color = (filamentColors && filamentColors[g.ext - 1]) || g.coreColor || null;
      res.push({ name: nm, geometry: geo, color, ext: g.ext });
    }
    res.sort((a, b) => a.ext - b.ext);
    return res;
  }

  const copies = root.build.length > new Set(root.build.map((b) => b.objectid)).size;
  return { plates: plates.length ? plates.map((p) => p.id) : [1], hasCopies: copies, buildParts, filamentColors };
}
