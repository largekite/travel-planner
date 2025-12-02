import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const googleKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!googleKey) {
    return res.status(500).json({ error: "GOOGLE_PLACES_API_KEY is not set" });
  }

  const placeId = req.query.placeId as string;
  if (!placeId) {
    return res.status(400).json({ error: "placeId is required" });
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("fields", "photos,reviews,opening_hours,formatted_phone_number,website");
    url.searchParams.set("key", googleKey);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== "OK") {
      return res.status(404).json({ error: "Place not found" });
    }

    const result = data.result;
    
    // Process photos
    const photos = result.photos?.slice(0, 4).map((photo: any) => {
      return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${googleKey}`;
    }) || [];

    // Process reviews
    const reviews = result.reviews?.slice(0, 3).map((review: any) => ({
      author: review.author_name,
      rating: review.rating,
      text: review.text
    })) || [];

    // Process hours
    const hours = result.opening_hours?.weekday_text || [];

    return res.status(200).json({
      photos,
      reviews,
      hours,
      phone: result.formatted_phone_number,
      website: result.website
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}