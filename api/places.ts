// api/places.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

// helper to build google textsearch query
function buildGoogleUrl(params: {
  query: string;
  lat?: string;
  lng?: string;
  radius?: number;
  apiKey: string;
}) {
  const base = "https://maps.googleapis.com/maps/api/place/textsearch/json";
  const u = new URL(base);
  u.searchParams.set("query", params.query);
  // if you pass lat/lng, you can also pass radius to prioritize
  if (params.lat && params.lng && params.radius) {
    u.searchParams.set("location", `${params.lat},${params.lng}`);
    u.searchParams.set("radius", String(params.radius));
  }
  u.searchParams.set("key", params.apiKey);
  return u.toString();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // health check used by the UI
  if (req.query.health) {
    return res.status(200).json({ ok: true });
  }

  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!googleKey) {
    return res.status(500).json({ error: "GOOGLE_MAPS_API_KEY is not set" });
  }

  // frontend sends these
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

  // map slot -> a loose google query
  const slotToQuery: Record<string, string> = {
    breakfast: "breakfast",
    lunch: "lunch restaurant",
    dinner: "dinner restaurant",
    coffee: "coffee shop",
    activity: "tourist attraction",
    hotel: "hotel",
  };
  const slotQuery = slotToQuery[slot] || slotToQuery["activity"];

  // build a human query like:
  // "breakfast in St. Louis romantic near tower grove"
  const pieces = [slotQuery];
  if (area) pieces.push(area);
  if (city) pieces.push(city);
  if (vibe) pieces.push(vibe);
  const query = pieces.join(" ");

  // radius: if near-me is on, we want to bias to closer places
  let radius = 0;
  if (near && lat && lng) {
    // walking ~ 80m per min, driving ~ 700m per min (very rough)
    radius = mode === "walk" ? maxMins * 80 : maxMins * 700;
    if (radius < 1000) radius = 1000; // google wants reasonable min
    if (radius > 15000) radius = 15000; // keep it sane
  }

  const url = buildGoogleUrl({
    query,
    lat: near ? lat : undefined,
    lng: near ? lng : undefined,
    radius: radius || undefined,
    apiKey: googleKey,
  });

  let googleJson: any;
  try {
    const r = await fetch(url);
    googleJson = await r.json();
  } catch (e: any) {
    return res.status(500).json({ error: "google fetch failed", detail: e?.message });
  }

  const places: any[] = Array.isArray(googleJson.results)
    ? googleJson.results.slice(0, limit)
    : [];

  // we will try to enrich with OpenAI (optional)
  const openaiKey = process.env.OPENAI_API_KEY;
  let aiDescriptions: Record<string, string> = {};

  if (openaiKey && places.length > 0) {
    try {
      // we only send the names to avoid large prompts
      const names = places.map((p) => p.name).join(", ");
      const prompt = `You are helping a travel planner. For these places in ${city}, give a SHORT 1-sentence description tailored to a "${vibe}" vibe. Return as JSON object keyed by exact place name.\nPlaces: ${names}`;
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

      const text =
        aiRes.choices?.[0]?.message?.content?.trim() || "{}";

      // try to parse as JSON, if not, ignore
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === "object") {
          aiDescriptions = parsed;
        }
      } catch {
        // ignore AI parse error
      }
    } catch (e) {
      // ignore AI errors, we can still return raw places
    }
  }

  // normalize to what the React UI expects
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
      meta: near && lat && lng
        ? `within ~${maxMins} min ${mode}`
        : undefined,
      ratings: {
        google: p.rating,
        googleReviews: p.user_ratings_total,
      },
    };
  });

  return res.status(200).json({ items });
}
