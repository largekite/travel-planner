// src/lib/api.ts
export type ApiSuggestion = {
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
    google?: number;
    googleReviews?: number;
  };
};

export function detectApiBase(): string {
  if (typeof window !== "undefined" && (window as any).location) {
    return window.location.origin;
  }
  return "";
}

export async function fetchPlaces(
  apiBase: string,
  params: URLSearchParams,
  signal?: AbortSignal
): Promise<{ items: ApiSuggestion[]; raw: any }> {
  const base = apiBase.replace(/\/$/, "");
  const url = `${base}/api/places?${params.toString()}`;

  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  const data = await res.json();

  // normalize: accept {items:[]}, {results:[]}, or a bare array
  const rawItems: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.results)
    ? data.results
    : [];

  const items: ApiSuggestion[] = rawItems.map((p: any) => ({
    name: p.name,
    url: p.url || p.website,
    area: p.area || p.vicinity || p.formatted_address,
    cuisine: p.cuisine,
    price: p.price,
    lat: typeof p.lat === "number" ? p.lat : p.geometry?.location?.lat,
    lng: typeof p.lng === "number" ? p.lng : p.geometry?.location?.lng,
    desc: p.desc || p.description,
    meta: p.meta,
    ratings: p.ratings
      ? p.ratings
      : p.rating
      ? { google: p.rating, googleReviews: p.user_ratings_total }
      : undefined,
  }));

  return { items, raw: data };
}

export async function fetchDayNotes(
  apiBase: string,
  day: number,
  city: string,
  vibe: string,
  selections: Record<string, any>
): Promise<string | null> {
  const base = apiBase.replace(/\/$/, "");
  const res = await fetch(`${base}/api/ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "day-notes",
      day,
      city,
      vibe,
      selections,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.notes || null;
}

export type DirectionsSegment = {
  from: string;
  to: string;
  mins: number;
  mode: "walk" | "drive";
  path?: [number, number][];
};

export async function fetchDirections(
  apiBase: string,
  city: string,
  items: { name: string; lat?: number; lng?: number }[]
): Promise<DirectionsSegment[]> {
  const base = apiBase.replace(/\/$/, "");
  const coordsStr = items
    .map((p) => `${p.lat},${p.lng},${p.name}`)
    .join(";");
  const url = `${base}/api/ai?withDirections=true&city=${encodeURIComponent(
    city
  )}&coords=${encodeURIComponent(coordsStr)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.directions) ? data.directions : [];
}
