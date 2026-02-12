// api/regenerate-slot.ts
// Endpoint for regenerating a single slot with new suggestions
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { city, vibe, slot, excludeNames, budget, lat, lng } = req.body;

  if (!city || !slot) {
    return res.status(400).json({ error: 'Missing required parameters: city, slot' });
  }

  const googleKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!googleKey) {
    return res.status(500).json({ error: 'GOOGLE_PLACES_API_KEY is not set' });
  }

  // Use timestamp as randomization seed to get different results
  const seed = Date.now();

  try {
    // Build query parameters for places API
    const params = new URLSearchParams({
      city: city,
      vibe: vibe || 'popular',
      slot: slot,
      budget: budget || 'moderate',
      limit: '10', // Fetch more to ensure we get something not in excludeNames
      seed: String(seed),
    });

    // If lat/lng provided, use nearby search
    if (lat && lng) {
      params.set('near', 'true');
      params.set('lat', String(lat));
      params.set('lng', String(lng));
    }

    // Call the main places API
    const apiBase = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const response = await fetch(`${apiBase}/api/places?${params.toString()}`);
    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return res.status(200).json({
        suggestion: null,
        message: 'No suggestions found'
      });
    }

    // Filter out excluded names
    const excluded = new Set(excludeNames || []);
    const newSuggestion = data.items.find((item: any) => !excluded.has(item.name));

    if (!newSuggestion) {
      return res.status(200).json({
        suggestion: null,
        message: 'No new suggestions available (all filtered)'
      });
    }

    return res.status(200).json({ suggestion: newSuggestion });

  } catch (error: any) {
    console.error('Regenerate slot error:', error);
    return res.status(500).json({
      error: 'Failed to regenerate slot',
      detail: error?.message
    });
  }
}
