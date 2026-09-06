# Codecut 9:16

Editor de video multi-clip estilo CapCut/TikTok. Sube varios videos, córtalos, reordénalos, añade textos, transiciones, velocidad, audio, PIP y exporta a vertical 9:16 desde 720×1280 hasta 2304×4096 con FFmpeg.

Frontend: React + Vite + Tailwind. Backend: Node.js + Express + FFmpeg (`ffmpeg-static`) + `yt-dlp`.

## Estructura

```
video-editor/
├── client/   # React + Vite + Tailwind + @dnd-kit
└── server/   # Node.js + Express + FFmpeg (fluent-ffmpeg + ffmpeg-static)
```

## Requisitos

- Node.js 18+ y npm
- No hace falta FFmpeg en el sistema: `ffmpeg-static` lo incluye
- No hace falta instalar `yt-dlp` manualmente: el servidor descarga y verifica el binario oficial para Windows, macOS o Linux antes de iniciar

## Instalación

En dos terminales:

```bash
cd server
npm install
npm start
```

```bash
cd client
npm install
npm run dev
```

Abre http://localhost:5173

Vite hace proxy de `/api/*` a `http://localhost:4000`.

## Uso

1. Arrastra archivos o usa **Importar desde YouTube** (hasta 10 videos, 1 GB c/u). El primero entra al timeline.
2. Desde el media pool, añade más clips con **Timeline**.
3. Edita en el timeline: click para activar, arrastra para reordenar, `S` para split, transiciones en las costuras.
4. Ajusta trim, textos (arrastrar/redimensionar), velocidad, audio, PIP y plantillas.
5. En **Top Colaborativo**, abre **Ranking** para cargar fotos circulares, editar nombres y registrar notas de 0 a 10 y el promedio de cada clip.
6. **Export** envía la composición a FFmpeg y descarga el MP4 cuando termina.

El proyecto se auto-guarda en el navegador (JSON + videos de hasta 200 MB en IndexedDB). Restore rehidrata clips y media. Un `.json` de proyecto no incluye los videos: si no están en caché, hay que volver a subirlos o importarlos. Para evitar picos de memoria, los archivos mayores de 200 MB no generan waveform, aunque conservan preview, filmstrip y exportación.

### yt-dlp

`npm start` y `npm run dev` ejecutan el setup automáticamente la primera vez. El binario queda en `server/bin/`, fuera de Git. Comandos disponibles:

```bash
cd server
npm run setup:ytdlp
npm run update:ytdlp
```

Para usar una instalación administrada externamente, define `YT_DLP_PATH` con la ruta absoluta al ejecutable. El setup usa los binarios nightly oficiales, valida `SHA2-256SUMS` y utiliza el Node actual como runtime JavaScript; esos ejecutables ya incluyen los componentes EJS necesarios y reciben el FFmpeg incluido con el servidor. Los binarios y componentes descargados conservan sus propias licencias; consulta [yt-dlp y sus avisos de terceros](https://github.com/yt-dlp/yt-dlp#licensing).

La importación acepta videos públicos individuales de YouTube en 720p, 1080p, 1440p o 2160p. Un enlace que también pertenezca a una playlist importa únicamente ese video. No se admiten playlists completas, directos, cuentas, cookies ni contenido protegido. Usa esta función solamente con contenido propio, de dominio público o para el que tengas autorización.

### Atajos

- `Espacio` — Play / Pause
- `S` — Split en el playhead
- `Ctrl+Z` / `Ctrl+Y` — Undo / Redo (clips, transiciones y meta juntos)
- `←` `→` — Frame anterior / siguiente (en pausa)
- `J` `K` `L` — Shuttle
- `?` — Lista de atajos

## Export API

Flujo asíncrono con progreso SSE:

1. `POST /api/trim` — multipart (`videos`, `ratingOverlays`, `clips`, `transitions`, `meta`, `exportConfig`) → `{ jobId }` (HTTP 202)
2. `GET /api/trim/progress/:jobId` — SSE `{ progress, status }`
3. `GET /api/trim/download/:jobId` — MP4 cuando `status` es `ready`
4. `DELETE /api/trim/:jobId` — cancela el job

`exportConfig` admite resoluciones `720`, `1080`, `1440`, `2160` y `2304`, 24/30/60 fps y calidades `medium`, `high` y `ultra`. El encoder usa H.264 con CRF y un techo VBR adaptado a resolución/fps, AAC estéreo a 48 kHz y faststart. El preset de TikTok usa 1080×1920, 30 fps y calidad alta; 2304×4096 corresponde al máximo 9:16 dentro del límite de 4096 px por lado de la Content Posting API.

Jobs se persisten en `server/temp/jobs/` y caducan 15 minutos después de terminar. Al reiniciar el server, jobs a medias quedan marcados como error.

## YouTube Import API

1. `GET /api/youtube/health` — disponibilidad y versión de `yt-dlp`
2. `POST /api/youtube/imports` — JSON `{ urls, maxHeight }` → `{ batchId, jobs }` (HTTP 202)
3. `GET /api/youtube/imports/:id/progress` — SSE `{ status, progress, stage, title?, error? }`
4. `GET /api/youtube/imports/:id/file` — descarga el MP4 o WebM terminado
5. `DELETE /api/youtube/imports/:id` — cancela el trabajo

Transiciones: `none`, `fade`, `fadeblack`, `fadewhite`, `wipeleft`, `wiperight`, `slideleft`, `slideright`, `circleopen`, `circleclose`.

## Tests

```bash
cd client
npm test
npm run build

cd server
npm run test:unit
npm start          # en otra terminal
node scripts/smoke_all.js
```

`smoke_all.js` cubre clip único, multi-clip, transiciones, karaoke, PIP y el overlay de calificaciones colaborativas, usando el flujo 202 → SSE → download.

## Versión

v0.14 — importación por lote desde YouTube con calidad hasta 4K, progreso, cancelación y setup multiplataforma de yt-dlp.
