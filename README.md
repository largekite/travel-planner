# Largekite Travel Planner (Vite + React + TypeScript + Tailwind + Vercel Functions)

- Frontend: `src/index.tsx` (planner UI)
- Serverless: `api/ai.ts` (single endpoint the UI calls)
- Works locally with `vercel dev` and on Vercel (same-origin `/api/ai`).

## Quickstart (local)
```bash
npm i
# set keys for local vercel dev
echo "OPENAI_API_KEY=sk-xxxx" > .env
npm run vercel:dev   # serves /api on http://localhost:3000
# in another terminal
echo "VITE_API_BASE=http://localhost:3000" > .env.local
npm run dev          # Vite at http://localhost:5173
```

## Deploy to Vercel
- Add env vars in Dashboard → Project → Settings → Environment Variables
  - `OPENAI_API_KEY = <your key>`
  - Optional: `VITE_API_BASE = https://<your-project>.vercel.app` (or leave unset; UI falls back to same-origin)
- Build command: `npm run build`
- Output dir: `dist`

## Endpoint checks
- Health: `/api/ai?health=1`
- Suggestions: `/api/ai?city=St.%20Louis&slot=dinner&vibe=romantic&limit=5`
- Near-me: add `&near=true&mode=walk&maxMins=15&lat=38.627&lng=-90.199`
- Directions: add `&withDirections=true`
