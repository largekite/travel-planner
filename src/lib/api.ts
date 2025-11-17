// src/lib/api.ts
import { getCached, setCache } from './cache';

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
  // Check for explicit API base first
  if (typeof window !== "undefined") {
    const envBase = (import.meta as any).env?.VITE_API_BASE;
    if (envBase) return envBase;
    
    // Fallback to same origin
    if ((window as any).location) {
      const origin = window.location.origin;
      // If running on Vite dev server (5173), try localhost:3000 for Vercel dev
      if (origin.includes(':5173')) {
        return 'http://localhost:3000';
      }
      return origin;
    }
  }
  return "";
}

export async function fetchAllPlaces(
  apiBase: string,
  params: URLSearchParams,
  maxPages: number = 3,
  signal?: AbortSignal
): Promise<{ items: ApiSuggestion[]; raw: any }> {
  let allItems: ApiSuggestion[] = [];
  let pageToken: string | undefined;
  let page = 1;
  
  while (page <= maxPages) {
    const currentParams = new URLSearchParams(params);
    currentParams.set('page', page.toString());
    if (pageToken) {
      currentParams.set('pageToken', pageToken);
    }
    
    const result = await fetchPlaces(apiBase, currentParams, signal);
    allItems = allItems.concat(result.items);
    
    if (!result.hasMore || !result.nextPageToken) break;
    
    pageToken = result.nextPageToken;
    page++;
    
    // Small delay to respect API rate limits
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  return { items: allItems, raw: {} };
}

export async function fetchPlaces(
  apiBase: string,
  params: URLSearchParams,
  signal?: AbortSignal
): Promise<{ items: ApiSuggestion[]; raw: any; hasMore?: boolean; nextPageToken?: string }> {
  const base = apiBase.replace(/\/$/, "");
  const url = `${base}/api/places?${params.toString()}`;
  
  // Check cache first
  const cacheKey = url;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  const res = await fetch(url, { signal });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0, 200)}`);
  }
  
  let data;
  try {
    const text = await res.text();
    if (!text.trim().startsWith('{') && !text.trim().startsWith('[')) {
      throw new Error(`Expected JSON but got: ${text.slice(0, 200)}`);
    }
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON response: ${e}`);
  }

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

  const result = { 
    items, 
    raw: data, 
    hasMore: data.hasMore,
    nextPageToken: data.nextPageToken
  };
  
  // Cache the result
  setCache(cacheKey, result);
  
  return result;
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
  
  let data;
  try {
    data = await res.json();
  } catch (e) {
    console.error('JSON parse error in fetchDayNotes:', e);
    return null;
  }
  
  return data.notes || null;
}

export type DirectionsSegment = {
  from: string;
  to: string;
  mins: number;
  mode: "walk" | "drive";
  path: [number, number][];
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
  
  let data;
  try {
    data = await res.json();
  } catch (e) {
    console.error('JSON parse error in fetchDirections:', e);
    return [];
  }
  
  return Array.isArray(data.directions) ? data.directions : [];
}
