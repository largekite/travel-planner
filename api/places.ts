// api/places.ts
// Vercel serverless function that proxies to Google Places Text Search

import type { VercelRequest, VercelResponse } from "@vercel/node";

const PLACE_TYPE_MAP: Record<string, string> = {
  breakfast: "breakfast",
  lunch: "restaurant",
  dinner: "restaurant",
  coffee: "cafe",
  activity: "tourist_attraction",
  hotel: "lodging",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const {
    city = "St. Louis",
    slot = "activity",
    limit = "10",
    area = "",
    vibe = "",
    q = "",
  } = req.query as Record<string, string>;

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ items: [], error: "GOOGLE_PLACES_API_KEY missing on server" });
  }

  const placeKind = PLACE_TYPE_MAP[slot] || "restaurant";

  // if UI sent q, use it, else build our own query
  const textQuery =
    q && q.trim().length > 0
      ? q
      : `${vibe ? vibe + " " : ""}${placeKind} near ${area ? area + ", " : ""}${city}`;

  const googleUrl =
    "https://maps.googleapis.com/maps/api/place/textsearch/json" +
    `?query=${encodeURIComponent(textQuery)}` +
    `&key=${apiKey}`;

  try {
    const resp = await fetch(googleUrl);
    const data = await resp.json();

    const items = (data.results || [])
      .slice(0, Number(limit))
      .map((p: any) => {
        const price =
          typeof p.price_level === "number" ? "$".repeat(p.price_level) : undefined;
        return {
          name: p.name,
          area: p.formatted_address,
          lat: p.geometry?.location?.lat,
          lng: p.geometry?.location?.lng,
          desc: p.types?.join(", "),
          price,
          ratings: {
            google: p.rating,
            googleReviews: p.user_ratings_total,
          },
          url: "", // needs a separate place-details call, so leave empty
        };
      });

    return res.status(200).json({ items });
  } catch (e: any) {
    return res.status(500).json({ items: [], error: e?.message || "fetch failed" });
  }
}
