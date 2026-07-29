# Fix: Estilos de texto no se aplican en el export

## Problema
El usuario reporta que cuando exporta un video, los textos salen sin estilos, animaciones ni efectos. Solo aparece el texto default (sin background, stroke, rotation, etc.).

## Causa Raíz
El servidor Node.js tiene código cacheado en memoria. Los procesos de Node.js están corriendo desde el 7/23/2026 2:14:09 PM y NO se han reiniciado después de los cambios que agregaron soporte para:
- `bgEnabled` / `bgColor` / `bgPadding` / `bgRadius` / `bgOpacity` (background)
- `strokeEnabled` / `strokeColor` / `strokeWidth` (stroke)
- `rotation` (rotación)

Hay 4 procesos de Node.js corriendo que necesitan ser reiniciados.

## Evidencia
El filter_complex que el usuario mostró en el error anterior:
```
fontsize=60:fontcolor=0xFFFFFF:alpha='between(t,0.000,28.058)'
```

NO tiene:
- `:shadowcolor` (siempre debería estar en la rama else)
- `:box=` o `:boxcolor=` (debería estar si bgEnabled es true)
- `:borderw=` (debería estar si strokeEnabled es true)
- `:angle=` (debería estar si rotation != 0)

Esto confirma que el servidor está usando código que NO incluye las ramas para background, stroke, y rotation.

## Solución

### Paso 1: Verificar que el código fuente está correcto
El código en `server/lib/ffmpegPipeline.js` SÍ tiene las ramas correctas (verificado):
- Línea 303-307: `if (t.strokeEnabled && t.strokeWidth > 0)` con `else` que agrega shadow
- Línea 309-315: `if (t.bgEnabled)` que agrega box, boxborderw, boxcolor
- Línea 317-320: `if (t.rotation)` que agrega angle

### Paso 2: Verificar que el cliente envía las propiedades
El código en `client/src/components/ExportButton.jsx` línea 95-98 usa `...t` (spread) que incluye TODAS las propiedades del texto.

### Paso 3: Reiniciar el servidor Node.js
**CRÍTICO**: Los 4 procesos de Node.js deben ser terminados y el servidor debe ser reiniciado.

Comando para Windows PowerShell:
```powershell
Get-Process -Name "node" | Stop-Process -Force
cd C:\Users\jason\video-editor\server
npm start
```

## Verificación
Después de reiniciar, el filter_complex debería incluir:
- `:shadowcolor=black@0.75:shadowx=3:shadowy=3` (rama else, siempre presente)
- `:box=1:boxborderw=X:boxcolor=0xRRGGBBAA` (si bgEnabled es true)
- `:borderw=X:bordercolor=0xRRGGBB` (si strokeEnabled es true)
- `:angle=X` (si rotation != 0)

## Plan de Implementación
1. Terminar los 4 procesos de Node.js
2. Reiniciar el servidor con `cd server && npm start`
3. Probar el export nuevamente
4. Verificar que el filter_complex incluye los estilos
5. Verificar que el video resultante tiene los estilos aplicados

## Nota Importante
Este es un problema de DEPLOYMENT, no de código. El código está correcto, solo necesita ser reiniciado para que los cambios tomen efecto.
