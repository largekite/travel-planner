// Simple Express server to run Vercel API functions locally
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple wrapper to convert Vercel handler to Express middleware
function wrapVercelHandler(handlerPath) {
  return async (req, res) => {
    try {
      // Dynamic import of the handler
      const module = await import(handlerPath);
      const handler = module.default;

      // Convert Express req/res to Vercel format
      const vercelReq = {
        query: req.query,
        body: req.body,
        method: req.method,
        headers: req.headers,
      };

      const vercelRes = {
        status: (code) => {
          res.status(code);
          return vercelRes;
        },
        json: (data) => {
          res.json(data);
          return vercelRes;
        },
        send: (data) => {
          res.send(data);
          return vercelRes;
        },
        end: () => {
          res.end();
          return vercelRes;
        },
        setHeader: (key, value) => {
          res.setHeader(key, value);
          return vercelRes;
        },
      };

      await handler(vercelReq, vercelRes);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: error.message, stack: error.stack });
    }
  };
}

// API Routes
app.all('/api/places', wrapVercelHandler('./api/places.ts'));
app.all('/api/ai', wrapVercelHandler('./api/ai.ts'));
app.all('/api/autocomplete', wrapVercelHandler('./api/autocomplete.ts'));
app.all('/api/place-details', wrapVercelHandler('./api/place-details.ts'));

// Also handle the regenerate and unsplash endpoints we created
app.all('/api/regenerate-slot', wrapVercelHandler('./api/regenerate-slot.ts'));
app.all('/api/unsplash', wrapVercelHandler('./api/unsplash.ts'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Dev server running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Dev API server running at http://localhost:${PORT}`);
  console.log(`📍 API endpoints:`);
  console.log(`   - http://localhost:${PORT}/api/places`);
  console.log(`   - http://localhost:${PORT}/api/ai`);
  console.log(`   - http://localhost:${PORT}/api/autocomplete`);
  console.log(`   - http://localhost:${PORT}/api/place-details`);
  console.log(`   - http://localhost:${PORT}/api/regenerate-slot`);
  console.log(`   - http://localhost:${PORT}/api/unsplash`);
  console.log(`\n✨ Frontend should be running on http://localhost:5173`);
});
