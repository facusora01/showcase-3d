// Compila el .exe de Windows (un solo archivo, con la app embebida y el ícono propio)
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as ResEdit from 'resedit';
import * as PELibrary from 'pe-library';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = path.join(root, 'app');
const run = (cmd) => execSync(cmd, { cwd: app, stdio: 'inherit' });

// binarios de Neutralino y su cliente JS (se descargan una sola vez)
const bin = path.join(app, 'bin', 'neutralino-win_x64.exe');
if (!fs.existsSync(bin) || !fs.existsSync(path.join(app, 'resources', 'js', 'neutralino.js'))) run('npx neu update');

// ícono y datos del ejecutable, sobre una copia limpia del binario
const orig = bin.replace('.exe', '.orig.exe');
if (!fs.existsSync(orig)) fs.copyFileSync(bin, orig);
const exe = PELibrary.NtExecutable.from(fs.readFileSync(orig), { ignoreCert: true });
const res = PELibrary.NtExecutableResource.from(exe);
const ico = ResEdit.Data.IconFile.from(fs.readFileSync(path.join(root, 'assets', 'icon.ico')));
const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, groups.length ? groups[0].id : 1, groups.length ? groups[0].lang : 1033, ico.icons.map((i) => i.data));
res.outputResource(exe);
fs.writeFileSync(bin, Buffer.from(exe.generate()));

run('npx neu build --release --embed-resources');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.copyFileSync(path.join(app, 'dist', 'Showcase3D', 'Showcase3D-win_x64.exe'), path.join(root, 'dist', 'Showcase 3D.exe'));
console.log('Listo: dist/Showcase 3D.exe');
