
# Largekite Trip Planner (Vite + React + TS + Tailwind)

Single-page React app wrapped with Vite and Tailwind. Your UI talks to an external API base via `VITE_API_BASE`.

## Quick start
```bash
npm i
cp .env.example .env
# edit .env and set VITE_API_BASE=... (or leave blank to see "API not configured")
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Deploy on Vercel
- Import the repo → Framework: **Vite** (auto-detected)
- Build Command: `npm run build` (auto)
- Output: `dist` (auto)
- Add env var `VITE_API_BASE` in Project Settings → Environment Variables (Production + Preview)

