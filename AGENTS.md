# Codecut 9:16 — Guía de agentes

Editor vertical 9:16 (TikTok, Reels, Shorts). Dos proyectos npm independientes, sin workspace en la raíz:

- `client/` — React 18 + Vite + Tailwind. Agente: `client/AGENTS.md`.
- `server/` — Node.js + Express 5 + FFmpeg (`ffmpeg-static`) + `yt-dlp`. Agente: `server/AGENTS.md`.

El producto visible está en español. Las claves de medios, proyecto, API y FFmpeg permanecen en inglés.

## Antes de editar

1. Lee el agente del árbol que vas a tocar. Si el cambio cruza el contrato compartido, lee los dos.
2. El código manda si esta guía y el código no coinciden. Corrige la guía en el mismo cambio.
3. Trabaja en el proyecto dueño del comportamiento. No reescribas el otro lado para un cambio que cabe en uno.
4. La lógica de documento, layout y contratos HTTP vive en funciones puras. Cámbiala ahí y después conéctala a React o a Express.
5. No arranques procesos ni dejes archivos en `server/temp/` o `server/bin/`.

El desarrollador levanta el entorno. `./start.sh` abre el servidor en `:4000` (solo `127.0.0.1`) y el cliente en `:5173`. Vite proxifica `/api` a `http://localhost:4000`. El agente no ejecuta ese script.

## Quién hace qué

| Cambio | Agente |
|---|---|
| UI, estado del editor, preview, timeline, plantillas, autoguardado, layout | Cliente |
| Export, filtro FFmpeg, jobs, cola, uploads | Servidor |
| YouTube (URL, calidad, progreso, binario) | El lado que posee la regla; el otro si cambia el contrato |
| Forma de clips, transiciones, velocidad, animaciones, fuentes, blur, resolución o bitrate | Los dos, en el mismo cambio |

## Contrato compartido

Estas parejas deben permanecer alineadas. Un valor nuevo en un solo lado rompe preview o export.

| Tema | Cliente | Servidor |
|---|---|---|
| Velocidades y cadena `atempo` | `client/src/lib/speed.js` | `server/lib/speed.js` |
| Expresiones FFmpeg de animación | `client/src/lib/textAnimations.js` | `server/lib/textAnimations.js` |
| Tipos `xfade` | `client/src/lib/transitions.js` | `server/lib/ffmpegPipeline.js` |
| Resolución, fps, CRF, techos de bitrate | `client/src/lib/exportSettings.js` | `server/lib/exportConfig.js` |
| Brillo y saturación del fondo | `BG_BRIGHTNESS`, `BG_SATURATION` en `projectDefaults.js` | Las mismas constantes en `ffmpegPipeline.js` |
| Fuentes | `FONT_OPTIONS` y `FONT_CSS` en `CardMetadata.jsx`, import en `index.css` | TTF en `server/assets/fonts/` y `FONT_REGISTRY` |
| Cupo de medios | 10 archivos, 1 GB c/u (`mediaImport.js`) | `uploadPolicy.js` (`MAX_UPLOAD_*`) |
| Alturas de YouTube | `720`, `1080`, `1440`, `2160` | `youtubeDownloader.js` |
| Posición base del video | `MAIN_Y` en `CardTemplate.jsx` y `MAIN_VIDEO_Y` en `preview/ClipMedia.jsx` (360 sobre 1080×1920) | `MAIN_Y` en `ffmpegPipeline.js`, escalado desde `OUTPUT_W` / `OUTPUT_H` |

El editor guarda `fileId`. La exportación envía `fileIndex` dentro del multipart. Las transiciones del editor son un array (`transitions.length === clips.length - 1`). Las de la API son un objeto con clave `` `${clipA}|${clipB}` ``.

Resoluciones de salida: `720`, `1080`, `1440`, `2160`, `2304`. FPS: `24`, `30`, `60`. Calidades: `medium`, `high`, `ultra`. El preset de TikTok es 1080×1920, 30 fps, calidad alta. `2304×4096` es el máximo 9:16 dentro del límite de 4096 px de la Content Posting API.

