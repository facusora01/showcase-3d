// Idiomas: el texto en español es la clave; EN tiene la traducción. {0}, {1}… son valores.
const EN = {
  // interfaz fija (src/page.html)
  'Arrastrá un 3MF o tus STL y generá un video girando para mostrarle al cliente.': 'Drop a 3MF or your STLs and make a spinning video to show your client.',
  'Vista 3D': '3D view',
  'Arrastrá tu 3MF o tus STL acá': 'Drop your 3MF or STLs here',
  'Un 3MF de OrcaSlicer se abre con la pieza completa y los colores de tus filamentos. Con STL sueltos, cada archivo es una pieza y le elegís el color; si el nombre dice el color (Blanco, Negro, Rojo…), se pinta solo.':
    'An OrcaSlicer 3MF opens with the whole part and your filament colors. With loose STLs, each file is a part and you pick its color; if the name says the color (White, Black, Red…), it gets painted automatically.',
  'Elegir 3MF o STL': 'Choose 3MF or STL',
  'Ver un ejemplo': 'See an example',
  'Soltá el 3MF o los STL': 'Drop the 3MF or STLs',
  'Grabando…': 'Recording…',
  'Cancelar': 'Cancel',
  'Arrastrá sobre la vista para cambiar el ángulo y usá la rueda para acercar. El video arranca siempre de frente, con la altura y el tamaño que elijas.':
    'Drag on the view to change the angle and use the wheel to zoom. The video always starts from the front, with the height and size you choose.',
  'Pausar giro': 'Pause spin',
  'Girar': 'Spin',
  'Reencuadrar': 'Reframe',
  'Último video': 'Last video',
  'Guardar de nuevo': 'Save again',
  'Controles': 'Controls',
  'Piezas': 'Parts',
  'Abrir…': 'Open…',
  'Suma piezas sin borrar las actuales': 'Adds parts without removing the current ones',
  'Agregar…': 'Add…',
  'Vaciar': 'Clear',
  'Placa': 'Plate',
  'Mostrar todas las copias de la placa': 'Show all copies on the plate',
  'Colores de filamento': 'Filament colors',
  'Rotar pieza': 'Rotate part',
  'Muestra la cara de abajo (piezas que se imprimen boca abajo)': 'Shows the bottom face (parts printed upside down)',
  'Dar vuelta': 'Flip',
  'Movimiento': 'Motion',
  'Posición': 'Position',
  'Como se imprime': 'As printed',
  'De frente': 'Front',
  'Duración': 'Duration',
  '5 segundos': '5 seconds', '10 segundos': '10 seconds', '15 segundos': '15 seconds', '20 segundos': '20 seconds', '30 segundos': '30 seconds',
  'Vueltas': 'Turns',
  'Media vuelta': 'Half turn', '1 vuelta': '1 turn', '2 vueltas': '2 turns', '3 vueltas': '3 turns',
  'Sentido': 'Direction',
  'Izquierda': 'Left',
  'Derecha': 'Right',
  'Altura cámara': 'Camera height',
  'Tamaño': 'Size',
  'Luz y material': 'Light and material',
  'Terminación': 'Finish',
  'Mate (PLA)': 'Matte (PLA)', 'Seda': 'Silk', 'Brillante (PETG)': 'Glossy (PETG)', 'Resina': 'Resin',
  'Intensidad': 'Intensity',
  'Dirección': 'Angle',
  'Fondo': 'Background',
  'Estudio oscuro': 'Dark studio', 'Gris claro': 'Light grey',
  'Sombra en el piso': 'Floor shadow',
  'Formato': 'Format',
  'Calidad': 'Quality',
  'Fluidez': 'Frame rate',
  '30 cuadros/s': '30 fps', '60 cuadros/s': '60 fps',
  'Texto': 'Caption',
  'Opcional: nombre del cliente o del modelo': 'Optional: client or model name',
  'Simular video': 'Preview video',
  'Foto PNG': 'PNG photo',
  'Grabar video MP4': 'Record MP4 video',
  // colores de filamento
  'Negro': 'Black', 'Blanco': 'White', 'Gris': 'Grey', 'Plateado': 'Silver', 'Rojo': 'Red', 'Naranja': 'Orange',
  'Amarillo': 'Yellow', 'Verde': 'Green', 'Azul': 'Blue', 'Azul oscuro': 'Navy', 'Violeta': 'Purple',
  'Dorado': 'Gold', 'Marrón': 'Brown',
  // mensajes (src/app.js)
  'Color de {0}': 'Color of {0}',
  'Quitar esta pieza': 'Remove this part',
  'Tocá una pieza y elegí su color abajo.': 'Click a part and pick its color below.',
  'Pintar la pieza seleccionada de {0}': 'Paint the selected part {0}',
  'Solo abre archivos .stl y .3mf.': 'Only .stl and .3mf files can be opened.',
  'Leyendo {0}…': 'Reading {0}…',
  'No pude leer {0}: {1}': 'Could not read {0}: {1}',
  'el 3MF no tiene modelo 3D': 'the 3MF has no 3D model',
  ' Abrí solo el primer 3MF ({0}).': ' Opened only the first 3MF ({0}).',
  ' Ignoré {0} archivo(s) que no son STL ni 3MF.': ' Ignored {0} file(s) that are not STL or 3MF.',
  'No pude leer {0} archivo(s).': 'Could not read {0} file(s).',
  'Listo: {0} pieza(s) de color, {1} triángulos.': 'Done: {0} color part(s), {1} triangles.',
  'Placa {0}': 'Plate {0}',
  'Mostrando {0}.': 'Showing {0}.',
  'Mostrando {0} con todas las copias.': 'Showing {0} with all copies.',
  'Ejemplo {0}': 'Example {0}',
  'Ejemplo cargado. Arrastrá tus STL para reemplazarlo.': 'Example loaded. Drop your STLs to replace it.',
  'Simulación: {0} / {1} s': 'Preview: {0} / {1} s',
  'Primero cargá una pieza.': 'Load a part first.',
  'Así va a quedar el video. Si te gusta, tocá Grabar video MP4.': 'This is how the video will look. If you like it, click Record MP4 video.',
  'Guardar foto': 'Save photo',
  'Guardar video': 'Save video',
  'Imagen PNG': 'PNG image',
  'No se guardó. Usá “Guardar de nuevo” si lo querés.': 'Not saved. Use “Save again” if you want it.',
  'Guardado en {0}': 'Saved to {0}',
  'No se pudo guardar: {0}': 'Could not save: {0}',
  'Guardado: {0}': 'Saved: {0}',
  'Hay otra descarga esperando confirmación.': 'Another download is waiting for confirmation.',
  'Esta vista no permite descargar; usá la versión del escritorio.': 'This view does not allow downloads; use the desktop version.',
  'Guardado en tu carpeta Descargas: {0}': 'Saved to your Downloads folder: {0}',
  'pieza': 'part',
  'Generando video de {0} s…': 'Generating {0} s video…',
  'Generando video: {0}%': 'Generating video: {0}%',
  'Grabación cancelada.': 'Recording cancelled.',
  'este navegador no puede grabar video; usá Edge o Chrome actualizados.': 'this browser cannot record video; use an up-to-date Edge or Chrome.',
  'Grabando en tiempo real ({0} s)…': 'Recording in real time ({0} s)…',
  'No se pudo grabar: {0}': 'Could not record: {0}',
  'No pude abrir el ejemplo.': 'Could not open the example.',
  'Arrastrá un 3MF o uno o varios STL a la ventana para empezar.': 'Drop a 3MF or one or more STLs on the window to start.',
};

const stored = (() => { try { return localStorage.getItem('lang'); } catch (e) { return null; } })();
export let lang = stored === 'es' || stored === 'en' ? stored : /^es\b/i.test(navigator.language || '') ? 'es' : 'en';
export const locale = () => (lang === 'es' ? 'es-AR' : 'en-US');
export const t = (k, ...a) => ((lang === 'en' && EN[k]) || k).replace(/\{(\d)\}/g, (_, i) => a[i]);

// textos fijos del HTML: se anotan una vez (en español) y se reescriben al cambiar de idioma
const fixed = [];
export function initStatic(root) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) {
    const raw = n.nodeValue, k = raw.trim();
    if (EN[k]) fixed.push(() => (n.nodeValue = raw.replace(k, t(k))));
  }
  for (const el of root.querySelectorAll('[title],[placeholder],[aria-label]'))
    for (const a of ['title', 'placeholder', 'aria-label']) {
      const k = el.getAttribute(a);
      if (k && EN[k]) fixed.push(() => el.setAttribute(a, t(k)));
    }
}
export function setLang(l, after) {
  lang = l;
  try { localStorage.setItem('lang', l); } catch (e) {}
  document.documentElement.lang = l;
  fixed.forEach((f) => f());
  after && after();
}
