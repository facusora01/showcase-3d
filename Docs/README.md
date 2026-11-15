# Showcase 3D — documentación interna

Visor de modelos 3D (3MF de OrcaSlicer/Bambu y STL) que muestra la pieza con los
colores reales de los filamentos y graba un video MP4 girando para mandarle al
cliente. Se distribuye de dos formas con el mismo código:

- Página web: https://showcase3d.facundosorasio.com/ (GitHub Pages, se publica en cada push a `main`).
- `.exe` de Windows (Neutralinojs + WebView2), un solo archivo de unos 4 MB.

El README de la raíz explica uso, compilación y qué hace cada archivo.

## Decisiones de diseño

- **Un solo HTML autocontenido.** `scripts/build-web.mjs` mete JS, fuentes e íconos
  en `dist/Showcase 3D.html`. Así la web y el `.exe` son lo mismo y funciona sin internet.
- **Todo corre en el navegador.** El MP4 se arma con WebCodecs + mp4-muxer; no hay servidor.
  Para grabar hace falta Chrome o Edge.
- **Diseño Sora 3D (Figma, nov 2026).** Estudio oscuro neutro, violeta solo para
  acción/selección/foco; tipografías Sora, Inter y JetBrains Mono. Los colores y
  medidas viven como variables en `:root` de `src/page.html`.
- **Escritorio:** la vista previa queda fija y solo scrollea el panel de ajustes.
- **Teléfono (≤ 600 px):** todo se apila en una columna. Mientras no hay modelo, el
  visor crece hasta contener el cartel inicial (no se corta el texto). Los botones
  con texto largo toman el ancho de su texto y bajan de línea en vez de cortarse
  con "…". En ≤ 400 px "Dar vuelta" va en su propia fila sobre X/Y/Z.
- **Idioma:** español por defecto si el navegador está en español; si no, inglés.
  Se guarda en `localStorage`.