## Modelo que no se puede romper

El documento con undo vive en `useProjectState` y solo cambia por `reduceProjectDocument`:

`meta/replaced`, `clip/first-added`, `clip/added`, `clip/deleted`, `clip/duplicated`, `clips/reordered`, `clip/updated`, `clip/trimmed`, `clip/rating-updated`, `ranking/updated`, `text/added`, `text/updated`, `text/deleted`, `clip/split`, `transition/updated`, `template/applied`, `document/replaced`.

Fuera del undo: archivos e IndexedDB, reproducción, clip activo, texto seleccionado, zoom del timeline, `exportConfig` y layout del workspace.

Invariantes:

- Siempre hay al menos un clip para poder borrar.
- Borrar, duplicar, reordenar o dividir mantiene una transición entre cada par de clips vecinos. Reordenar clips que no eran vecinos reinicia esa transición.
- El reducer no crea ids ni archivos. Quien despacha la acción prepara el clip.
- `PROJECT_VERSION` en `projectDefaults.js` es la versión del documento (`0.14`: campos vinculados y configuración del Top). La versión de producto del README (`v0.14`, importación YouTube) es independiente. No las subas juntas salvo que cambie el esquema guardado.
- Un `.json` de proyecto no incluye los binarios. La restauración usa IndexedDB (`codecut-media`) para archivos de hasta 200 MB. Por encima de eso hay preview y export, sin waveform.
- Autoguardado: `localStorage` `codecut-autosave`. Layout: `codecut-workspace-layout-v1`.

## Mapa

```
client/src/
  App.jsx                     playback, atajos, ensamblaje
  hooks/useProjectState.js    archivos + documento + undo
  hooks/useEditor.js          duración, snap, tiempo global
  hooks/useWorkspaceLayout.js layout persistido
  hooks/useExportJob.js       job de export en la UI
  lib/projectDocument.js      reducer puro
  lib/projectDefaults.js      defaults, plantillas, nextId
  lib/clipTemplates.js        fases de plantilla por clip
  lib/exportRequest.js        FormData de export
  components/                 shell, lienzo, timeline, inspector
server/
  index.js                    CORS, helmet, /api/health, rutas
  routes/trim.js              multipart de export
  routes/youtube.js           importación YouTube
  services/exportService.js   validación, cola, orquestación
  lib/ffmpegPipeline.js       grafo de filtros
  lib/ffmpegRunner.js         spawn de FFmpeg, sin shell
  lib/jobs.js                 jobs en memoria y en disco
  lib/queue.js                cola, máximo 2 concurrentes
```

La especificación visual está en `DESIGN.md`. El shell separa regiones (`EditorShell`, `ToolRail`, `CanvasWorkspace`, `TimelineDock`, `PropertiesPanel`, `ResizeHandle`) de la edición. El inspector muestra texto si hay un texto seleccionado y clip en caso contrario.

Plantillas actuales en `TEMPLATES`: Opening Anime, Top Musical, Top Colaborativo, Descubre música. Aplicar una plantilla reemplaza los textos de los clips y puede activar ranking colaborativo o una secuencia intro/canción.

Top Colaborativo tiene un editor «Datos del Top»: título y participantes compartidos, formato de archivos, artista predeterminado, tabla por canción y pegado TSV. `collaborativeProject.js` concentra autocompletado, campos vinculados y puestos dinámicos. Los textos guardan `collaborativeField` (`heading`, `position`, `song`, `artist`); el export elimina esa clave y las preferencias editoriales, enviando textos ya resueltos. Los proyectos anteriores se vinculan por las posiciones reconocibles de la plantilla, conservando contenido y puestos manuales.

Capas de cada salida: fondo con blur (`gblur` + brillo/saturación), video principal con `transform`, textos `drawtext` vía `textfile=`, PIP y, si aplica, overlay PNG del ranking colaborativo.

## API

Export:

