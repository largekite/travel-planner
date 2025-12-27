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
  const area = ((req.query.area as string) || (req.query.q as string) || "").trim();
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

  // Build location hint - use area if provided, otherwise city
  const locationHint = area ? `${area} ${city}`.trim() : city || "St. Louis, Missouri";

  const useNearby = near && lat && lng;
  const radius = useNearby ? minutesToRadiusMeters(mode, maxMins) : undefined;

  let places: any[] = [];
  let nextPageToken: string | null = null;
  let rawError: any = null;

  // Build URL once
  const buildUrl = (pageToken?: string) => {
    if (useNearby) {
      const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
      url.searchParams.set("location", `${lat},${lng}`);
      url.searchParams.set("radius", String(radius));
      url.searchParams.set("type", googleType);
      const keywordParts = [slot, vibe, locationHint].filter(Boolean);
      url.searchParams.set("keyword", keywordParts.join(" "));
      url.searchParams.set("key", googleKey);
      if (pageToken) url.searchParams.set("pagetoken", pageToken);
      return url.toString();
    } else {
      const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
      const queryParts = vibe === "popular" 
        ? [slot, googleType, locationHint].filter(Boolean)
        : [slot, googleType, vibe, locationHint].filter(Boolean);
      url.searchParams.set("query", queryParts.join(" "));
      url.searchParams.set("key", googleKey);
      if (pageToken) url.searchParams.set("pagetoken", pageToken);
      return url.toString();
    }
  };

  try {
    const url = buildUrl(page > 1 ? req.query.pageToken as string : undefined);
    const r = await fetch(url);
    const data = await r.json();
    
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      rawError = data;
    }
    places = Array.isArray(data.results) ? data.results : [];
    nextPageToken = data.next_page_token || null;
  } catch (e: any) {
    return res.status(500).json({
      error: "google fetch failed",
      detail: e?.message,
    });
  }

  // Don't slice here since Google API already limits results per page

  // Run OpenAI enrichment in parallel (non-blocking)
  const openaiKey = process.env.OPENAI_API_KEY;
  let aiDescriptions: Record<string, string> = {};
  
  const aiPromise = openaiKey && places.length > 0 ? 
    (async () => {
      try {
        const names = places.slice(0, 10).map((p) => p.name).join(", "); // Limit to 10 for speed
        const prompt = `For these ${locationHint} places, give SHORT 1-sentence descriptions for "${vibe}" vibe. Return JSON: ${names}`;
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
            max_tokens: 500, // Limit response size
          }),
        });
        const data = await aiRes.json();
        const text = data?.choices?.[0]?.message?.content?.trim() || "{}";
        const parsed = JSON.parse(text);
        return parsed && typeof parsed === "object" ? parsed : {};
      } catch {
        return {};
      }
    })() : Promise.resolve({});

  // Process places and fetch details for websites
  const processedItems = await Promise.all(places.map(async (p) => {
    const loc = p.geometry?.location;
    const name = p.name as string;
    
    // Try to get website from Place Details API
    let websiteUrl = undefined;
    if (p.place_id) {
      try {
        const detailsUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
        detailsUrl.searchParams.set("place_id", p.place_id);
        detailsUrl.searchParams.set("fields", "website");
        detailsUrl.searchParams.set("key", googleKey);
        
        const detailsRes = await fetch(detailsUrl.toString());
        const detailsData = await detailsRes.json();
        websiteUrl = detailsData.result?.website;
      } catch {
        // Ignore errors, fall back to Google Maps link
      }
    }
    
    const finalUrl = websiteUrl || (p.place_id
      ? `https://www.google.com/maps/place/?q=place_id:${p.place_id}`
      : undefined);

    let cuisine: string | undefined;
    if (slot === "breakfast") cuisine = "Breakfast";
    else if (slot === "lunch") cuisine = "Lunch";
    else if (slot === "dinner") cuisine = "Dinner";
    else if (slot === "coffee") cuisine = "Coffee";

    return {
      name,
      url: finalUrl,
      area: p.vicinity || p.formatted_address,
      cuisine,
      price: p.price_level != null ? "$".repeat(p.price_level) : undefined,
      lat: loc?.lat,
      lng: loc?.lng,
      meta: useNearby ? `within ~${maxMins} min ${mode}` : undefined,
      placeId: p.place_id,
      ratings: {
        google: p.rating,
        googleReviews: p.user_ratings_total,
      },
    };
  }));

  // Wait for AI descriptions (with timeout)
  try {
    aiDescriptions = await Promise.race([
      aiPromise,
      new Promise<Record<string, string>>(resolve => setTimeout(() => resolve({}), 2000)) // 2s timeout
    ]);
  } catch {
    aiDescriptions = {};
  }

  // Add AI descriptions to processed items
  const items = processedItems.map(item => ({
    ...item,
    desc: aiDescriptions[item.name] || undefined,
  }));

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
      actualQuery: useNearby ? `keyword: ${[slot, vibe, locationHint].filter(Boolean).join(" ")}` : `query: ${[googleType, vibe, locationHint].filter(Boolean).join(" ")}`,
    },
  });
}
