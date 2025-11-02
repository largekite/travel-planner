// /api/ai.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import OpenAI from "openai";

type ApiSuggestion = {
  name: string;
  url?: string;
  area?: string;
  cuisine?: string;
  price?: string;
  lat?: number;
  lng?: number;
  desc?: string;
  meta?: string;
  ratings?: {
    combined?: number;
    yelp?: number;
    yelpReviews?: number;
    google?: number;
    googleReviews?: number;
  };
};

type AiResponse = {
  items: ApiSuggestion[];
  directions?: { from: string; to: string; mins: number; mode: "walk"|"drive"; path?: [number,number][] }[];
  notes?: string;
};

// --- small helpers for directions fallback ---
const R_KM = 6371;
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const sa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) *
      Math.cos(b.lat * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(sa), Math.sqrt(1 - sa));
  return R_KM * c;
}
function etaMins(mode: "walk" | "drive", km: number) {
  const speedKmh = mode === "walk" ? 5 : 35;
  return Math.max(1, Math.round((km / speedKmh) * 60));
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Build a strict-JSON prompt
function buildPrompt(params: {
  city?: string;
  slot?: string;
  vibe?: string;
  area?: string;
  near?: boolean;
  mode?: "walk" | "drive";
  maxMins?: number;
  lat?: number;
  lng?: number;
  limit?: number;
  q?: string;
}) {
  const {
    city = "",
    slot = "",
    vibe = "",
    area = "",
    near = false,
    mode = "walk",
    maxMins = 15,
    lat,
    lng,
    limit = 10,
    q = "",
  } = params;

  const wantsNear = near && typeof lat === "number" && typeof lng === "number";

  return `
Return ONLY valid JSON. No markdown, no comments.
Schema:
{
  "items": [
    {
      "name": "string",
      "url": "string?",
      "area": "string?",
      "cuisine": "string?",
      "price": "string?",
      "lat": number?,
      "lng": number?,
      "desc": "string?",
      "meta": "string?",
      "ratings": {
        "combined": number?,
        "yelp": number?,
        "yelpReviews": number?,
        "google": number?,
        "googleReviews": number?
      }
    }
  ],
  "notes": "string?"
}

Task:
- City: ${city}
- Slot/category: ${slot || "general"}
- Vibe: ${vibe || "any"}
- Limit: ${limit}
- Area filter: ${area || "none"}
- Near-me: ${wantsNear ? `YES ~${maxMins} minutes by ${mode} from ${lat},${lng}` : "NO"}
- Query hint: ${q || "(none)"}

Rules:
- Prefer currently operating, reputable places/attractions.
- If slot=dinner ensure DINNER-capable; add cuisine & price if known.
- Add a one-line "desc" to help decide; include "url" when possible.
- Coordinates optional; valid JSON only.
`.trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Health check
    if (req.query.health) {
      return res.status(200).json({ ok: true, ts: Date.now() });
    }

    const city = String(req.query.city || "");
    const slot = String(req.query.slot || "");
    const vibe = String(req.query.vibe || "");
    const area = String(req.query.area || "");
    const near = String(req.query.near || "false") === "true";
    const mode = (String(req.query.mode || "walk") === "drive" ? "drive" : "walk") as "walk" | "drive";
    const maxMins = Math.max(5, Math.min(60, parseInt(String(req.query.maxMins || "15"), 10) || 15));
    const lat = req.query.lat != null && String(req.query.lat).length ? Number(req.query.lat) : undefined;
    const lng = req.query.lng != null && String(req.query.lng).length ? Number(req.query.lng) : undefined;
    const limit = Math.max(1, Math.min(20, parseInt(String(req.query.limit || "10"), 10) || 10));
    const withDirections = String(req.query.withDirections || "false") === "true";
    const q = String(req.query.q || "");

    const prompt = buildPrompt({ city, slot, vibe, area, near, mode, maxMins, lat, lng, limit, q });

    // --- Use Chat Completions (JSON mode) instead of Responses API ---
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" }, // <-- supported on chat.completions
      messages: [
        { role: "system", content: "You are a travel data generator that outputs strict, tool-ready JSON only." },
        { role: "user", content: prompt }
      ],
    });

    let parsed: AiResponse = { items: [] };
    try {
      const text = completion.choices?.[0]?.message?.content ?? "";
      parsed = JSON.parse(text || "{}");
      if (!Array.isArray(parsed.items)) parsed.items = [];
    } catch {
      parsed = { items: [] };
    }

    // Optional straight-line directions fallback
    if (withDirections) {
      const items = parsed.items.filter(it => typeof it.lat === "number" && typeof it.lng === "number");
      const directions: NonNullable<AiResponse["directions"]> = [];
      for (let i = 0; i < items.length - 1; i++) {
        const A = items[i], B = items[i + 1];
        if (A.lat == null || A.lng == null || B.lat == null || B.lng == null) continue;
        const km = haversineKm({ lat: A.lat, lng: A.lng }, { lat: B.lat, lng: B.lng });
        const m = km > 1.2 ? "drive" : "walk";
        const mins = etaMins(m, km);
        const path: [number, number][] = [[A.lat, A.lng], [B.lat, B.lng]];
        directions.push({ from: A.name, to: B.name, mins, mode: m, path });
      }
      parsed.directions = directions;
    }

    parsed.items = (parsed.items || []).slice(0, limit);
    return res.status(200).json(parsed);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "server error" });
  }
}
