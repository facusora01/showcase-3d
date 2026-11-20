# Bitácora

## 2026-11-20 — Link violeta, favicon, luz y PLA

**Qué se hizo**
- Vista previa del link (`assets/og.jpg`): rehecha con el diseño nuevo (isotipo, "3D" en
  violeta, brillo violeta detrás del modelo, etiqueta violeta). Armada en HTML y capturada
  con Chrome headless; el modelo es el recorte del render anterior.
- Favicon: el isotipo es angosto (17x28) y el SVG tenía `preserveAspectRatio="none"`, así
  que la pestaña lo estiraba. `build-web.mjs` ahora lo centra en un lienzo cuadrado.
- Luz: la dirección gira 360° (antes ±90°) y hay un slider nuevo "Altura luz" (5°–85°,
  inicio 42°, igual que antes). Intensidad ya existía.
- PLA menos brillante (roughness 0.85, envMap 0.3, specular 0.4). Terminaciones renombradas
  a PLA, Silk, PETG, Resina (Facu pidió sacar "Brillante").

**Probado:** `npm test`, build web, captura del panel en Chrome headless.
**No probado:** cómo se ve el PLA nuevo con un modelo cargado; WhatsApp cachea la vista
previa vieja, puede tardar en refrescarse.

**Por dónde seguir:** ver `PLAN.md`.

## 2026-11-15 — Caja "Último video"

**Qué se hizo**
- Facu reportó que al terminar de grabar, la caja "Último video" aplastaba el visor
  y no había forma de cerrarla.
- Causa: `.stage` tiene alto fijo (lo calcula `app.js`) pero era hijo flex de `.stagewrap`,
  que en escritorio tiene alto fijo; al aparecer el video, flexbox achicaba el visor.
  Arreglo: `.stagewrap>*{flex:none}`; ahora el video queda abajo y `.stagewrap` scrollea.
- Botón "Cerrar" (ícono `close`) en la caja: pausa el video y la oculta.

**Probado:** en Chrome, el alto del visor no cambia con la caja visible; botón traducido (Close).
**No probado:** grabación real de punta a punta (se mostró la caja a mano).

**Por dónde seguir:** ver `PLAN.md`.

## 2026-11-15 — Arreglo del diseño en teléfono

**Qué se hizo**
- Facu reportó que en el teléfono los textos se salían de los recuadros y había cosas desparejas.
- Reproducido con Chrome headless a 320, 360 y 412 px, en español y en inglés. Problemas encontrados:
  - El cartel inicial ("Arrastrá tu 3MF…") no entraba en el visor cuadrado: el título
    tocaba el borde y los botones cruzaban el marco punteado.
  - "Foto PNG / Simular video" se salía del panel por la derecha.
  - "Abrir… / Agregar…", "Como se imprime" y "X 90° / Y 90° / Z 90°" quedaban cortados con "…".
  - En el encabezado la barrita separadora quedaba suelta y ES/EN en una fila aparte.
- Arreglo solo con CSS en `src/page.html` (media queries ≤ 600 px y ≤ 400 px, y `.two`
  con `auto-fit`). Escritorio sin cambios.
- Se creó esta carpeta `Docs/`.

**Probado:** capturas headless a 320/360/412 px antes y después. **No probado:** teléfono real.

**Por dónde seguir:** ver `PLAN.md`, pendiente de probar en teléfono real.

## Antes de esta bitácora (resumen del historial de git)

- 2026-10-27: primera versión ("Vitrina 3D").
- 2026-10-29: renombre a Showcase 3D, inglés, GitHub Pages, vista previa de links, dominio propio.
- 2026-11-11: rediseño Sora 3D desde Figma; vista previa fija en escritorio.
- 2026-11-13: zoom con la rueda limitado.
