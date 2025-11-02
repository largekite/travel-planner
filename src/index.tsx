import React, { useEffect, useMemo, useState } from "react";
import { Heart, Users, Mountain, Plus, X, Trash2, Calendar, Car, Footprints, Printer, Wand2, Hotel, Search, Crosshair, Wifi } from "lucide-react";

/****************************************************
 * Largekite - Trip Planner (API-only)
 *
 * NEW in this revision:
 * 1) **API status pill** (top bar): pings `/api/ai` periodically and shows
 *    reachability + last latency.
 * 2) **Use my location** button in Hotel/Area section: asks for browser
 *    geolocation and sets your center to that coordinate (no static data).
 *
 * Everything remains API-driven. Inline comments explain the trickier parts.
 ****************************************************/

// Resolve API base from env or a global injected script. If not set, the UI shows an "API not configured" status.
const API_BASE: string | undefined = (
  typeof window !== "undefined" && (window as any).__API_BASE__
) || (typeof process !== "undefined" ? (process as any).env?.NEXT_PUBLIC_API_BASE : undefined)
  || (import.meta as any)?.env?.VITE_API_BASE || undefined;

// ---------------------------------
// Types & constants
// ---------------------------------
const VIBES = ["romantic", "family", "adventurous"] as const;
type Vibe = (typeof VIBES)[number];

type SelectedItem = {
  name: string;
  url?: string;
  area?: string;
  cuisine?: string;
  price?: string;
  lat?: number;
  lng?: number;
  desc?: string;
  meta?: string; // optional distance summary from API (near-me)
};

type DayPlan = {
  activity?: SelectedItem;
  breakfast?: SelectedItem;
  lunch?: SelectedItem;
  dinner?: SelectedItem;
  coffee?: SelectedItem;
  notes?: string;
};

// SlotKey includes a special "hotel" slot so we can reuse the same chooser modal to select a hotel/center from the API
type SlotKey = keyof Pick<DayPlan, "activity"|"breakfast"|"lunch"|"dinner"|"coffee"> | "hotel";

type ApiSuggestion = {
  name: string;
  url?: string;
  area?: string;
  cuisine?: string;
  price?: string;
  lat?: number;
  lng?: number;
  desc?: string; // description text (server may send `description`; we normalize to `desc` client-side)
  meta?: string; // distance/ETA summary when near-me filter is on
  ratings?: {
    combined?: number; // aggregated rating 0..5
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

type ApiDirectionsSegment = { path: [number, number][]; mins: number; mode: "walk"|"drive"; from: string; to: string };

// ---------------------------------
// Heuristics for detail suggestions (pure UI text)
// ---------------------------------
const VIBE_MEAL_TIPS: Record<Vibe, string> = {
  romantic: "ask for patio or booth; share a starter; golden-hour timing",
  family: "kid-friendly picks; split plates; build in breaks",
  adventurous: "chef specials; off-menu if offered; try something new",
};

const VIBE_ACTIVITY_TIPS: Record<Vibe, string> = {
  romantic: "look for scenic spots and quieter corners",
  family: "plan snack and restroom breaks; interactive exhibits",
  adventurous: "add an extra loop; arrive early for first slots",
};

// Simple dish fallbacks based just on the venue name string.
function genericDishFallback(name: string): string[] {
  const n = name.toLowerCase();
  if (n.includes("bbq")) return ["Ribs", "Pulled pork", "Baked beans"];
  if (n.includes("coffee")) return ["House espresso", "Pour-over", "Seasonal pastry"];
  if (n.includes("brasserie") || n.includes("bistro")) return ["Onion soup", "Steak frites", "Creme brulee"];
  if (n.includes("pizza") || n.includes("pizzeria")) return ["Margherita", "Pepperoni", "Seasonal veg pie"];
  if (n.includes("brew")) return ["House flight", "IPA", "Soft pretzel"];
  return ["Chef special", "Local favorite", "Seasonal dish"];
}

// Build a friendly text block for the "Suggest details" modal.
function buildDetailText(d: DayPlan | undefined, vibe: Vibe): string {
  const parts: string[] = [];
  const mealLine = (label: string, item?: SelectedItem) => {
    if (!item?.name) return;
    const dish = genericDishFallback(item.name).slice(0, 2);
    parts.push(`- ${label}: ${item.name} -> try ${dish.join(', ')} — ${VIBE_MEAL_TIPS[vibe]}`);
  };
  mealLine('Breakfast', d?.breakfast);
  if (d?.activity?.name) parts.push(`- Activity: ${d.activity.name} — ${VIBE_ACTIVITY_TIPS[vibe]}`);
  mealLine('Lunch', d?.lunch); mealLine('Coffee', d?.coffee); mealLine('Dinner', d?.dinner);
  return parts.length ? parts.join('\n') : 'No selections yet for this day.';
}

// ---------------------------------
// Geometry helpers for the minimalist map (SVG grid projection)
// ---------------------------------
const STL_BOUNDS = { minLat: 38.45, maxLat: 38.80, minLng: -90.75, maxLng: -90.05 };
function project(lat?: number, lng?: number) {
  if (lat == null || lng == null) return { x: -999, y: -999, hidden: true };
  const { minLat, maxLat, minLng, maxLng } = STL_BOUNDS;
  const nx = (lng - minLng) / (maxLng - minLng); const ny = 1 - (lat - minLat) / (maxLat - minLat);
  return { x: 6 + nx * 88, y: 6 + ny * 88, hidden: nx < 0 || nx > 1 || ny < 0 || ny > 1 };
}

function haversineKm(a: {lat:number,lng:number}, b: {lat:number,lng:number}) {
  const R = 6371; const dLat = (b.lat - a.lat) * Math.PI/180; const dLng = (b.lng - a.lng) * Math.PI/180;
  const sa = Math.sin(dLat/2) ** 2 + Math.cos(a.lat*Math.PI/180) * Math.cos(b.lat*Math.PI/180) * Math.sin(dLng/2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(sa), Math.sqrt(1-sa)); return R * c;
}
function etaMins(mode: "walk"|"drive", km: number) { const speedKmh = mode === "walk" ? 5 : 35; return Math.round((km / speedKmh) * 60); }

function toSvgPath(path: [number, number][]): string {
  const pts = path.map(([lat,lng]) => project(lat, lng));
  const vis = pts.filter(p=>!p.hidden);
  if (vis.length === 0) return '';
  return 'M ' + vis.map((p,i)=> `${i===0? '': 'L '}${p.x} ${p.y}`).join(' ');
}

// ---------------------------------
// Small UI building blocks
// ---------------------------------
function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-[min(900px,96vw)] max-h-[86vh] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-semibold">{title}</div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100"><X className="w-5 h-5"/></button>
        </div>
        <div className="overflow-auto p-4">{children}</div>
      </div>
    </div>
  );
}

