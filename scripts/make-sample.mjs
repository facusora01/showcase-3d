// Genera src/sample.json: escultura de ejemplo en 3 colores (base, columna retorcida y esfera), Z hacia arriba, en mm
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// une anillos cerrados (todos con la misma cantidad de puntos, en sentido antihorario visto desde arriba) y tapa los extremos
function loft(rings, bottom, top) {
  const pos = [], idx = [], n = rings[0].length;
  for (const ring of rings) for (const p of ring) pos.push(...p);
  const at = (i, j) => i * n + (j % n);
  for (let i = 0; i < rings.length - 1; i++)
    for (let j = 0; j < n; j++) idx.push(at(i, j), at(i, j + 1), at(i + 1, j + 1), at(i, j), at(i + 1, j + 1), at(i + 1, j));
  const b = pos.length / 3; pos.push(...bottom);
  for (let j = 0; j < n; j++) idx.push(b, at(0, j + 1), at(0, j));
  const t = pos.length / 3, last = rings.length - 1; pos.push(...top);
  for (let j = 0; j < n; j++) idx.push(t, at(last, j), at(last, j + 1));
  return { pos, idx };
}
const circle = (r, z, n, f = () => r) => Array.from({ length: n }, (_, j) => {
  const a = (j / n) * 2 * Math.PI, rr = f(a);
  return [rr * Math.cos(a), rr * Math.sin(a), z];
});

// pedestal con chanfle arriba
const base = loft([circle(26, 0, 128), circle(26, 6, 128), circle(24, 8, 128)], [0, 0, 0], [0, 0, 8]);

// columna de 5 lóbulos que se retuerce y se ensancha en el medio
const H = 100, Z0 = 7.5;
const col = [];
for (let i = 0; i <= 160; i++) {
  const u = i / 160, z = Z0 + u * H;
  const R = 10 + 9 * Math.sin(Math.PI * u) ** 1.4, tw = u * Math.PI * 0.9;
  col.push(circle(0, z, 180, (a) => R * (1 + 0.16 * Math.cos(5 * (a - tw)))));
}
const column = loft(col, [0, 0, Z0], [0, 0, Z0 + H]);

// esfera apoyada arriba
const SR = 9, SZ = Z0 + H + SR - 1.5, sph = [];
for (let i = 1; i < 48; i++) {
  const ph = (i / 48) * Math.PI;
  sph.push(circle(SR * Math.sin(ph), SZ - SR * Math.cos(ph), 96));
}
const sphere = loft(sph, [0, 0, SZ - SR], [0, 0, SZ + SR]);

const pack = (name, { pos, idx }) => {
  const buf = Buffer.alloc(pos.length * 4 + idx.length * 4);
  new Float32Array(buf.buffer, buf.byteOffset, pos.length).set(pos);
  new Uint32Array(buf.buffer, buf.byteOffset + pos.length * 4, idx.length).set(idx);
  return { name, nv: pos.length / 3, ni: idx.length, data: zlib.gzipSync(buf, { level: 9 }).toString('base64') };
};
const out = [pack('Negro', base), pack('Naranja', column), pack('Dorado', sphere)];
fs.writeFileSync(path.join(root, 'src', 'sample.json'), JSON.stringify(out));
console.log('Ejemplo listo: src/sample.json', out.map((p) => `${p.name} ${p.ni / 3} triángulos`).join(', '));
