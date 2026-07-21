# Codecut 9:16

Editor de video multi-clip estilo CapCut/TikTok con interfaz React + Tailwind. Permite subir varios videos, cortarlos en partes, reordenar los clips con drag & drop, agregar transiciones y exportar todo a formato vertical 9:16 (1080×1920) procesado por FFmpeg en un backend Node.js.

## Estructura

```
video-editor/
├── client/   # React + Vite + Tailwind + @dnd-kit
└── server/   # Node.js + Express + FFmpeg (fluent-ffmpeg + ffmpeg-static)
```

## Requisitos
- Node.js 18+ y npm
- (No requiere FFmpeg instalado en el sistema: `ffmpeg-static` lo incluye)

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

El cliente (Vite) hace proxy de `/api/*` al servidor en `http://localhost:4000`.

## Uso
1. Arrastra uno o varios videos al área de carga (hasta 10 archivos, 500 MB c/u). El primero se agrega automáticamente al timeline.
2. Desde el **Media pool**, agrega más clips al timeline con **+ Add to timeline**.
3. Edita en el **Timeline**:
   - **Click** en un clip para activarlo.
   - **Arrastra** los clips para reordenarlos.
   - **✂ Split** (o tecla `S`) parte el clip activo en la posición del playhead.
   - **×** en un clip lo elimina.
   - Click en la **costura** entre dos clips para elegir una transición (fade, wipes, slides, circle…) y su duración.
4. Ajusta el **trim** (in/out) del clip activo en el panel "Trim active clip".
5. Click en **Export 9:16 MP4** para descargar la composición final a 1080×1920.

### Atajos
- `S` — Split en el playhead
- `Espacio` — Play / Pause

## Endpoint
`POST /api/trim` — multipart/form-data con campos:
- `videos`: uno o más archivos de video (máx. 10)
- `clips`: JSON string — `[{ id, fileIndex, sourceStart, sourceEnd, duration }]`
- `transitions`: JSON string — `{ "clipIdA|clipIdB": { type, durationSec } }`

Devuelve el MP4 compuesto (1080×1920, H.264 + AAC).

Transiciones soportadas: `none`, `fade`, `fadeblack`, `fadewhite`, `wipeleft`, `wiperight`, `slideleft`, `slideright`, `circleopen`, `circleclose`. Las transiciones usan `xfade` (video) y `acrossfade` (audio); los cortes secos usan `concat`.

## Tests
Smoke tests del backend (generan videos de prueba y ejercitan la API):

```bash
cd server
npm start          # en otra terminal
node scripts/smoke_all.js
```