function SuggestionList({ items, onChoose, loading, error, usingApi }: { items: ApiSuggestion[]; onChoose: (item: ApiSuggestion) => void; loading?: boolean; error?: string | null; usingApi?: boolean; }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2 text-xs">
        <div className="text-slate-500">{usingApi ? 'Live data (AI)' : 'API not configured'}{loading ? ' · loading...' : ''}</div>
        {error && <div className="text-amber-700">{error}</div>}
      </div>
      <div className="divide-y">
        {items.map((it, idx) => (
          <div key={`${it.name}-${idx}`} className="py-3 flex items-start justify-between gap-3">
            <div>
              {it.url ? (
                <a href={it.url} target="_blank" rel="noreferrer" className="font-medium text-blue-700 hover:underline">{idx+1}. {it.name}</a>
              ) : (
                <span className="font-medium">{idx+1}. {it.name}</span>
              )}
              <div className="text-xs text-slate-500">{[it.cuisine, it.price, it.area].filter(Boolean).join(" · ")}</div>
              {(it.desc) && <div className="text-xs text-slate-600 mt-0.5">{it.desc}</div>}
              <div className="text-[11px] text-slate-600 mt-0.5">
                {it.ratings?.combined != null ? <>★ {Number(it.ratings.combined).toFixed(1)} agg</> : null}
                {it.ratings?.yelp != null ? <> · Yelp {Number(it.ratings.yelp).toFixed(1)}</> : null}
                {it.ratings?.google != null ? <> · Google {Number(it.ratings.google).toFixed(1)}</> : null}
                {(typeof it.ratings?.yelpReviews==='number' || typeof it.ratings?.googleReviews==='number') ? (
                  <> · {((it.ratings?.yelpReviews||0)+(it.ratings?.googleReviews||0)).toLocaleString()} reviews</>
                ) : null}
              </div>
              {it.meta and <div className="text-[11px] text-slate-500 mt-0.5">{it.meta}</div>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => onChoose(it)} className="px-3 py-1.5 rounded-lg border bg-indigo-50 hover:bg-indigo-100">Use</button>
            </div>
          </div>
        ))}
        {!loading and items.length === 0 and (
          <div className="py-8 text-center text-sm text-slate-500">No matches. Try changing vibe, area, or near-me filter.</div>
        )}
      </div>
    </div>
  );
}

