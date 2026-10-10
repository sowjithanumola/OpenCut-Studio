# OpenCut Studio

A browser-based non-linear video editor: multitrack timeline, real-time composition preview, color grading, audio mixing, export, and optional Gemini-powered AI helpers (captions, titles, edit suggestions).

## Run locally

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY` (optional — AI features fall back to local presets without it)
3. Start the dev server: `npm run dev` (http://localhost:3000)

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Express + Vite dev server (`server/index.ts`) |
| `npm run build` | Production build into `dist/` |
| `npm start` | Serve the production build (run `npm run build` first) |
| `npm run lint` | Type-check with `tsc --noEmit` |

## Project structure

```
opencut-studio/
├── index.html                 # Vite entry HTML
├── vite.config.ts             # Vite config (alias: @ -> src)
├── tsconfig.json
├── package.json
├── .env.example
├── server/                    # Express backend
│   ├── index.ts               # App bootstrap, Vite middleware (dev) / static (prod)
│   ├── gemini.ts              # Gemini client + JSON helper
│   └── routes/
│       └── ai.ts              # /api/ai/captions, /titles, /edit-suggestions
└── src/                       # React frontend
    ├── main.tsx               # React entry
    ├── App.tsx                # Root layout
    ├── styles/
    │   └── index.css          # Tailwind + theme variables
    ├── types/
    │   └── editor.ts          # Shared editor types
    ├── context/
    │   └── EditorContext.tsx  # Global editor state and actions
    ├── services/              # Non-UI logic
    │   ├── aiService.ts       # Client for /api/ai/*
    │   ├── exportEngine.ts    # Frame rendering and video export
    │   ├── mediaProcessing.ts # Media import and analysis
    │   └── storage.ts         # Project persistence
    └── components/
        ├── layout/            # Main workspace panels
        │   ├── Header.tsx
        │   ├── MediaPanel.tsx
        │   ├── PreviewMonitor.tsx
        │   └── InspectorPanel.tsx
        ├── timeline/          # Timeline UI
        │   ├── TimelineContainer.tsx
        │   ├── TimelineToolbar.tsx
        │   ├── TimelineRuler.tsx
        │   ├── TrackHeader.tsx
        │   ├── TimelineClipView.tsx
        │   └── PlayheadView.tsx
        └── modals/            # Dialogs
            ├── ExportModal.tsx
            ├── AIModal.tsx
            ├── ProjectsModal.tsx
            └── ShortcutsModal.tsx
```

Imports use the `@/` alias, which maps to `src/` (e.g. `import { useEditor } from '@/context/EditorContext'`).
