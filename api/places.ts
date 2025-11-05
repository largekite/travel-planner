// api/places.ts
// Vercel serverless function that proxies to Google Places and
// optionally filters by "near me" using straight-line distance.

import type { VercelRequest, VercelResponse } from "@vercel/node";

// simple speed assumptions
const WALK_KMH = 5;   // ~3 mph
const DRIVE_KMH = 35; // city-ish
const R_EARTH = 6371; // km

const PLACE_TYPE_MAP: Record<string, string> = {
  breakfast: "breakfast",
  lunch: "restaurant",
  dinner: "restaurant",
  coffee: "cafe",
  activity: "tourist_attraction",
  hotel: "lodging",
};

// haversine in km
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R_EARTH * c;
}

function etaMins(mode: "walk" | "drive", km: number) {
  const speed = mode === "walk" ? WALK_KMH : DRIVE_KMH;
  return Math.round((km / speed) * 60);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const {
    city = "St. Louis",
    slot = "activity",
    limit = "10",
    area = "",
    vibe = "",
    q = "",
    near = "false",
    mode = "walk",
    maxMins = "15",
    lat = "",
    lng = "",
  } = req.query as Record<string, string>;

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ items: [], error: "GOOGLE_PLACES_API_KEY missing on server" });
  }

  const placeKind = PLACE_TYPE_MAP[slot] || "restaurant";

  // If UI sent `q`, use it. Otherwise build a clean query for Google.
  const textQuery =
    q && q.trim().length > 0
      ? q
      : `${vibe ? vibe + " " : ""}${placeKind} near ${
          area ? area + ", " : ""
        }${city}`;

  const googleUrl =
    "https://maps.googleapis.com/maps/api/place/textsearch/json" +
    `?query=${encodeURIComponent(textQuery)}` +
    `&key=${apiKey}`;

  try {
    const resp = await fetch(googleUrl);
    const data = await resp.json();

    const raw = (data.results || []).map((p: any) => {
      const price =
        typeof p.price_level === "number"
          ? "$".repeat(p.price_level)
          : undefined;
      const item = {
        name: p.name,
        area: p.formatted_address,
        lat: p.geometry?.location?.lat as number | undefined,
        lng: p.geometry?.location?.lng as number | undefined,
        desc: p.types?.join(", "),
        price,
        ratings: {
          google: p.rating,
          googleReviews: p.user_ratings_total,
        },
        url: "",
      };
      return item;
    });

    // --- NEW: near-me filtering on the server ---
    const wantNear = near === "true";
    const centerLat = lat ? Number(lat) : NaN;
    const centerLng = lng ? Number(lng) : NaN;
    const maxMinutes = Number(maxMins) || 15;
    const travelMode = mode === "drive" ? "drive" : "walk";

    let items = raw;

    if (
      wantNear &&
      !Number.isNaN(centerLat) &&
      !Number.isNaN(centerLng)
    ) {
      // compute distance + minutes for each, drop the far ones
      items = items
        .map((it) => {
          if (it.lat == null || it.lng == null) return null;
          const km = haversineKm(centerLat, centerLng, it.lat, it.lng);
          const mins = etaMins(travelMode, km);
          return { ...it, __mins: mins, meta: `${mins} min ${travelMode}` };
        })
        .filter((it) => it !== null) as Array<
        ReturnType<typeof Object> & { __mins: number }
      >;

      // filter by maxMins
      items = items.filter((it: any) => it.__mins <= maxMinutes);

      // sort closest first
      items.sort((a: any, b: any) => a.__mins - b.__mins);

      // drop helper field, respect limit
      items = items.slice(0, Number(limit)).map((it: any) => {
        const { __mins, ...rest } = it;
        return rest;
      });
    } else {
      // no near-me, just trim to limit
      items = items.slice(0, Number(limit));
    }

    return res.status(200).json({ items });
  } catch (e: any) {
    return res.status(500).json({ items: [], error: e?.message || "fetch failed" });
  }
}
