// Prueba mínima del lector 3MF: node scripts/test-3mf.mjs
import assert from 'node:assert';
import { zipSync, strToU8 } from 'fflate';
import { parse3MF } from '../src/threemf.js';

const tri = (a, b, c, extra = '') => `<triangle v1="${a}" v2="${b}" v3="${c}"${extra}/>`;
const model = `<?xml version="1.0"?><model unit="centimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
<resources><object id="1" name="cubo.stl" type="model"><mesh><vertices>
<vertex x="0" y="0" z="0"/><vertex x="1" y="0" z="0"/><vertex x="0" y="1" z="0"/><vertex x="0" y="0" z="1"/>
</vertices><triangles>${tri(0, 1, 2)}${tri(0, 1, 3, ' paint_color="8"')}</triangles></mesh></object></resources>
<build><item objectid="1"/><item objectid="1" transform="1 0 0 0 1 0 0 0 1 50 0 0"/></build></model>`;
const buf = zipSync({
  '3D/3dmodel.model': strToU8(model),
  'Metadata/project_settings.config': strToU8(JSON.stringify({ filament_colour: ['#FF0000FF', '#00FF00FF'] })),
});

const doc = parse3MF(buf.buffer);
assert.strictEqual(doc.hasCopies, true);
const one = doc.buildParts(0, false);
assert.strictEqual(one.length, 2, 'una cara sin pintar + una pintada con filamento 2');
assert.deepStrictEqual(one.map((p) => [p.ext, p.color]), [[1, '#FF0000'], [2, '#00FF00']]);
const xs = one[0].geometry.attributes.position.array;
assert.strictEqual(Math.max(...xs), 10, 'centímetros a milímetros');
assert.strictEqual(doc.buildParts(0, true)[0].geometry.attributes.position.count, 6, 'con copias');
console.log('3MF ok');
