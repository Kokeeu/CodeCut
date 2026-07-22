# Codecut 9:16 - AI Agent Guide

## Project Overview

Codecut 9:16 is a vertical video editor (1080×1920) for creating TikTok/Reels-style content with blurred backgrounds, positioned text overlays, and multi-clip editing. Built with React + Vite + Tailwind (frontend) and Node.js + Express + FFmpeg (backend).

## Architecture

```
video-editor/
├── client/          # React SPA (Vite)
│   └── src/
│       ├── App.jsx              # Main state + layout
│       └── components/
│           ├── VideoPreview.jsx      # Editor preview (drag/resize texts)
│           ├── CardTemplate.jsx      # Pure card renderer (4 layers)
│           ├── TemplatesPanel.jsx    # Template gallery + apply
│           ├── ClipTrack.jsx         # Timeline with dnd-kit
│           ├── ClipBlock.jsx         # Individual clip in timeline
│           ├── ClipTrim.jsx          # Trim handles for active clip
│           ├── TransitionPicker.jsx  # Between-clip transitions
│           ├── VideoUploader.jsx     # Multi-file upload
│           ├── FilePool.jsx          # Media pool cards
│           ├── CardMetadata.jsx      # Per-clip text editor
│           ├── ExportButton.jsx      # Sends to /api/trim
│           └── ProjectSummary.jsx    # Stats display
├── server/
│   ├── index.js                  # Express entry
│   ├── routes/trim.js            # POST /api/trim endpoint
│   ├── lib/ffmpegPipeline.js     # FFmpeg filter graph builder
│   └── assets/fonts/             # Inter, Montserrat, Bebas Neue
└── README.md
```

## Key Concepts

### Card Layout (9:16)

Every output is a 1080×1920 card with 4 layers:
1. **Blur background** - Video scaled to cover + `gblur` + brightness/saturation
2. **Main video** - 16:9, positioned via `transform: { x, y, scale }`
3. **Texts** - Free-form array, each with `{ text, x, y, size, font, color, align }`
4. **Overlays** - "9:16" badge, time indicators

### State Model

```js
// App.jsx
{
  files: [{ id, file, url, name, duration, thumbnail }],
  clips: [{
    id, fileId, sourceStart, sourceEnd,
    transform: { x, y, scale },
    texts: [{ id, text, x, y, size, font, color, align, startOffset, endOffset }]
  }],
  transitions: [{ type, durationSec }],  // between clips
  meta: { blur, blurEnabled },
  activeClipId, currentOffset, isPlaying, selectedTextId
}
```

### Templates

4 hardcoded templates in `App.jsx`:
- **Opening Anime** - Inter, white, header + 4 lines
- **Neon Style** - Bebas Neue, yellow, minimal
- **Dark Mode** - Montserrat, blur heavy, texts top
- **Editorial** - Inter, no header, 2 lines

Each template has `texts[]` with positions. Apply replaces `clip.texts` for all clips.

## Backend Pipeline

`ffmpegPipeline.js` builds a filter graph:

1. **Per clip**: trim → split → [main scaled] + [bg scaled/cropped/blurred] → overlay
2. **Transitions**: xfade (video) + acrossfade (audio) between clips
3. **Texts**: drawtext with `textfile=` (avoids escape issues), `enable='between(t,start,end)'`
4. **Output**: libx264 crf 20, aac 128k, faststart

Key constants:
- `OUTPUT_W = 1080, OUTPUT_H = 1920`
- `MAIN_Y = 360` (video top position)
- `BG_BLUR_SIGMA = 30` (default)

## Frontend Patterns

### Video Preview

- Single `<video>` element, seeks on clip change
- Drag/resize texts via `useImperativeHandle` + pointer events
- `ResizeObserver` for handle positions
- Play/pause via `isPlaying` state

### CardTemplate (Pure Component)

Renders a card given props. No state. Used in:
- TemplatesPanel (previews)
- Could be used for gallery (removed in v0.12)

Props: `videoUrl, texts, headerText, animeTitle, ...font, color, blur, transform, height, isActive`

### Drag & Drop

- **Clips**: `@dnd-kit/sortable` in ClipTrack
- **Texts**: custom pointer events in VideoPreview
- **Resize**: 4 corner handles, ResizeObserver

## Testing

Backend smoke tests in `server/scripts/`:
- `smoke_all.js` - 6 cases (single clip, multi-clip, transitions, edge cases)
- `smoke_v04.js` - Card layout with text

Run: `node server/scripts/smoke_all.js` (requires server running on :4000)

## Common Tasks

### Add a new template

In `App.jsx`, add to `TEMPLATES` array:
```js
{
  id: 'tpl-new',
  name: 'New Template',
  font: 'inter',
  color: '#ffffff',
  blur: 30,
  blurEnabled: true,
  texts: [
    { text: 'Header', x: 540, y: 120, size: 64, align: 'center' },
    { text: 'Title', x: 70, y: 1080, size: 67, align: 'left' },
    // ...
  ],
}
```

### Change default video position

In `CardTemplate.jsx`, `VideoPreview.jsx`, and `ffmpegPipeline.js`:
```js
const MAIN_Y = 360;  // change this
```

### Add a new font

1. Download TTF to `server/assets/fonts/`
2. Add to `FONT_REGISTRY` in `ffmpegPipeline.js`
3. Add to `FONT_OPTIONS` in `CardMetadata.jsx`
4. Add to `FONT_CSS` in `CardMetadata.jsx`
5. Import in `client/src/index.css` (Google Fonts)

### Fix text escape issues

Use `textfile=` approach (already implemented). Write text to temp file, reference in drawtext.

## Conventions

- **No comments** in code unless necessary
- **Tailwind** for styling (no CSS modules)
- **Functional components** with hooks
- **useCallback** for handlers passed to children
- **useMemo** for derived state
- **forwardRef** for VideoPreview (needs imperative seekTo)
- **No PropTypes** (TypeScript not used)

## Build & Run

```bash
# Install
cd client && npm install
cd server && npm install

# Dev
cd server && npm start          # :4000
cd client && npm run dev        # :5173

# Build
cd client && npm run build

# Test
cd server && node scripts/smoke_all.js
```

## Known Issues

- Preview blur intensity differs slightly from export (CSS `blur()` vs FFmpeg `gblur`)
- Text `align: 'center'` uses `(w-text_w)/2` in export, CSS `translateX(-50%)` in preview
- No undo/redo (planned)
- No project save/load (planned)

## Version History

- v0.1: Single-clip trimmer
- v0.2: Multi-clip + transitions
- v0.3: Crossfade preview (removed), blur bg
- v0.4: Text overlays (structured fields)
- v0.5: Free-form texts (drag/resize)
- v0.6: Per-clip texts + time ranges
- v0.7: CardTemplate + gallery (removed)
- v0.8: Templates system
- v0.9: Left-aligned layout
- v0.10: Position refinements
- v0.11: Size 67 for all texts
- v0.12: Simplified (removed gallery, apply to all)