function SlotButton({ label, value, onClick }: { label: string; value?: SelectedItem; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left px-3 py-2 rounded-lg border hover:border-indigo-300 hover:bg-indigo-50/40">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="font-medium text-slate-800 truncate flex items-center gap-2">{!value?.name ? (<><Plus className="w-4 h-4"/> Choose</>) : value.name}</div>
    </button>
  );
}

function DaysStrip({ daysCount, currentDay, setCurrentDay }: { daysCount: number; currentDay: number; setCurrentDay: (d:number)=>void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({length: daysCount}, (_,i)=>i+1).map((d) => (
        <button key={d} onClick={()=>setCurrentDay(d)} className={`px-3 py-1.5 rounded-lg border text-sm ${currentDay===d?"bg-indigo-600 text-white border-indigo-600":"bg-white"}`} aria-pressed={currentDay===d}>Day {d}</button>
      ))}
    </div>
  );
}

// ---------------------------------
// Main component
// ---------------------------------
export default function PlannerRedesign() {
  // Trip-wide inputs
  const [country, setCountry] = useState<string>("USA");
  const [city, setCity] = useState<string>("St. Louis");
  const [vibe, setVibe] = useState<Vibe>("romantic");
  const [daysCount, setDaysCount] = useState<number>(3);
  const [currentDay, setCurrentDay] = useState<number>(1);
  const [plan, setPlan] = useState<DayPlan[]>(() => Array.from({ length: 3 }, () => ({}) ));

  // Hotel/center selection (API-only)
  const [hotel, setHotel] = useState<SelectedItem | null>(null);
  // Inline hotel search (autocomplete via /api/ai?slot=hotel)
  const [hotelQuery, setHotelQuery] = useState<string>("");
  const [hotelSugs, setHotelSugs] = useState<ApiSuggestion[]>([]);
  const [hotelLoading, setHotelLoading] = useState<boolean>(false);
  const [hotelError, setHotelError] = useState<string | null>(null);

  // Suggestion modal state for other slots
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [slotKey, setSlotKey] = useState<SlotKey>("activity");
  const [areaFilter, setAreaFilter] = useState<string>(""); // free-text neighborhood/county filter
  const [nearMode, setNearMode] = useState<"walk"|"drive">("walk");
  const [nearMaxMins, setNearMaxMins] = useState<number>(15);
  const [useNearFilter, setUseNearFilter] = useState<boolean>(false);

  // Detail modal state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailDay, setDetailDay] = useState<number>(1);
  const [detailText, setDetailText] = useState<string>("");

  // Live suggestions (API)
  const [liveItems, setLiveItems] = useState<ApiSuggestion[]>([]);
  const [liveLoading, setLiveLoading] = useState<boolean>(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const usingApi = Boolean(API_BASE);

  // Directions
  const [dirSegs, setDirSegs] = useState<ApiDirectionsSegment[] | null>(null);
  const [dirErr, setDirErr] = useState<string | null>(null);

  // API status pill state
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [apiLatency, setApiLatency] = useState<number | null>(null);
  const [apiMsg, setApiMsg] = useState<string | null>(null);

  // Auto-resize days array when the user changes the count
  useEffect(() => {
    setPlan((prev) => {
      const copy = [...prev];
      if (daysCount > copy.length) return copy.concat(Array.from({ length: daysCount - copy.length }, () => ({}) as DayPlan));
      if (daysCount < copy.length) return copy.slice(0, daysCount);
      return copy;
    });
    setCurrentDay((d) => Math.max(1, Math.min(daysCount, d)));
  }, [daysCount]);

  // Helpers to set slots
  function setSlot(dayIndex1Based: number, key: SlotKey, value?: SelectedItem) {
    if (key === 'hotel') { setHotel(value || null); return; }
    setPlan((prev) => {
      const next = prev.map(d => ({ ...d }));
      const i = Math.max(0, Math.min(prev.length - 1, dayIndex1Based - 1));
      if (!value) delete (next[i] as any)[key]; else (next[i] as any)[key] = value;
      return next;
    });
  }
  function openSlot(slot: SlotKey) { setSlotKey(slot); setSlotModalOpen(true); }
  function chooseForSlot(item: ApiSuggestion) {
    const sel: SelectedItem = { name: item.name, url: item.url, area: item.area, cuisine: item.cuisine, price: item.price, lat: item.lat, lng: item.lng, desc: item.desc, meta: item.meta };
    if (slotKey === 'hotel') setHotel(sel); else setSlot(currentDay, slotKey, sel);
    setSlotModalOpen(false);
  }
  function clearDay(dayIndex1Based: number) { (['activity','breakfast','lunch','coffee','dinner','notes'] as (keyof DayPlan)[]).forEach(k => setSlot(dayIndex1Based, k as SlotKey, undefined)); }

  // Current day's selected items in a canonical order (for map & routing)
  const cur = plan[currentDay-1] || {};
  const sequence: (keyof DayPlan)[] = ['breakfast','activity','lunch','coffee','dinner'];
  const chosenItems = sequence.map(k => cur[k]).filter(Boolean) as SelectedItem[];

  // Straight-line fallback segments when directions are unavailable
  const straightSegments = useMemo(() => {
    const segs: { a: SelectedItem, b: SelectedItem, km: number, mode: "walk"|"drive", mins: number }[] = [];
    for (let i=0;i<chosenItems.length-1;i++) {
      const A = chosenItems[i]!; const B = chosenItems[i+1]!;
      if (!A.lat || !A.lng || !B.lat || !B.lng) continue;
      const km = haversineKm({lat:A.lat,lng:A.lng},{lat:B.lat,lng:B.lng});
      const mode = km > 1.2 ? 'drive' : 'walk';
      const mins = etaMins(mode, km);
      segs.push({ a: A, b: B, km, mode, mins });
    }
    return segs;
  }, [chosenItems.map(c=>c.name).join('|')]);

  // Inline hotel autocomplete
  useEffect(() => {
    if (!usingApi) { setHotelSugs([]); setHotelLoading(false); setHotelError('API base not configured'); return; }
    const q = hotelQuery.trim();
    const ctrl = new AbortController();
    if (q.length < 2) { setHotelSugs([]); setHotelLoading(false); setHotelError(null); return; }
    const handle = setTimeout(() => {
      const params = new URLSearchParams({ q: `hotel search ${q} in ${city}`, city, slot: 'hotel', limit: '8' });
      setHotelLoading(True); setHotelError(null);
      fetch(`${API_BASE}/api/ai?${params.toString()}`, { signal: ctrl.signal })
        .then(async (r)=>{ if(!r.ok) throw new Error(`HTTP ${r.status}`); const data: AiResponse = await r.json(); setHotelSugs(data.items||[]); })
        .catch((err)=>{ if ((err as any).name !== 'AbortError') setHotelError(String((err as any).message||err)); })
        .finally(()=> setHotelLoading(False));
    }, 300);
    return () => { clearTimeout(handle); ctrl.abort(); };
  }, [hotelQuery, city, usingApi]);

  // Suggestions
  useEffect(() => {
    if (!slotModalOpen) return;
    if (!usingApi) { setLiveItems([]); setLiveLoading(false); setLiveError('API base not configured'); return; }
    const ctrl = new AbortController();
    const noun = slotKey === 'hotel' ? 'hotels or areas' : `${slotKey} places`;
    const q = `Suggest top ${noun} in ${city} for a ${vibe} vibe` +
      (useNearFilter and hotel?.lat and hotel?.lng ? ` near ${hotel.lat},${hotel.lng} within ${nearMaxMins} minutes by ${nearMode}` : '') +
      (areaFilter ? ` around ${areaFilter}` : '');

    const params = new URLSearchParams({
      q, city, vibe,
      **(slotKey !== 'hotel' ? { slot: String(slotKey) } : { slot: 'hotel' }),
      near: String(useNearFilter), mode: nearMode,
      maxMins: String(nearMaxMins),
      lat: hotel?.lat != null ? String(hotel.lat) : '',
      lng: hotel?.lng != null ? String(hotel.lng) : '',
      limit: '10',
      area: areaFilter || ''
    });

    setLiveLoading(true); setLiveError(null);
    fetch(`${API_BASE}/api/ai?${params.toString()}`, { signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: AiResponse = await r.json();
        const items = (Array.isArray(data.items) ? data.items : []).map((it: any): ApiSuggestion => ({
          name: it.name,
          url: it.url,
          area: it.area,
          cuisine: it.cuisine,
          price: it.price,
          lat: it.lat,
          lng: it.lng,
          desc: it.desc ?? it.description ?? undefined,
          meta: it.meta,
          ratings: it.ratings || undefined
        }));
        setLiveItems(items);
      })
      .catch((err) => { if ((err as any).name !== 'AbortError') setLiveError(String((err as any).message||err)); })
      .finally(() => setLiveLoading(false));
    return () => ctrl.abort();
  }, [slotModalOpen, city, vibe, slotKey, useNearFilter, nearMode, nearMaxMins, hotel?.lat, hotel?.lng, areaFilter, usingApi]);

  function handlePrint() { window.print(); }
  return <div />;
}
