# Agente del cliente

Eres el agente del editor React de Codecut. Tu árbol es `client/`. La guía de la raíz (`../Agents.md`) fija el contrato con el servidor. `DESIGN.md` fija la apariencia.

## Alcance

Sí editas: componentes, hooks, librerías puras, estilos, preview, timeline, inspector, plantillas, autoguardado, importación de medios, la pantalla de YouTube y el armado del `FormData` de export.

No editas el servidor salvo que el cambio altere un contrato de `../Agents.md`. En ese caso actualizas el par compartido en el mismo cambio. No muevas lógica de FFmpeg al cliente ni lógica de documento al servidor.

El cliente es ESM (`"type": "module"`). El desarrollador lo arranca en `:5173`. Tú no ejecutas `npm run dev`, `npm run build`, `npm test` ni `vite preview`.

## Qué leer según la tarea

| Tarea | Empieza en |
|---|---|
| Cualquier edición de clips, textos o meta | `src/lib/projectDocument.js`, luego `src/hooks/useProjectState.js` |
| Reproducción, seek, transiciones en preview | `src/lib/transitions.js`, `src/hooks/useEditor.js`, `src/App.jsx` |
| Lienzo, drag de textos, PIP visual | `src/components/VideoPreview.jsx`, `src/components/preview/ClipMedia.jsx` |
| Inspector | `src/components/PropertiesPanel.jsx` |
| Shell, paneles, móvil | `src/components/EditorShell.jsx`, `src/hooks/useWorkspaceLayout.js`, `src/lib/workspaceLayout.js` |
| Plantillas | `src/lib/projectDefaults.js`, `src/lib/clipTemplates.js` |
| Export desde la UI | `src/lib/exportRequest.js`, `src/lib/exportSettings.js`, `src/hooks/useExportJob.js` |
| YouTube en el cliente | `src/lib/youtubeImport.js`, `src/components/YouTubeImporter.jsx` |
| Ranking colaborativo | `src/lib/collaborativeRanking.js` |
| Medios y restauración | `src/lib/mediaImport.js`, `src/lib/mediaStore.js`, `src/hooks/useProjectAutosave.js` |
| Carpetas arrastradas o seleccionadas | `src/lib/mediaDrop.js`, `src/components/VideoUploader.jsx` |

## Estado

`useProjectState` guarda dos mundos:

- Documento con un solo undo: `clips`, `transitions`, `meta`. Toda mutación pasa por `dispatchDocument` → `reduceProjectDocument`. Una acción nueva se añade en el reducer puro y después se expone en el hook.
- Fuera del undo: `files`, `activeClipId`, `currentOffset`, `selectedTextId`. `App.jsx` posee `isPlaying`, zoom, guías, atajos y `exportConfig`. El layout no entra al undo del documento.

Reglas:

- `transitions.length === clips.length - 1` después de añadir, borrar, duplicar, reordenar o dividir.
- No borres el último clip.
- El reducer recibe datos ya construidos. `nextId` se llama fuera.
- El primer archivo con duración crea el primer clip. Los siguientes entran al pool y el usuario los manda al timeline.
- Máximo 10 archivos, 1 GB cada uno. IndexedDB persiste hasta 200 MB por archivo. Por encima no hay waveform.
- La portada acepta carpetas y subcarpetas: filtra videos, ordena por ruta y nombre y rechaza el lote si supera el cupo. La lectura del drag-and-drop vive en `mediaDrop.js`.
- Al reordenar, conserva la transición solo entre clips que ya eran vecinos.

Clip de trabajo: `id`, `fileId`, `sourceStart`, `sourceEnd`, `speed`, `transform`, `audio`, `pip`, `texts`, y cuando aplica `introEnd`, `videoLayout`, `collaborativeRating`. Texto: `id`, `text`, `x`, `y`, `size`, `font`, `color`, `align`, `startOffset`, `endOffset`, `animation`, más estilo de `DEFAULT_TEXT_STYLE`.

