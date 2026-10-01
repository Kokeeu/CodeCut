# Agente del servidor

Eres el agente del backend de Codecut. Tu árbol es `server/`. La guía de la raíz (`../Agents.md`) fija el contrato con el cliente. El cliente arma el estado; tú lo validas, lo encolas y lo conviertes en un MP4 9:16.

## Alcance

Sí editas: rutas, servicio de export, pipeline, runner, jobs, cola, política de upload, probe y YouTube.

No editas el cliente salvo que cambie un contrato compartido (velocidad, animaciones, `xfade`, resolución, bitrate, blur, fuentes, cupos, alturas de YouTube o la forma del multipart). Ese cambio actualiza los dos lados en el mismo cambio.

No construyas UI ni un estado de editor aquí. No abras un shell para FFmpeg, ffprobe ni yt-dlp. No arranques el servidor: el desarrollador lo hace en `:4000`.

CommonJS (`require`). `prestart` y `predev` ejecutan `scripts/setup_ytdlp.js` cuando el desarrollador arranca. El binario queda en `server/bin/`, ignorado por Git. `YT_DLP_PATH` apunta a un ejecutable externo. No commitees `bin/` ni `temp/`.

Variables: `PORT`, `HOST`, `CORS_ORIGINS`, `MAX_UPLOAD_FILE_MB` (1024), `MAX_UPLOAD_TOTAL_MB` (2048), `MAX_OVERLAY_FILE_MB` (20), `YT_DLP_PATH`.

## Responsabilidad de cada archivo

| Archivo | Hace | No hace |
|---|---|---|
| `index.js` | Helmet, CORS, JSON de 1 MB, health, monta rutas, apagado | Negocio de export |
| `routes/trim.js` | Multer, límites, responde 202/404/descarga/cancelación | Grafo FFmpeg |
| `routes/youtube.js` | HTTP de importación y descarga del archivo ya cerrado | Parseo libre de URLs fuera del validador |
| `services/exportService.js` | Pide validación, encola y orquesta | Construir filtros o hacer `spawn` |
| `lib/exportRequest.js` | JSON del multipart y errores 400 | I/O |
| `lib/validateInputs.js` | Probe de los videos subidos | Codificar |
| `lib/ffmpegPipeline.js` | Grafo, textos temporales, PIP, overlay | Ejecutar el proceso |
| `lib/ffmpegRunner.js` | `spawn` de `ffmpeg-static`, progreso, cancelación, timeout de stall | Decidir filtros |
| `lib/exportConfig.js` | Resolución, fps, CRF, preset, techo VBR | Leer el body HTTP |
| `lib/jobs.js` | Memoria + `temp/jobs`, TTL 15 min, estados públicos | Cola |
| `lib/queue.js` | Máximo 2 jobs concurrentes | Persistencia |
| `lib/youtubeDownloader.js` | Args de yt-dlp, progreso, archivo de salida dentro del workdir | Playlists, cookies, directos |
| `lib/cron.js` | Borra temporales de más de 1 hora | Borrar un job aún en curso |

Estados de job: en curso, `ready`, `error`, `cancelled`. Al reiniciar, un job a medias queda en `error`. El SSE de progreso no pasa por `compression`.

## Pipeline

Por clip: trim, split, video principal escalado y fondo cover + `gblur` + `eq`. Entre clips: `xfade` de video y `acrossfade` de audio. Textos con `textfile=` y `enable='between(t,...)'`. El ranking colaborativo llega como PNG ya compuesto por el cliente. Audio de salida: AAC estéreo, 48 kHz, faststart, `yuv420p`, H.264 high, `avc1`.

`OUTPUT_W = 1080` y `OUTPUT_H = 1920` son la base de diseño. `exportConfig` produce el tamaño real (`OUTPUT_W_DYN`). Escala posiciones, PIP y grosor de borde con `OUTPUT_W_DYN / OUTPUT_W`. No sustituyas esa base por la resolución del request.

`MAIN_Y = 360` es la posición de diseño del video 16:9. Cambiarla exige el mismo cambio en el preview del cliente.

Tipos `xfade`: `fade`, `fadeblack`, `fadewhite`, `wipeleft`, `wiperight`, `slideleft`, `slideright`, `circleopen`, `circleclose`. Un tipo desconocido cae a `fade`. Duración acotada para que ningún clip quede en cero.

Fuentes de `FONT_REGISTRY`: Inter, Montserrat, Bebas Neue, Poppins, Oswald, Pacifico, Anton. Arial es fallback de sistema. Un id nuevo necesita TTF en `assets/fonts/` y el par en el cliente.

## Seguridad operativa

- Argumentos en array. `spawn` / `execFile`. Sin concatenar entrada de usuario en un string de shell.
- Rutas de salida y de limpieza confinadas a `server/temp/`. Rechaza un path que escape del directorio del job.
- CORS solo para orígenes de `CORS_ORIGINS` (por defecto el Vite local).
- Upload: como máximo 10 videos. El filtro acepta video y, en overlays, PNG con firma real.
- YouTube: un video público por URL, alturas `720|1080|1440|2160`, tope 1 GB. Un enlace con playlist importa solo ese video. Sin cookies, sin directos, sin cuentas, sin listas completas.
- No registres cuerpos multipart, rutas de usuario ni URLs completas en logs de error que salgan del proceso.
- Borra los temporales del request si la validación falla antes de encolar.

## Contrato de entrada

`parseExportRequest` exige clips con `sourceStart`/`sourceEnd` finitos, `sourceEnd > sourceStart`, velocidad de `SPEED_OPTIONS`, `fileIndex` válido y, si hay PIP u overlay, índices válidos. `transitions` es un objeto, no un array. `meta` y `exportConfig` son objetos. El cliente es quien convierte ids a índices; no aceptes `fileId` como sustituto.

Errores de contrato: `ExportRequestError` con `status` 400. No los conviertas en 500.

## No hagas

- No escribas, edites ni ejecutes tests. No lances `npm test`, `npm run test:unit`, `node --test` ni `scripts/smoke_all.js`. No arranques el servidor ni abras un navegador, Playwright, Puppeteer, Cypress o una herramienta equivalente para comprobar el export. El desarrollador prueba.
- No pongas el grafo dentro de la ruta ni el `spawn` dentro del servicio.
- No subas la concurrencia de la cola por encima de 2 sin medir CPU y disco.
- No acortes el TTL de 15 minutos ni borres en el cron un archivo de un job vivo.
- No igualees el blur CSS del preview cambiando coeficientes solo en un lado. Brillo `-0.05` y saturación `0.5` están duplicados a propósito.
- No añadas cookies, login o descarga de playlists a yt-dlp.
