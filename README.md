# Showcase 3D

Programa para Windows y página web que muestra modelos 3D con sus colores reales y genera un video girando para mandarle al cliente.

- Abre **3MF** (incluidos los proyectos de OrcaSlicer, con los colores de los filamentos, pintura a mano y placas) y **STL**.
- Vista previa en vivo, simulación del video y grabación en **MP4 (H.264)**, listo para WhatsApp.
- Duración, vueltas, sentido, altura de cámara, tamaño, luz, terminación (mate, seda, brillante, resina), fondo y texto opcional.
- Formatos 1:1, 4:5, 9:16 y 16:9, en HD o Full HD, a 30 o 60 cuadros por segundo.
- En español o inglés (botón ES / EN arriba a la derecha).
- Versión web: https://showcase3d.facundosorasio.com/ (Chrome o Edge para grabar video).
- Funciona sin internet. El `.exe` es un solo archivo de unos 4 MB.

## Uso

1. Doble clic en `Showcase 3D.exe`.
2. Arrastrá un `.3mf` o uno o varios `.stl` a la ventana (o usá **Abrir…**).
3. Ajustá la presentación y tocá **Simular video** para verlo, o **Grabar video MP4** para guardarlo.

La primera vez Windows puede mostrar "Windows protegió su PC" porque el ejecutable no está firmado: **Más información → Ejecutar de todas formas**.

## Cómo está hecho

| Parte | Qué hace |
|---|---|
| `src/page.html` | Interfaz (HTML y CSS). |
| `src/app.js` | Escena 3D (three.js), controles, simulación, grabación de video (WebCodecs + mp4-muxer) y guardado. |
| `src/i18n.js` | Textos en inglés y cambio de idioma. |
| `src/threemf.js` | Lector de 3MF: núcleo, extensión de producción de OrcaSlicer/Bambu, colores de filamento, pintura multicolor, placas y copias. |
| `src/sample.json` | Escultura de ejemplo comprimida (la genera `scripts/make-sample.mjs`). |
| `app/` | Proyecto de [Neutralinojs](https://neutralino.js.org): la ventana usa WebView2, que ya viene en Windows 10 y 11. |
| `scripts/build-web.mjs` | Empaqueta todo en un solo HTML (librerías y fuentes embebidas). |
| `scripts/build-exe.mjs` | Compila el `.exe` con la app embebida y el ícono. |

## Compilar

Requiere [Node.js](https://nodejs.org) 18 o superior.

```bash
npm install
npm run build
```

Resultado en `dist/`:

- `Showcase 3D.exe`: el programa de escritorio.
- `Showcase 3D.html`: la misma app para abrir en el navegador.

La primera compilación descarga los binarios de Neutralinojs (`npx neu update`); las siguientes funcionan sin internet.

Cada push a `main` publica la versión web en GitHub Pages (`.github/workflows/pages.yml`).

## Notas

- La pintura a mano de OrcaSlicer se lee por triángulo. Si un triángulo fue subdividido al pintar, toma el color que ocupa más superficie.
- Las piezas que se imprimen boca abajo se muestran con **Dar vuelta**.
