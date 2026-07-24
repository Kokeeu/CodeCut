# Plan: 4 Mejoras Profesionales para Codecut 9:16

## Contexto
El editor tiene las funcionalidades básicas pero le faltan detalles que lo hacen sentir profesional como CapCut. El usuario quiere 4 features concretas: J/K/L shuttle, duplicar clip, snap magnético y guías de título seguro.

---

## 1. J/K/L Shuttle Controls (estilo Premiere)

### Archivos a modificar
- `client/src/App.jsx` (keyboard handler ~línea 511-536)
- `client/src/components/TransportBar.jsx` (UI hints)

### Implementación
- **J** = Rewind. Primera pulsación: pausa. Pulsaciones adicionales: aumenta velocidad hacia atrás (1x, 2x, 4x, 8x)
- **K** = Pause. Detiene playback.
- **L** = Forward. Primera pulsación: play. Pulsaciones adicionales: aumenta velocidad (1x, 2x, 4x, 8x)
- **K+L** o **K+J** = Frame-by-frame (ya existe con flechas)

Necesitamos un estado `shuttleSpeed` (ref, no state para no re-renderizar):
```
shuttleRef = { direction: 0, level: 0 }
// direction: -1 (rewind), 0 (stopped), 1 (forward)
// level: 1, 2, 3, 4 (multiplicador)
```

Para rewind, usamos `playbackRate` negativo no es soportado por HTML5 video. Alternativa: usar `currentTime -= interval` con setInterval.

### Detalle
- Al presionar J: si estaba playing, pausar. Si ya estaba en rewind, subir nivel.
- Al presionar L: si estaba paused, play normal. Si ya estaba en forward, subir nivel.
- Al presionar K: pausar, reset nivel.
- Velocidades: 1x, 2x, 4x, 8x (4 niveles)
- Para rewind: setInterval que resta `frameDuration * level * 4` al currentTime

### TransportBar
- Agregar hint visual de J/K/L en la barra de hints

---

## 2. Duplicar Clip

### Archivos a modificar
- `client/src/App.jsx` (nuevo handler `handleDuplicateClip`)
- `client/src/components/ClipBlock.jsx` (botón duplicar)
- `client/src/components/ClipTrack.jsx` (pasar `onDuplicate` prop)

### Implementación
En `App.jsx`:
```js
const handleDuplicateClip = useCallback((clipId) => {
  const idx = clips.findIndex((c) => c.id === clipId);
  if (idx < 0) return;
  const source = clips[idx];
  const dup = {
    ...source,
    id: nextId('clip'),
    texts: (source.texts || []).map((t) => ({ ...t, id: nextId('text') })),
    transform: { ...(source.transform || DEFAULT_TRANSFORM) },
    audio: { ...(source.audio || DEFAULT_AUDIO) },
    pip: { ...(source.pip || DEFAULT_PIP) },
  };
  const next = [...clips];
  next.splice(idx + 1, 0, dup);
  setClips(next);
  setTransitions((prev) => {
    const t = [...prev];
    t.splice(idx, 0, { ...DEFAULT_TRANSITION });
    return t;
  });
  setActiveClipId(dup.id);
}, [clips]);
```

En `ClipBlock.jsx`:
- Agregar botón de duplicar (ícono ⧉ o similar) junto al botón de delete
- Solo visible cuando se hace hover o siempre visible en esquina superior derecha
- `onPointerDown` stopPropagation para no interferir con drag

En `ClipTrack.jsx`:
- Pasar `onDuplicate` prop al ClipBlock

---

## 3. Snap Magnético en Timeline

### Archivos a modificar
- `client/src/components/ClipTrim.jsx` (snap en handles de trim)
- `client/src/App.jsx` (snap en el playhead global del TimelineRuler)

### Implementación
Constante: `SNAP_THRESHOLD = 5` (pixels) o `SNAP_TIME = 0.1` (segundos)

**Puntos de snap a considerar:**
1. Bordes de otros clips (inicio y fin)
2. Posición del playhead
3. Marcadores (si los hubiera en el futuro)

**En ClipTrim (trim handles):**
- Al mover el handle de In/Out, calcular la distancia a los bordes de clips adyacentes
- Si está dentro del threshold, "pegar" al borde
- Mostrar indicador visual (línea verde) cuando está snapeado

**En TimelineRuler (seek global):**
- Al hacer scrub con el playhead, snap a bordes de clips
- Calcular posiciones de todos los bordes de clips en tiempo global
- Si el seek está cerca de un borde, ajustar

