// /api/places.ts (Next.js / Vercel edge or node)
import type { NextRequest } from "next/server";

const PLACE_TYPE_MAP: Record<string, string> = {
  breakfast: "breakfast",
  lunch: "restaurant",
  dinner: "restaurant",
  coffee: "cafe",
  activity: "tourist_attraction",
  hotel: "lodging",
};

export const config = {
  runtime: "edge",
};

export default async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city") || "St. Louis";
  const slot = searchParams.get("slot") || "activity";
  const limit = Number(searchParams.get("limit") || "10");
  const vibe = searchParams.get("vibe") || ""; // optional, just passed through
  const area = searchParams.get("area") || ""; // “Tower Grove”, etc.

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ items: [], error: "GOOGLE_PLACES_API_KEY missing" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  // build a text query like “romantic restaurant near Tower Grove, St. Louis”
  const slotType = PLACE_TYPE_MAP[slot] || "restaurant";
  const vibePrefix = vibe ? `${vibe} ` : "";
  const areaPart = area ? `${area}, ` : "";
  const query = encodeURIComponent(`${vibePrefix}${slotType} near ${areaPart}${city}`);

  // Google Places Text Search
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`;

  const res = await fetch(url);
  const data = await res.json();

  // normalize to what the UI expects
  const items = (data.results || []).slice(0, limit).map((p: any) => {
    const priceLevel = typeof p.price_level === "number" ? "$".repeat(p.price_level) : undefined;
    return {
      name: p.name,
      url: p.website || (p.photos?.[0]?.html_attributions?.[0] ?? ""), // often empty; front-end tolerates
      area: p.formatted_address,
      lat: p.geometry?.location?.lat,
      lng: p.geometry?.location?.lng,
      desc: p.types?.join(", "),
      price: priceLevel,
      ratings: {
        google: p.rating,
        googleReviews: p.user_ratings_total,
      },
      // we can pass the raw place_id so frontend can re-hit later if needed
      place_id: p.place_id,
    };
  });

  return new Response(JSON.stringify({ items }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
