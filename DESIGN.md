# Codecut 9:16 — Sistema de diseño v0.13

## Objetivo

El rediseño convierte Codecut en un estudio de edición vertical más homogéneo, profesional y eficiente. La inspiración visual de las referencias se traduce en contraste nocturno, azul eléctrico, cian luminoso y rosa intenso; las ilustraciones originales no se incorporan al producto.

La interfaz prioriza el trabajo de edición: biblioteca a la izquierda, lienzo al centro, inspector contextual a la derecha y línea de tiempo anclada abajo. La densidad es deliberadamente intermedia para mostrar suficiente información sin perder claridad.

## Paleta

| Rol | Token | Valor | Uso |
| --- | --- | --- | --- |
| Fondo | `editor-bg` | `#060b15` | Base del estudio |
| Panel | `editor-panel` | `#0a1323` | Barras y paneles principales |
| Superficie | `editor-surface` | `#101d31` | Controles, tarjetas y campos |
| Borde | `editor-border` | `#1d3049` | Separación estructural |
| Acción | `accent` | `#1688ff` | Selección y acciones principales |
| Señal | `signal` | `#22d3ee` | Estado, foco y detalle luminoso |
| Énfasis | `flare` | `#ff2d78` | Acentos editoriales puntuales |
| Texto | `#e8f4ff` | — | Lectura principal |
| Texto tenue | `#8da3c2` | — | Metadatos y ayudas |

El morado deja de ser el color dominante. El azul concentra la interacción; el cian comunica precisión y estado; el rosa se reserva para contraste editorial, YouTube y puntos que necesitan atención.

## Tipografía

- `Inter`: interfaz, formularios, metadatos y lectura sostenida.
- `Space Grotesk`: marca y títulos de alto impacto mediante `.display-font`.
- `JetBrains Mono`: tiempos, escalas, resolución y valores técnicos.

## Composición del editor

### Escritorio

- Barra superior de 64 px con identidad, historial, métricas, autoguardado, proyecto y exportación.
- Rail de herramientas de 60 px para Medios, Texto y Plantillas.
- Biblioteca con ancho inicial de 288 px, ajustable entre 240 y 380 px.
- Lienzo flexible con barra contextual y escenario cuadriculado.
- Inspector con ancho inicial de 344 px, ajustable entre 300 y 440 px.
- Línea de tiempo de 240 px, ajustable entre 180 y 420 px.

El doble clic sobre un separador restaura su dimensión. Los separadores también responden a flechas del teclado; `Shift` aumenta el paso.

### Tablet y móvil

- En tablet se conserva el rail y los paneles aparecen como overlays laterales.
- En móvil, la biblioteca utiliza drawer y el inspector utiliza bottom sheet.
- Solo un panel superpuesto puede permanecer abierto a la vez.
- La línea de tiempo reduce su altura y oculta el separador táctil innecesario.

## Inspector contextual

El inspector elimina la navegación redundante por pestañas. Su contenido responde al objeto seleccionado:

- Texto seleccionado: contenido, tipografía/color, alineación, tamaño, rotación, tiempo, animación, fondo y contorno.
- Clip seleccionado: lienzo, transformación, recorte preciso, velocidad, audio, imagen sobre imagen y ranking colaborativo cuando corresponde.
- Sin selección: estado vacío con indicación clara.

Las secciones usan disclosure nativo (`details`/`summary`) para conservar semántica y navegación por teclado.

## Biblioteca y línea de tiempo

- El rail mantiene las herramientas principales visibles y reduce cambios de contexto.
- La biblioteca muestra una sola herramienta a la vez y deja de duplicar su navegación en escritorio.
- Transporte, tiempo global, zoom y acciones de clip se agrupan en la cabecera de la línea de tiempo.
- Las transiciones usan miniaturas animadas y nombres en español.
- Los estados vacíos explican la siguiente acción posible.

## Movimiento

La estética anime/editorial aparece mediante barridos lineales, acentos diagonales, resplandor controlado y entradas cortas del inspector. Las animaciones evitan propiedades costosas y respetan `prefers-reduced-motion`.

## Accesibilidad

- Controles iconográficos con `title` o `aria-label` en español.
- Separadores con rol, orientación, límites y valor accesibles.
- Estados activos comunicados con color, borde y forma; no dependen solo del color.
- Foco visible común mediante `.focus-ring`.
- Contraste alto sobre fondos oscuros.
- Áreas táctiles se mantienen en drawers, sheets y barra superior.

## Arquitectura y persistencia

- `EditorShell` define regiones; no contiene lógica de edición.
- `CanvasWorkspace` y `TimelineDock` componen UI sin duplicar estado del proyecto.
- `useWorkspaceLayout` contiene el estado visual y expone callbacks estables.
- `workspaceLayout.js` valida y limita datos persistidos antes de usarlos.
- Las dimensiones y visibilidad se guardan con debounce en `localStorage`.
- El estado documental y el historial continúan centralizados en `useProjectState`; el layout no entra en el undo del contenido.

## Archivos principales aplicados

- `client/src/App.jsx`: ensamblaje del nuevo workspace y flujos responsive.
- `client/src/components/EditorShell.jsx`: rejilla adaptable y paneles.
- `client/src/components/ToolRail.jsx`: navegación primaria.
- `client/src/components/CanvasWorkspace.jsx`: chrome del lienzo.
- `client/src/components/TimelineDock.jsx`: composición de la línea de tiempo.
- `client/src/components/PropertiesPanel.jsx`: inspector contextual.
- `client/src/components/ResizeHandle.jsx`: redimensionado accesible.
- `client/src/hooks/useWorkspaceLayout.js`: coordinación y persistencia.
- `client/src/lib/workspaceLayout.js`: reglas puras y sanitización.
- `client/src/index.css` y `client/tailwind.config.js`: tokens, superficies y movimiento.

## Verificación

- Pruebas unitarias del cliente, incluidas las reglas de layout persistido.
- Build de producción con Vite.
- `git diff --check` para validar el parche.
- Revisión visual de la portada y del modal de importación en el navegador.
