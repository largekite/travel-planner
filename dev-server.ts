// Local dev server to run Vercel API functions without the Vercel CLI.
// Usage: npx tsx dev-server.ts
import express from 'express';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS for local Vite dev server
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

const routes = [
  ['places', './api/places'],
  ['ai', './api/ai'],
  ['unsplash', './api/unsplash'],
  ['autocomplete', './api/autocomplete'],
  ['place-details', './api/place-details'],
  ['regenerate-slot', './api/regenerate-slot'],
] as const;

(async () => {
  for (const [path, mod] of routes) {
    try {
      const { default: handler } = await import(mod);
      app.all(`/api/${path}`, handler);
      console.log(`  mounted /api/${path}`);
    } catch (e) {
      console.warn(`  skipped /api/${path}:`, (e as Error).message);
    }
  }

  const PORT = 3002;
  app.listen(PORT, () => {
    console.log(`\nDev API server → http://localhost:${PORT}\n`);
  });
})();