**Helper function:**
```js
function computeSnapPoints(clips, transitions) {
  const points = [0];
  let cum = 0;
  for (let i = 0; i < clips.length; i++) {
    const dur = (clips[i].sourceEnd - clips[i].sourceStart) / (clips[i].speed || 1);
    cum += dur;
    points.push(cum);
    if (i < clips.length - 1) {
      const t = transitions[i];
      if (t && t.type && t.type !== 'none') cum -= Number(t.durationSec) || 0;
    }
  }
  return points;
}

function snapToPoints(value, points, threshold) {
  for (const p of points) {
    if (Math.abs(value - p) <= threshold) return p;
  }
  return value;
}
```

### Detalle de UX
- El snap solo se activa cuando el cursor está cerca del punto (threshold en tiempo, no pixels)
- Threshold: 0.15 segundos (aprox 4-5 frames)
- Feedback visual: línea vertical verde brillante cuando está snapeado

---

## 4. Guías de Título Seguro (Title Safe Guides)

### Archivos a modificar
- `client/src/components/VideoPreview.jsx` (overlay de guías)
- `client/src/App.jsx` (toggle para mostrar/ocultar guías)

### Implementación
Las guías de título seguro son rectángulos concéntricos que indican zonas seguras para texto y acción:

- **Title Safe** (90% del frame): zona donde el texto debe estar para ser legible en todas las pantallas
- **Action Safe** (95% del frame): zona donde la acción importante debe estar

En coordenadas del canvas 1080x1920:
- Action Safe: margen 2.5% = 27px cada lado → rect de 1026x1866 en (27, 27)
- Title Safe: margen 5% = 54px cada lado → rect de 972x1812 en (54, 54)

También guías de tercios (rule of thirds):
- Líneas verticales en 1/3 y 2/3 del ancho
- Líneas horizontales en 1/3 y 2/3 del alto

**Rendering en VideoPreview:**
- Overlay de líneas semi-transparentes sobre el card
- Color: blanco 20% opacidad para las guías principales
- Title Safe: línea dashed blanca 30% opacidad
- Action Safe: línea sólida blanca 15% opacidad
- Tercios: línea dotted blanca 15% opacidad

**Toggle:**
- Estado `showGuides` en App.jsx (default: false)
- Botón toggle en TransportBar (ícono ⊞ o similar)
- Se pasa como prop `showGuides` a VideoPreview
- Solo visible cuando hay un clip activo

**En VideoPreview:**
```jsx
{showGuides && (
  <>
    {/* Action Safe 95% */}
    <div style={{
      position: 'absolute',
      left: `${0.025 * 100}%`, top: `${0.025 * 100}%`,
      width: `${0.95 * 100}%`, height: `${0.95 * 100}%`,
      border: '1px solid rgba(255,255,255,0.15)',
      pointerEvents: 'none',
    }} />
    {/* Title Safe 90% */}
    <div style={{
      position: 'absolute',
      left: `${0.05 * 100}%`, top: `${0.05 * 100}%`,
      width: `${0.9 * 100}%`, height: `${0.9 * 100}%`,
      border: '1px dashed rgba(255,255,255,0.3)',
      pointerEvents: 'none',
    }} />
    {/* Rule of thirds */}
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: '33.33%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.12)' }} />
      <div style={{ position: 'absolute', left: '66.66%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.12)' }} />
      <div style={{ position: 'absolute', top: '33.33%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.12)' }} />
      <div style={{ position: 'absolute', top: '66.66%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.12)' }} />
    </div>
  </>
)}
```

---

## Resumen de archivos a modificar

| Archivo | Features |
|---------|----------|
| `App.jsx` | J/K/L, Duplicate handler, showGuides state, snap helpers |
| `TransportBar.jsx` | J/K/L hints, guides toggle |
| `ClipBlock.jsx` | Botón duplicar |
| `ClipTrack.jsx` | Pasar onDuplicate prop |
| `VideoPreview.jsx` | Overlay de guías |
| `ClipTrim.jsx` | Snap en handles |

## Orden de implementación
1. **Duplicar Clip** (más simple, aislado)
2. **Guías de Título Seguro** (visual, sin lógica compleja)
3. **J/K/L Shuttle** (moderado, requiere manejo de playback)
4. **Snap Magnético** (más complejo, requiere cálculo de puntos)

## Verificación
- `npm run build` en client/ para verificar compilación
- Probar manualmente cada feature en el navegador
- Verificar que los shortcuts no interfieren entre sí
- Verificar que snap funciona correctamente con zoom variable
