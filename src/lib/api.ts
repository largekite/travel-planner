import { ApiSuggestion, DirectionsSegment, SelectedItem, DayPlan, Vibe } from "./types";

export function detectApiBase(): string {
  if (typeof window !== "undefined" && (window as any).__API_BASE__) {
    return (window as any).__API_BASE__;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}`;
  }
  return "";
}

export async function fetchPlaces(
  apiBase: string,
  params: URLSearchParams,
  signal?: AbortSignal
): Promise<ApiSuggestion[]> {
  const res = await fetch(`${apiBase}/api/places?${params.toString()}`, {
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];
  return items.map((it: any): ApiSuggestion => ({
    name: it.name,
    url: it.url,
    area: it.area,
    cuisine: it.cuisine,
    price: it.price,
    lat: it.lat,
    lng: it.lng,
    desc: it.desc ?? it.description ?? undefined,
    meta: it.meta,
    ratings: it.ratings || undefined,
  }));
}

export async function fetchDayNotes(
  apiBase: string,
  day: number,
  city: string,
  vibe: Vibe,
  dayData: DayPlan
): Promise<string | null> {
  const res = await fetch(`${apiBase}/api/ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "day-notes",
      day,
      city,
      vibe,
      selections: {
        activity: dayData.activity,
        breakfast: dayData.breakfast,
        lunch: dayData.lunch,
        dinner: dayData.dinner,
        coffee: dayData.coffee,
      },
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.notes || null;
}

export async function fetchDirections(
  apiBase: string,
  city: string,
  places: SelectedItem[]
): Promise<DirectionsSegment[]> {
  const coordsStr = places
    .map((p) => `${p.lat},${p.lng},${p.name}`)
    .join(";");
  const params = new URLSearchParams({
    q: `directions please for coords=${coordsStr}`,
    city,
    withDirections: "true",
  });
  const res = await fetch(`${apiBase}/api/ai?${params.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const dirs = Array.isArray(data.directions) ? data.directions : [];
  return dirs.map(
    (d: any): DirectionsSegment => ({
      path: d.path || [],
      mins: d.mins,
      mode: d.mode,
      from: d.from,
      to: d.to,
    })
  );
}