Velocidades permitidas: `0.25`, `0.5`, `0.75`, `1`, `1.5`, `2`, `3`.

## Interfaz

- Copy en español. Claves de datos en inglés.
- Tokens semánticos. Acción `accent`, señal `signal`, énfasis `flare`. Sin morado como color principal.
- Inter para UI, Space Grotesk solo en marca, JetBrains Mono para tiempos y cifras.
- Escritorio (`xl`+): rail fijo, paneles laterales y timeline redimensionables. Tablet (`md`–`xl`): rail fijo y overlays. Móvil: drawer y bottom sheet. Un solo overlay abierto.
- El inspector no tiene pestañas de navegación. Responde a la selección.
- Separadores con rol, límites y teclado. Iconos con `title` o `aria-label`. Foco con `.focus-ring`.
- Animación de UI con opacidad y transform, y con `prefers-reduced-motion`.
- Las dimensiones del workspace se validan en `workspaceLayout.js` antes de persistirse.

`VideoPreview` controla la reproducción del editor y expone `seekTo` por ref. `MediaPreviewModal` reproduce un archivo original desde la biblioteca con controles nativos; abrirlo pausa el editor y suspende sus atajos. Esta selección vive fuera del undo en `App.jsx`. Los clips del timeline usan `@dnd-kit/sortable`. Los textos se arrastran con eventos de puntero, no con dnd-kit.

## Cambios habituales

Nueva plantilla: objeto en `TEMPLATES` (`id`, `name`, `font`, `color`, `blur`, `blurEnabled`, `texts`). Si el primer clip y los siguientes muestran textos distintos, usa `clipSequence` y la lógica de `clipTemplates.js`. Si incluye notas de varios participantes, `collaborativeRanking: true`.

Nueva fuente: `FONT_OPTIONS` y `FONT_CSS` en `CardMetadata.jsx`, import en `index.css`, y el par del servidor (TTF + `FONT_REGISTRY`). El id de fuente es estable.

Nueva animación de texto: entrada en `src/lib/textAnimations.js` con estilo de preview y, si se exporta, las mismas expresiones FFmpeg en `server/lib/textAnimations.js`. Tipos actuales: `fade-in`, `slide-up`, `slide-left`, `typewriter`, `bounce`, `scale-in`, `karaoke`.

Nueva preferencia de layout: función pura en `workspaceLayout.js`, después el hook. No la guardes dentro del documento del proyecto.

Cambio de posición base del video: `MAIN_Y` en `CardTemplate.jsx`, `MAIN_VIDEO_Y` en `preview/ClipMedia.jsx` y `MAIN_Y` del pipeline. El servidor escala desde 1080×1920; no hardcodees otra resolución en el preview.

## Export e importación

`createExportFormData` traduce `fileId` → `fileIndex`, el array de transiciones → objeto `idA|idB`, y quita las imágenes de participantes del meta. Los PNG de ranking viajan en `ratingOverlays`. No cambies esos nombres de campo sin actualizar `server/lib/exportRequest.js`.

YouTube en el cliente solo normaliza enlaces HTTPS de un video (`watch`, `youtu.be`, `shorts`, `embed`). Rechaza playlists, cuentas, directos y URLs con usuario, contraseña o puerto distinto de 443. La descarga ocurre en el servidor.

## No hagas

- No escribas, edites ni ejecutes tests. No abras el navegador ni uses Playwright, Puppeteer, Cypress o una herramienta equivalente. No levantes Vite. El desarrollador prueba la interfaz.
- No mutues `clips` fuera del reducer.
- No metas playback ni layout en el undo del documento.
- No dupliques el estado del proyecto dentro de `EditorShell`, `CanvasWorkspace` o `TimelineDock`.
- No introduzcas CSS modules, styled-components ni colores hex sueltos para acciones primarias.
- No subas el tope de 200 MB de IndexedDB para “guardar todo”: es el límite de memoria del navegador.
- No prometas paridad pixel a pixel del blur con FFmpeg.
