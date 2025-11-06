// api/places.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

function minutesToRadiusMeters(mode: string, maxMins: number): number {
  const mins = Math.max(1, Math.min(60, maxMins || 15));
  const meters = mode === "walk" ? mins * 80 : mins * 700;
  return Math.max(500, Math.min(15000, meters));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.query.health) {
    return res.status(200).json({ ok: true });
  }

  const googleKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!googleKey) {
    return res.status(500).json({ error: "GOOGLE_PLACES_API_KEY is not set" });
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

  // slot → google type
  const slotToQuery: Record<string, string> = {
    breakfast: "breakfast",
    lunch: "restaurant",
    dinner: "restaurant",
    coffee: "cafe",
    activity: "tourist attraction",
    hotel: "lodging",
  };
  const googleType = slotToQuery[slot] || "restaurant";

  // build a location hint to keep Google inside STL
  // if your app will *always* be STL, you can force "Missouri" here
  const locationHint =
    city.toLowerCase().includes("st. louis") || city.toLowerCase().includes("st louis")
      ? "St. Louis, Missouri"
      : city;

  const useNearby = near && lat && lng;
  const radius = useNearby ? minutesToRadiusMeters(mode, maxMins) : undefined;

  let places: any[] = [];

  try {
    if (useNearby) {
      // nearbysearch honors location+radius, so we also add the area to keyword
      const nearbyUrl = new URL(
        "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
      );
      nearbyUrl.searchParams.set("location", `${lat},${lng}`);
      nearbyUrl.searchParams.set("radius", String(radius));
      nearbyUrl.searchParams.set("type", googleType);

      // IMPORTANT: pin area to STL so "wildwood" won’t go to NJ
      const keywordParts = [
        slot,
        area,
        locationHint, // ← keeps it in STL/MO
        vibe,
      ].filter(Boolean);
      nearbyUrl.searchParams.set("keyword", keywordParts.join(" "));
      nearbyUrl.searchParams.set("key", googleKey);

      const r = await fetch(nearbyUrl.toString());
      const data = await r.json();
      places = Array.isArray(data.results) ? data.results : [];
    } else {
      // textsearch: we must add the city/state here too
      const textUrl = new URL(
        "https://maps.googleapis.com/maps/api/place/textsearch/json"
      );
      const queryParts = [
        googleType,
        area,
        locationHint, // ← pushes it to STL/MO
        vibe,
      ].filter(Boolean);
      textUrl.searchParams.set("query", queryParts.join(" "));
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

  places = places.slice(0, limit);

  // optional OpenAI enrichment (same as before)
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
        // ignore
      }
    } catch {
      // ignore ai errors
    }
  }

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
      meta: useNearby ? `within ~${maxMins} min ${mode}` : undefined,
      ratings: {
        google: p.rating,
        googleReviews: p.user_ratings_total,
      },
    };
  });

  return res.status(200).json({ items });
}
