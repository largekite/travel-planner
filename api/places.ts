// api/places.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

function minutesToRadiusMeters(mode: string, maxMins: number): number {
  const mins = Math.max(1, Math.min(60, maxMins || 15));
  // Rough heuristics: walk ~80m/min, drive ~700m/min
  const meters = mode === "walk" ? mins * 80 : mins * 700;
  // Clamp to something sane for urban STL
  return Math.max(500, Math.min(15000, meters));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.query.health) {
    return res.status(200).json({ ok: true });
  }

  const googleKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!googleKey) {
    return res.status(500).json({ error: "GOOGLE_PLACES_API_KEY is not set" });
  }

  const city = ((req.query.city as string) || "").trim();
  const slot = ((req.query.slot as string) || "activity").trim();
  const vibe = ((req.query.vibe as string) || "romantic").trim();
  const area = ((req.query.area as string) || "").trim();
  const near = (req.query.near as string) === "true";
  const mode = ((req.query.mode as string) || "walk").toLowerCase();
  const maxMins = Number(req.query.maxMins || 15);
  const lat = (req.query.lat as string) || "";
  const lng = (req.query.lng as string) || "";
  const limit = Math.min(Number(req.query.limit || 10), 20); // Cap at 20 for performance
  const page = Number(req.query.page || 1);
  const offset = (page - 1) * limit;

  const slotToQuery: Record<string, string> = {
    breakfast: "breakfast",
    lunch: "restaurant",
    dinner: "restaurant",
    coffee: "cafe",
    activity: "tourist attraction",
    hotel: "lodging",
  };
  const googleType = slotToQuery[slot] || "restaurant";

  // Strong STL/Missouri hint if the city looks like St. Louis or if user types suburbs
  const cityLower = city.toLowerCase();
  const looksLikeStl =
    cityLower.includes("st. louis") ||
    cityLower.includes("st louis") ||
    cityLower.includes("saint louis");

  // If city is STL (or empty but area looks like a STL suburb), force Missouri
  const locationHint = looksLikeStl || !city
    ? "St. Louis, Missouri"
    : city;

  const useNearby = near && lat && lng;
  const radius = useNearby ? minutesToRadiusMeters(mode, maxMins) : undefined;

  let places: any[] = [];
  let nextPageToken: string | null = null;
  let rawError: any = null;

  try {
    if (useNearby) {
      // Nearby search with radius around center
      const nearbyUrl = new URL(
        "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
      );
      nearbyUrl.searchParams.set("location", `${lat},${lng}`);
      nearbyUrl.searchParams.set("radius", String(radius));
      nearbyUrl.searchParams.set("type", googleType);

      // Keep results in STL/MO; include area text plus a strong city/state hint
      const keywordParts = [
        slot,
        area,
        locationHint, // very important for Wildwood/Webster/Tower Grove
        vibe,
      ].filter(Boolean);
      nearbyUrl.searchParams.set("keyword", keywordParts.join(" "));
      nearbyUrl.searchParams.set("key", googleKey);

      // Handle pagination for nearby search
      if (page > 1 && req.query.pageToken) {
        nearbyUrl.searchParams.set("pagetoken", req.query.pageToken as string);
      }
      
      const r = await fetch(nearbyUrl.toString());
      const data = await r.json();
      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        rawError = data;
      }
      places = Array.isArray(data.results) ? data.results : [];
      nextPageToken = data.next_page_token || null;
    } else {
      // Text search without lat/lng; rely on query text + city/state
      const textUrl = new URL(
        "https://maps.googleapis.com/maps/api/place/textsearch/json"
      );
      const queryParts = [
        googleType,
        area,
        locationHint, // pushes to STL/MO instead of NJ/etc
        vibe,
      ].filter(Boolean);
      textUrl.searchParams.set("query", queryParts.join(" "));
      textUrl.searchParams.set("key", googleKey);

      // Handle pagination for text search
      if (page > 1 && req.query.pageToken) {
        textUrl.searchParams.set("pagetoken", req.query.pageToken as string);
      }
      
      const r = await fetch(textUrl.toString());
      const data = await r.json();
      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        rawError = data;
      }
      places = Array.isArray(data.results) ? data.results : [];
      nextPageToken = data.next_page_token || null;
    }
  } catch (e: any) {
    return res.status(500).json({
      error: "google fetch failed",
      detail: e?.message,
    });
  }

  // Don't slice here since Google API already limits results per page

  // Optional OpenAI enrichment for vibe-tailored 1-liner descriptions
  const openaiKey = process.env.OPENAI_API_KEY;
  let aiDescriptions: Record<string, string> = {};
  if (openaiKey && places.length > 0) {
    try {
      const names = places.map((p) => p.name).join(", ");
      const prompt = `You are helping a travel planner. For these places in ${locationHint}, give a SHORT 1-sentence description tailored to a "${vibe}" vibe. Return JSON object keyed by exact place name.\nPlaces: ${names}`;
      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.6,
        }),
      }).then((r) => r.json());
      const text = aiRes?.choices?.[0]?.message?.content?.trim() || "{}";
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === "object") {
          aiDescriptions = parsed;
        }
      } catch {
        // ignore JSON parse errors
      }
    } catch {
      // ignore AI errors completely
    }
  }

  const items = places.map((p) => {
    const loc = p.geometry?.location;
    const name = p.name as string;
    const desc = aiDescriptions[name];

    // Always provide a Google Maps link via place_id
    const mapsUrl = p.place_id
      ? `https://www.google.com/maps/place/?q=place_id:${p.place_id}`
      : undefined;

    // Simple slot → cuisine label for UI
    let cuisine: string | undefined;
    if (slot === "breakfast") cuisine = "Breakfast";
    else if (slot === "lunch") cuisine = "Lunch";
    else if (slot === "dinner") cuisine = "Dinner";
    else if (slot === "coffee") cuisine = "Coffee";

    return {
      name,
      url: mapsUrl,                       // <-- so your UI always has a link
      area: p.vicinity || p.formatted_address,
      cuisine,
      price: p.price_level != null ? "$".repeat(p.price_level) : undefined,
      lat: loc?.lat,
      lng: loc?.lng,
      desc: desc,
      meta: useNearby ? `within ~${maxMins} min ${mode}` : undefined,
      ratings: {
        google: p.rating,
        googleReviews: p.user_ratings_total,
      },
    };
  });

  return res.status(200).json({
    items,
    nextPageToken,
    hasMore: !!nextPageToken,
    page,
    debug: {
      rawStatus: rawError?.status || "OK",
      radiusMeters: radius ?? null,
      useNearby,
      locationHint,
      slot,
      city,
      area,
      mode,
      maxMins,
    },
  });
}
