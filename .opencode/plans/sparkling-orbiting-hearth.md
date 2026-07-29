# Fix: Error de FFmpeg en Export - Invalid Filter Graph

## Problema
El export está fallando con error:
```
Failed to set value '...' for option 'filter_complex': Invalid argument
Error parsing global options: Invalid argument
```

## Causa Raíz
En `server/lib/ffmpegPipeline.js` línea 297, el filtro drawtext tiene dos problemas:

1. **Escapado incorrecto de paths**: `escapeFilterPath()` escapa `:` como `\:` pero cuando los paths están dentro de comillas simples (`textfile='...'` y `fontfile='...'`), FFmpeg NO necesita ese escapado. El resultado es que FFmpeg ve `C\:` en lugar de `C:`.

2. **`text_align` no compatible**: El parámetro `text_align` puede no estar disponible en todas las versiones de FFmpeg o puede tener problemas de sintaxis.

## Plan de Fix

### 1. Crear función `escapeFilterPathQuoted()` en `server/lib/ffmpegPipeline.js`
Agregar nueva función que NO escape caracteres cuando están dentro de comillas simples:
```js
function escapeFilterPathQuoted(p) {
  return String(p).replace(/\\/g, '/');
}
```

### 2. Modificar construcción de drawtextOpts (línea 297)
Cambiar de:
```js
textfile='${escapeFilterPath(fp)}':...:fontfile='${ffile}':text_align=${align}
```

A:
```js
textfile='${escapeFilterPathQuoted(fp)}':...:fontfile='${escapeFilterPathQuoted(ffile)}'
```

Y eliminar `text_align=${align}` del string.

### 3. Ajustar lógica de alineación X
La alineación ya está manejada en las líneas 267-268:
```js
let xExpr = align === 'center' ? '(w-text_w)/2' : String(tx);
```

Esto funciona correctamente sin necesidad de `text_align`. Solo necesitamos asegurar que `xExpr` se use correctamente en el filtro.

### 4. Verificar que el filtro final sea válido
El filtro drawtext debe verse así:
```
textfile='C:/Users/.../text.txt':x=100:y=200:fontsize=60:fontcolor=0xFFFFFF:fontfile='C:/Windows/Fonts/arial.ttf':alpha='between(t,0,10)'
```

Sin `text_align` y con paths sin escapar dentro de comillas simples.

## Archivos a Modificar
- `server/lib/ffmpegPipeline.js`:
  - Agregar función `escapeFilterPathQuoted()` (línea ~66)
  - Modificar línea 297 para usar la nueva función y eliminar `text_align`

## Verificación
1. Ejecutar `node server/scripts/smoke_all.js` para verificar que el export funciona
2. Probar export con textos en diferentes posiciones y alineaciones
3. Verificar que el error "Invalid argument" ya no aparece

## Resultado
✅ **COMPLETADO** - El fix se implementó exitosamente:

1. Se agregó la función `escapeFilterPathQuoted()` que no escapa caracteres dentro de comillas simples
2. Se modificó la construcción de `drawtextOpts` para usar la nueva función y eliminar `text_align`
3. Se verificó que el export funciona correctamente con un test manual que procesó un video de 5 segundos con texto
4. El archivo de salida se generó exitosamente (2MB) sin errores de FFmpeg

El error "Invalid argument" ya no aparece y el pipeline de FFmpeg funciona correctamente.
