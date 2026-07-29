# Fix: Dos bugs en el export de FFmpeg

## Problema 1: Servidor no reiniciado
El servidor Node.js tiene el código anterior en cache. Los cambios de `escapeFilterPathQuoted` y eliminación de `text_align` ya están en el código fuente (verificado), pero el servidor no los está usando.

**Solución**: Reiniciar el servidor Node.js para que recargue el código.

## Problema 2: Labels duplicados en drawtext
En `server/lib/ffmpegPipeline.js` línea 247-265, hay un bug donde se generan labels duplicados cuando hay múltiples clips con textos:

```js
let prevLabel = 'vc';
clips.forEach((clip, ci) => {
  let ti = 0;  // ❌ Se reinicia para cada clip
  (clip.texts || []).forEach((t) => {
    // ...
    ti++;
    const out = `vt${ti}`;  // ❌ Genera vt1, vt2, vt3 por clip
    // ...
  });
});
```

Cuando hay 2 clips con textos, el clip 0 genera `vt1` y el clip 1 también genera `vt1`, causando conflicto.

**Solución**: Usar un contador global que no se reinicie:

```js
let prevLabel = 'vc';
let globalTextIndex = 0;  // ✅ Contador global
clips.forEach((clip, ci) => {
  let ti = 0;
  (clip.texts || []).forEach((t) => {
    // ...
    ti++;
    const out = `vt${++globalTextIndex}`;  // ✅ Único globalmente
    // ...
  });
});
```

## Plan de Implementación

### 1. Fix del label duplicado (server/lib/ffmpegPipeline.js)
- Agregar variable `globalTextIndex` antes del loop de clips
- Cambiar `const out = `vt${ti}`` a `const out = `vt${++globalTextIndex}``

### 2. Reiniciar el servidor
- Matar los procesos Node.js existentes
- El usuario debe reiniciar el servidor con `cd server && npm start`

## Verificación
1. El filter_complex no debe tener labels duplicados como `[vt1]...[vt1]`
2. El filter_complex no debe tener `text_align`
3. Los paths no deben tener `\:` (deben tener `/`)
4. El export debe completarse con status "ready"
