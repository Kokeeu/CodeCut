# Codecut 9:16

Editor de video multi-clip estilo CapCut/TikTok. Sube varios videos, córtalos, reordénalos, añade textos, transiciones, velocidad, audio, PIP y exporta a vertical 9:16 (1080×1920) con FFmpeg.

Frontend: React + Vite + Tailwind. Backend: Node.js + Express + FFmpeg (`ffmpeg-static`).

## Estructura

```
video-editor/
├── client/   # React + Vite + Tailwind + @dnd-kit
└── server/   # Node.js + Express + FFmpeg (fluent-ffmpeg + ffmpeg-static)
```

## Requisitos

- Node.js 18+ y npm
- No hace falta FFmpeg en el sistema: `ffmpeg-static` lo incluye

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

1. Arrastra uno o varios videos (hasta 10 archivos, 500 MB c/u). El primero entra al timeline.
2. Desde el media pool, añade más clips con **Timeline**.
3. Edita en el timeline: click para activar, arrastra para reordenar, `S` para split, transiciones en las costuras.
4. Ajusta trim, textos (arrastrar/redimensionar), velocidad, audio, PIP y plantillas.
5. **Export** envía la composición a FFmpeg y descarga el MP4 cuando termina.

El proyecto se auto-guarda en el navegador (JSON + videos en IndexedDB cuando caben). Restore rehidrata clips y media. Un `.json` de proyecto no incluye los videos: si no están en caché, hay que re-subir archivos con el mismo nombre.

### Atajos

- `Espacio` — Play / Pause
- `S` — Split en el playhead
- `Ctrl+Z` / `Ctrl+Y` — Undo / Redo (clips, transiciones y meta juntos)
- `←` `→` — Frame anterior / siguiente (en pausa)
- `J` `K` `L` — Shuttle
- `?` — Lista de atajos

## Export API

Flujo asíncrono con progreso SSE:

1. `POST /api/trim` — multipart (`videos`, `clips`, `transitions`, `meta`, `exportConfig`) → `{ jobId }` (HTTP 202)
2. `GET /api/trim/progress/:jobId` — SSE `{ progress, status }`
3. `GET /api/trim/download/:jobId` — MP4 cuando `status` es `ready`
4. `DELETE /api/trim/:jobId` — cancela el job

Jobs se persisten en `server/temp/jobs/` y caducan a los 5 minutos. Al reiniciar el server, jobs a medias quedan marcados como error.

Transiciones: `none`, `fade`, `fadeblack`, `fadewhite`, `wipeleft`, `wiperight`, `slideleft`, `slideright`, `circleopen`, `circleclose`.

## Tests

```bash
cd server
npm start          # en otra terminal
node scripts/smoke_all.js
```

`smoke_all.js` cubre clip único, multi-clip, transiciones, karaoke y PIP, usando el flujo 202 → SSE → download.

## Versión

v0.12 — undo unificado, PIP y karaoke en export, jobs en disco, restore de media, tests SSE.
