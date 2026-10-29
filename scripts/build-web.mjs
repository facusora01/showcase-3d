// Genera la app web en un solo HTML (sin internet: librerías, fuentes y ejemplo embebidos)
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const r = (...p) => path.join(root, ...p);
fs.mkdirSync(r('dist'), { recursive: true });

const out = await build({
  entryPoints: [r('src/app.js')], bundle: true, minify: true, format: 'iife',
  target: 'es2020', write: false, logLevel: 'warning',
});
const js = out.outputFiles[0].text.replace(/<\/script/g, '<\\/script');

const F = r('node_modules/@fontsource');
const face = (fam, file, w) => {
  const b = fs.readFileSync(path.join(F, file)).toString('base64');
  return `@font-face{font-family:"${fam}";font-style:normal;font-weight:${w};font-display:swap;src:url(data:font/woff2;base64,${b}) format("woff2")}\n`;
};
const fonts = [
  face('Barlow', 'barlow/files/barlow-latin-400-normal.woff2', 400),
  face('Barlow', 'barlow/files/barlow-latin-500-normal.woff2', 500),
  face('Barlow', 'barlow/files/barlow-latin-600-normal.woff2', 600),
  face('Barlow Semi Condensed', 'barlow-semi-condensed/files/barlow-semi-condensed-latin-600-normal.woff2', 600),
  face('Barlow Semi Condensed', 'barlow-semi-condensed/files/barlow-semi-condensed-latin-700-normal.woff2', 700),
].join('');

const page = fs.readFileSync(r('src/page.html'), 'utf8')
  .replace('/*FONTS*/', () => fonts)
  .replace('/*SAMPLE*/', () => fs.readFileSync(r('src/sample.json'), 'utf8'))
  .replace('/*BUNDLE*/', () => js);

// vista previa del link (WhatsApp, redes): la imagen la publica el workflow de GitHub Pages
const SITE = 'https://showcase3d.facundosorasio.com/';
const DESC = 'Mostrá tus modelos 3D (3MF y STL) con sus colores y generá un video girando para tus clientes. En español e inglés.';
const meta = [
  ['name', 'description', DESC], ['name', 'theme-color', '#0f1114'],
  ['property', 'og:type', 'website'], ['property', 'og:site_name', 'Showcase 3D'], ['property', 'og:title', 'Showcase 3D'],
  ['property', 'og:description', DESC], ['property', 'og:url', SITE],
  ['property', 'og:image', SITE + 'og.png'], ['property', 'og:image:width', '1200'], ['property', 'og:image:height', '630'],
  ['property', 'og:image:alt', 'Showcase 3D: modelo 3D naranja girando'], ['name', 'twitter:card', 'summary_large_image'],
].map(([k, n, v]) => `<meta ${k}="${n}" content="${v}">`).join('');
const wrap = (body) => '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' + meta + '<link rel="icon" href="favicon.png"></head><body>' + body + '</body></html>';

// 1) versión para abrir en el navegador
fs.writeFileSync(r('dist', 'Showcase 3D.html'), wrap(page));
// 2) versión para el programa de escritorio (agrega el cliente de Neutralino)
const i = page.lastIndexOf('<script>');
const desk = page.slice(0, i) + '<script src="/js/neutralino.js"></script>\n' + page.slice(i);
fs.mkdirSync(r('app/resources'), { recursive: true });
fs.writeFileSync(r('app/resources/index.html'), wrap(desk));
console.log('Web lista: dist/Showcase 3D.html y app/resources/index.html');
