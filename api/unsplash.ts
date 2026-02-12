// api/unsplash.ts
// Endpoint for fetching city hero images from Unsplash
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const city = req.query.city as string;

  if (!city) {
    return res.status(400).json({ error: 'Missing city parameter' });
  }

  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;

  // If no Unsplash key, return null (component will use fallback gradient)
  if (!unsplashKey) {
    return res.status(200).json({ imageUrl: null });
  }

  try {
    // Search for city landscape photos
    const searchQuery = `${city} cityscape landmark`;
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&orientation=landscape&per_page=5&order_by=relevant`,
      {
        headers: {
          Authorization: `Client-ID ${unsplashKey}`,
        },
      }
    );

    if (!response.ok) {
      console.error('Unsplash API error:', response.statusText);
      return res.status(200).json({ imageUrl: null });
    }

    const data = await response.json();

    // Get the first high-quality image, fallback to null
    const imageUrl = data.results?.[0]?.urls?.regular || null;
    const photographer = data.results?.[0]?.user?.name || null;
    const photographerUrl = data.results?.[0]?.user?.links?.html || null;

    return res.status(200).json({
      imageUrl,
      photographer,
      photographerUrl,
    });

  } catch (error: any) {
    console.error('Unsplash fetch error:', error);
    // Return null instead of error to allow graceful degradation
    return res.status(200).json({ imageUrl: null });
  }
}