1. `POST /api/trim` — campos `videos`, `ratingOverlays`, `clips`, `transitions`, `meta`, `exportConfig` → `{ jobId }` (202).
2. `GET /api/trim/progress/:jobId` — SSE. No comprimir esta ruta.
3. `GET /api/trim/download/:jobId` — MP4 cuando `status` es `ready`.
4. `DELETE /api/trim/:jobId` — cancela.

YouTube, solo videos públicos individuales. Sin playlists, directos, cookies ni contenido protegido:

1. `GET /api/youtube/health`
2. `POST /api/youtube/imports` — `{ urls, maxHeight }` → `{ batchId, jobs }` (202).
3. `GET /api/youtube/imports/:id/progress` — SSE.
4. `GET /api/youtube/imports/:id/file`
5. `DELETE /api/youtube/imports/:id`

Jobs en `server/temp/jobs/`. Caducan 15 minutos después de terminar. Un job a medias tras reiniciar queda en error. Limpieza de temporales cada hora.

## Reglas de trabajo

- JavaScript. El cliente es ESM; el servidor es CommonJS. Sin TypeScript y sin PropTypes.
- Tailwind con tokens de `tailwind.config.js` y variables de `index.css`. Interfaz en Inter, marca en Space Grotesk, valores técnicos en JetBrains Mono.
- Color de acción: `accent`. Estado y foco: `signal`. Énfasis editorial o destructivo: `flare`. El morado no es color primario.
- Movimiento con opacidad y transform, respetando `prefers-reduced-motion`.
- Componentes funcionales. `useCallback` en handlers que cruzan componentes. `useMemo` para estado derivado. `VideoPreview` sigue siendo `forwardRef` por `seekTo`.
- Sin comentarios de narración. Un comentario solo fija un invariante que el código no muestra.
- FFmpeg, ffprobe y yt-dlp se ejecutan con `spawn` o `execFile` y lista de argumentos. Nunca con un shell.
- No subas `node_modules/`, `dist/`, `server/temp/`, `server/bin/` ni videos de prueba.
- Copy nueva de la interfaz en español, con `aria-label` o `title` en controles de icono.

## Pruebas

El desarrollador prueba. El agente no escribe tests, no los modifica y no los ejecuta: ni `npm test`, ni `npm run test:unit`, ni `node --test`, ni `scripts/smoke_all.js`, ni archivos `*.test.js` o `*.test.mjs`.

Tampoco abre un navegador ni lanza automatización para comprobar el cambio. Eso incluye Playwright, Puppeteer, Cypress, Selenium y cualquier herramienta equivalente, además de `npm run dev`, `npm start`, `vite preview` y `./start.sh`. Esas instancias ocupan puertos y se quedan abiertas. Entrega el cambio y describe qué debe mirar el desarrollador.

## Atajos del editor

`Espacio` play/pausa. `S` divide el clip activo. `Ctrl+Z` deshace y `Ctrl+Y` o `Ctrl+Shift+Z` rehace el documento completo. `←` `→` avanzan un frame en pausa. `J` `K` `L` hacen shuttle. `?` abre la ayuda.

`Alt + rueda` (Windows) / `Option ⌥ + rueda` (Mac) cambia el zoom horizontal sobre el panel del timeline: arriba amplía, abajo reduce. Usa el mismo estado y límites que el slider y conserva la posición bajo el cursor hasta donde permite el scroll.

## Problemas conocidos

- El blur del preview (CSS) no es idéntico al `gblur` del export. Brillo y saturación sí usan los mismos coeficientes.
- El PIP exportado tiene esquinas rectas. El preview puede mostrar `borderRadius`.
- El karaoke es por palabra, sin tiempos por sílaba.
- Los archivos de más de 200 MB no se guardan en IndexedDB ni generan waveform.

## Historial breve

De v0.1 (un clip) a v0.13 (shell editorial, inspector contextual, layout persistido, UI en español) y v0.14 (importación YouTube por lote, calidades hasta 4K, progreso y cancelación). El detalle de producto está en `README.md`. El detalle visual está en `DESIGN.md`.
