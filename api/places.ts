// api/places.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

// convert walk/drive minutes to meters (rough)
function minutesToRadiusMeters(mode: string, maxMins: number): number {
  // walk ~ 80m/min, drive ~ 700m/min (very rough, but good enough for filtering)
  const mins = Math.max(1, Math.min(60, maxMins || 15));
  const meters = mode === "walk" ? mins * 80 : mins * 700;
  // clamp so Google is happy
  return Math.max(500, Math.min(15000, meters));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // health check
  if (req.query.health) {
    return res.status(200).json({ ok: true });
  }

  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!googleKey) {
    return res.status(500).json({ error: "GOOGLE_MAPS_API_KEY is not set" });
  }

  const city = (req.query.city as string) || "";
  const slot = (req.query.slot as string) || "activity";
  const vibe = (req.query.vibe as string) || "romantic";
  const area = (req.query.area as string) || "";
  const near = (req.query.near as string) === "true";
  const mode = (req.query.mode as string) || "walk";
  const maxMins = Number(req.query.maxMins || 15);
  const lat = (req.query.lat as string) || "";
  const lng = (req.query.lng as string) || "";
  const limit = Number(req.query.limit || 10);

  // map UI slots to something Google understands
  const slotToQuery: Record<string, string> = {
    breakfast: "breakfast",
    lunch: "restaurant",
    dinner: "restaurant",
    coffee: "cafe",
    activity: "tourist attraction",
    hotel: "lodging",
  };
  const googleType = slotToQuery[slot] || "restaurant";

  // ------------------------------------------------------------------
  // decide which Google endpoint to hit
  // ------------------------------------------------------------------
  const useNearby = near && lat && lng; // only nearbysearch if we have coords
  const radius = useNearby ? minutesToRadiusMeters(mode, maxMins) : undefined;

  let places: any[] = [];

  try {
    if (useNearby) {
      // 1) NEARBY SEARCH – this is the one that respects radius
      const nearbyUrl = new URL(
        "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
      );
      nearbyUrl.searchParams.set("location", `${lat},${lng}`);
      nearbyUrl.searchParams.set("radius", String(radius));
      // restaurant/cafe/lodging/tourist_attraction etc.
      nearbyUrl.searchParams.set("type", googleType);
      // bias toward city/area by making the query richer
      const nameBits = [slot, area || city, vibe].filter(Boolean).join(" ");
      nearbyUrl.searchParams.set("keyword", nameBits);
      nearbyUrl.searchParams.set("key", googleKey);

      const r = await fetch(nearbyUrl.toString());
      const data = await r.json();
      places = Array.isArray(data.results) ? data.results : [];
    } else {
      // 2) TEXT SEARCH – when we don't have coords
      const textUrl = new URL(
        "https://maps.googleapis.com/maps/api/place/textsearch/json"
      );
      const qParts = [googleType, area || city, vibe].filter(Boolean).join(" ");
      textUrl.searchParams.set("query", qParts);
      textUrl.searchParams.set("key", googleKey);

      const r = await fetch(textUrl.toString());
      const data = await r.json();
      places = Array.isArray(data.results) ? data.results : [];
    }
  } catch (e: any) {
    return res
      .status(500)
      .json({ error: "google fetch failed", detail: e?.message });
  }

  // trim
  places = places.slice(0, limit);

  // ------------------------------------------------------------------
  // OPTIONAL: enrich with OpenAI
  // ------------------------------------------------------------------
  const openaiKey = process.env.OPENAI_API_KEY;
  let aiDescriptions: Record<string, string> = {};

  if (openaiKey && places.length > 0) {
    try {
      const names = places.map((p) => p.name).join(", ");
      const prompt = `You are helping a travel planner. For these places in ${city}, give a SHORT 1-sentence description tailored to a "${vibe}" vibe. Return JSON object keyed by exact place name.\nPlaces: ${names}`;
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
      // ignore AI errors
    }
  }

  // ------------------------------------------------------------------
  // normalize to UI shape
  // ------------------------------------------------------------------
  const items = places.map((p) => {
    const loc = p.geometry?.location;
    const name = p.name as string;
    const desc = aiDescriptions[name];
    return {
      name,
      url: p.website || p.url,
      area: p.vicinity || p.formatted_address,
      cuisine: slot === "coffee" ? "Coffee" : undefined,
      price: p.price_level != null ? "$".repeat(p.price_level) : undefined,
      lat: loc?.lat,
      lng: loc?.lng,
      desc: desc,
      // show what we actually filtered on
      meta: useNearby
        ? `within ~${maxMins} min ${mode} (${radius}m)`
        : undefined,
      ratings: {
        google: p.rating,
        googleReviews: p.user_ratings_total,
      },
    };
  });

  return res.status(200).json({ items });
}
