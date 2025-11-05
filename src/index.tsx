import React, { useEffect, useMemo, useState } from "react";
import {
  Heart,
  Users,
  Mountain,
  Plus,
  X,
  Trash2,
  Calendar,
  Car,
  Footprints,
  Printer,
  Wand2,
  Hotel,
  Search,
  Crosshair,
  Wifi,
} from "lucide-react";

/****************************************************
 * Largekite - Trip Planner (Google Places + optional OpenAI)
 * Fixes in this version:
 * 1. Modal/suggestion popups now have visible scrollbars.
 * 2. "Use my current location" shows proper error and actually sets hotel.
 * 3. Map pins now use comma-style HSL (works across browsers).
 ****************************************************/

// Same-origin API base
const API_BASE: string =
  (typeof window !== "undefined" && (window as any).__API_BASE__) ||
  (typeof window !== "undefined" ? window.location.origin : "");

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
  meta?: string;
};

type DayPlan = {
  activity?: SelectedItem;
  breakfast?: SelectedItem;
  lunch?: SelectedItem;
  dinner?: SelectedItem;
  coffee?: SelectedItem;
  notes?: string;
};

type SlotKey = keyof Pick<
  DayPlan,
  "activity" | "breakfast" | "lunch" | "dinner" | "coffee"
> | "hotel";

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
  directions?: {
    from: string;
    to: string;
    mins: number;
    mode: "walk" | "drive";
    path?: [number, number][];
  }[];
  notes?: string;
};

type ApiDirectionsSegment = {
  path: [number, number][];
  mins: number;
  mode: "walk" | "drive";
  from: string;
  to: string;
};

// ---------------------------------
// Vibe tips
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

// ---------------------------------
// Detail text builder (UI-side fallback)
// ---------------------------------
function genericDishFallback(name: string): string[] {
  const n = name.toLowerCase();
  if (n.includes("bbq")) return ["Ribs", "Pulled pork", "Baked beans"];
  if (n.includes("coffee"))
    return ["House espresso", "Pour-over", "Seasonal pastry"];
  if (n.includes("brasserie") || n.includes("bistro"))
    return ["Onion soup", "Steak frites", "Creme brulee"];
  if (n.includes("pizza") || n.includes("pizzeria"))
    return ["Margherita", "Pepperoni", "Seasonal veg pie"];
  if (n.includes("brew")) return ["House flight", "IPA", "Soft pretzel"];
  return ["Chef special", "Local favorite", "Seasonal dish"];
}

function buildDetailText(d: DayPlan | undefined, vibe: Vibe): string {
  const parts: string[] = [];
  const mealLine = (label: string, item?: SelectedItem) => {
    if (!item?.name) return;
    const dish = genericDishFallback(item.name).slice(0, 2);
    parts.push(
      `- ${label}: ${item.name} -> try ${dish.join(
        ", "
      )} — ${VIBE_MEAL_TIPS[vibe]}`
    );
  };
  mealLine("Breakfast", d?.breakfast);
  if (d?.activity?.name)
    parts.push(`- Activity: ${d.activity.name} — ${VIBE_ACTIVITY_TIPS[vibe]}`);
  mealLine("Lunch", d?.lunch);
  mealLine("Coffee", d?.coffee);
  mealLine("Dinner", d?.dinner);
  return parts.length ? parts.join("\n") : "No selections yet for this day.";
}

// ---------------------------------
// Map helpers
// ---------------------------------
const STL_BOUNDS = {
  minLat: 38.45,
  maxLat: 38.8,
  minLng: -90.75,
  maxLng: -90.05,
};
function project(lat?: number, lng?: number) {
  if (lat == null || lng == null)
    return { x: -999, y: -999, hidden: true };
  const { minLat, maxLat, minLng, maxLng } = STL_BOUNDS;
  const nx = (lng - minLng) / (maxLng - minLng);
  const ny = 1 - (lat - minLat) / (maxLat - minLat);
  return {
    x: 6 + nx * 88,
    y: 6 + ny * 88,
    hidden: nx < 0 || nx > 1 || ny < 0 || ny > 1,
  };
}
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(sa), Math.sqrt(1 - sa));
  return R * c;
}
function etaMins(mode: "walk" | "drive", km: number) {
  const speedKmh = mode === "walk" ? 5 : 35;
  return Math.round((km / speedKmh) * 60);
}
function toSvgPath(path: [number, number][]): string {
  const pts = path.map(([lat, lng]) => project(lat, lng));
  const vis = pts.filter((p) => !p.hidden);
  if (vis.length === 0) return "";
  return (
    "M " +
    vis
      .map((p, i) => `${i === 0 ? "" : "L "}${p.x} ${p.y}`)
      .join(" ")
  );
}

// ---------------------------------
// Small UI components
// ---------------------------------
function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-[min(900px,96vw)] max-h-[86vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <div className="font-semibold">{title}</div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* 👇 scrollable area */}
        <div className="overflow-y-auto p-4 grow">{children}</div>
      </div>
    </div>
  );
}

function SuggestionList({
  items,
  onChoose,
  loading,
  error,
  usingApi,
}: {
  items: ApiSuggestion[];
  onChoose: (item: ApiSuggestion) => void;
  loading?: boolean;
  error?: string | null;
  usingApi?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2 text-xs">
        <div className="text-slate-500">
          {usingApi ? "Live data (Places)" : "API not configured"}
          {loading ? " · loading..." : ""}
        </div>
        {error && <div className="text-amber-700">{error}</div>}
      </div>
      {/* 👇 make list scrollable */}
      <div className="divide-y max-h-96 overflow-y-auto pr-1">
        {items.map((it, idx) => (
          <div
            key={`${it.name}-${idx}`}
            className="py-3 flex items-start justify-between gap-3"
          >
            <div>
              {it.url ? (
                <a
                  href={it.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-blue-700 hover:underline"
                >
                  {idx + 1}. {it.name}
                </a>
              ) : (
                <span className="font-medium">
                  {idx + 1}. {it.name}
                </span>
              )}
              <div className="text-xs text-slate-500">
                {[it.cuisine, it.price, it.area].filter(Boolean).join(" · ")}
              </div>
              {it.desc && (
                <div className="text-xs text-slate-600 mt-0.5">
                  {it.desc}
                </div>
              )}
              <div className="text-[11px] text-slate-600 mt-0.5">
                {it.ratings?.google != null ? (
                  <>Google {Number(it.ratings.google).toFixed(1)}</>
                ) : null}
                {it.ratings?.googleReviews ? (
                  <> · {it.ratings.googleReviews} reviews</>
                ) : null}
              </div>
              {it.meta && (
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {it.meta}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onChoose(it)}
                className="px-3 py-1.5 rounded-lg border bg-indigo-50 hover:bg-indigo-100"
              >
                Use
              </button>
            </div>
          </div>
        ))}
        {!loading && items.length === 0 && (
          <div className="py-8 text-center text-sm text-slate-500">
            No matches. Try changing vibe, area, or near-me filter.
          </div>
        )}
      </div>
    </div>
  );
}

function SlotButton({
  label,
  value,
  onClick,
}: {
  label: string;
  value?: SelectedItem;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 rounded-lg border hover:border-indigo-300 hover:bg-indigo-50/40"
    >
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="font-medium text-slate-800 truncate flex items-center gap-2">
        {!value?.name ? (
          <>
            <Plus className="w-4 h-4" /> Choose
          </>
        ) : (
          value.name
        )}
      </div>
    </button>
  );
}

function DaysStrip({
  daysCount,
  currentDay,
  setCurrentDay,
}: {
  daysCount: number;
  currentDay: number;
  setCurrentDay: (d: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: daysCount }, (_, i) => i + 1).map((d) => (
        <button
          key={d}
          onClick={() => setCurrentDay(d)}
          className={`px-3 py-1.5 rounded-lg border text-sm ${
            currentDay === d
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white"
          }`}
          aria-pressed={currentDay === d}
        >
          Day {d}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------
// Main component
// ---------------------------------
export default function PlannerRedesign() {
  const [country, setCountry] = useState<string>("USA");
  const [city, setCity] = useState<string>("St. Louis");
  const [vibe, setVibe] = useState<Vibe>("romantic");
  const [daysCount, setDaysCount] = useState<number>(3);
  const [currentDay, setCurrentDay] = useState<number>(1);
  const [plan, setPlan] = useState<DayPlan[]>(
    () => Array.from({ length: 3 }, () => ({}))
  );

  // hotel / area
  const [hotel, setHotel] = useState<SelectedItem | null>(null);
  const [hotelQuery, setHotelQuery] = useState<string>("");
  const [hotelSugs, setHotelSugs] = useState<ApiSuggestion[]>([]);
  const [hotelLoading, setHotelLoading] = useState<boolean>(false);
  const [hotelError, setHotelError] = useState<string | null>(null);

  // suggestion modal
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [slotKey, setSlotKey] = useState<SlotKey>("activity");
  const [areaFilter, setAreaFilter] = useState<string>("");
  const [nearMode, setNearMode] = useState<"walk" | "drive">("walk");
  const [nearMaxMins, setNearMaxMins] = useState<number>(15);
  const [useNearFilter, setUseNearFilter] = useState<boolean>(false);

  // detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailDay, setDetailDay] = useState<number>(1);
  const [detailText, setDetailText] = useState<string>("");

  // live suggestions
  const [liveItems, setLiveItems] = useState<ApiSuggestion[]>([]);
  const [liveLoading, setLiveLoading] = useState<boolean>(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  // debug
  const [lastFetchUrl, setLastFetchUrl] = useState<string>("");
  const [lastResultCount, setLastResultCount] = useState<number>(0);

  // map
  const [dirSegs, setDirSegs] = useState<ApiDirectionsSegment[] | null>(null);
  const [dirErr, setDirErr] = useState<string | null>(null);

  // api status
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [apiLatency, setApiLatency] = useState<number | null>(null);
  const [apiMsg, setApiMsg] = useState<string | null>(null);

  // resize plan when days change
  useEffect(() => {
    setPlan((prev) => {
      const copy = [...prev];
      if (daysCount > copy.length)
        return copy.concat(
          Array.from({ length: daysCount - copy.length }, () => ({}))
        );
      if (daysCount < copy.length) return copy.slice(0, daysCount);
      return copy;
    });
    setCurrentDay((d) => Math.max(1, Math.min(daysCount, d)));
  }, [daysCount]);

  function setSlot(dayIndex1Based: number, key: SlotKey, value?: SelectedItem) {
    if (key === "hotel") {
      setHotel(value || null);
      return;
    }
    setPlan((prev) => {
      const next = prev.map((d) => ({ ...d }));
      const i = Math.max(0, Math.min(prev.length - 1, dayIndex1Based - 1));
      if (!value) delete (next[i] as any)[key];
      else (next[i] as any)[key] = value;
      return next;
    });
  }

  function openSlot(slot: SlotKey) {
    setSlotKey(slot);
    setSlotModalOpen(true);
  }

  function chooseForSlot(item: ApiSuggestion) {
    const sel: SelectedItem = {
      name: item.name,
      url: item.url,
      area: item.area,
      cuisine: item.cuisine,
      price: item.price,
      lat: item.lat,
      lng: item.lng,
      desc: item.desc,
      meta: item.meta,
    };
    if (slotKey === "hotel") setHotel(sel);
    else setSlot(currentDay, slotKey, sel);
    setSlotModalOpen(false);
  }

  function clearDay(dayIndex1Based: number) {
    (["activity", "breakfast", "lunch", "coffee", "dinner", "notes"] as (
      | keyof DayPlan
      | "notes"
    )[]).forEach((k) => setSlot(dayIndex1Based, k as SlotKey, undefined));
  }

  const cur = plan[currentDay - 1] || {};
  const sequence: (keyof DayPlan)[] = [
    "breakfast",
    "activity",
    "lunch",
    "coffee",
    "dinner",
  ];
  const chosenItems = sequence
    .map((k) => cur[k])
    .filter(Boolean) as SelectedItem[];

  const straightSegments = useMemo(() => {
    const segs: {
      a: SelectedItem;
      b: SelectedItem;
      km: number;
      mode: "walk" | "drive";
      mins: number;
    }[] = [];
    for (let i = 0; i < chosenItems.length - 1; i++) {
      const A = chosenItems[i]!;
      const B = chosenItems[i + 1]!;
      if (!A.lat || !A.lng || !B.lat || !B.lng) continue;
      const km = haversineKm(
        { lat: A.lat, lng: A.lng },
        { lat: B.lat, lng: B.lng }
      );
      const mode = km > 1.2 ? "drive" : "walk";
      const mins = etaMins(mode, km);
      segs.push({ a: A, b: B, km, mode, mins });
    }
    return segs;
  }, [chosenItems.map((c) => c.name).join("|")]);

  // hotel inline search
  useEffect(() => {
    const q = hotelQuery.trim();
    const ctrl = new AbortController();
    if (q.length < 2) {
      setHotelSugs([]);
      setHotelLoading(false);
      setHotelError(null);
      return;
    }

    const params = new URLSearchParams({
      q: `hotel search ${q} in ${city}`,
      city,
      slot: "hotel",
      limit: "8",
    });

    setHotelLoading(true);
    setHotelError(null);

    fetch(`${API_BASE}/api/places?${params.toString()}`, {
      signal: ctrl.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as AiResponse;
        setHotelSugs(data.items || []);
      })
      .catch((err) => {
        if ((err as any).name !== "AbortError")
          setHotelError(String((err as any).message || err));
      })
      .finally(() => setHotelLoading(false));

    return () => ctrl.abort();
  }, [hotelQuery, city]);

  // suggestions for slots
  useEffect(() => {
    if (!slotModalOpen) return;
    const ctrl = new AbortController();

    const noun =
      slotKey === "hotel" ? "hotels or areas" : `${slotKey} places`;
    const q =
      `Suggest top ${noun} in ${city} for a ${vibe} vibe` +
      (useNearFilter && hotel?.lat && hotel?.lng
        ? ` near ${hotel.lat},${hotel.lng} within ${nearMaxMins} minutes by ${nearMode}`
        : "") +
      (areaFilter ? ` around ${areaFilter}` : "");

    const params = new URLSearchParams({
      q,
      city,
      vibe,
      slot: slotKey || "activity",
      limit: "10",
      near: String(useNearFilter),
      mode: nearMode,
      maxMins: String(nearMaxMins),
      lat: hotel?.lat != null ? String(hotel.lat) : "",
      lng: hotel?.lng != null ? String(hotel.lng) : "",
      area: areaFilter || "",
    });

    setLiveLoading(true);
    setLiveError(null);
    setLastFetchUrl(`${API_BASE}/api/places?${params.toString()}`);
    setLastResultCount(0);

    fetch(`${API_BASE}/api/places?${params.toString()}`, {
      signal: ctrl.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        const items = (Array.isArray(data.items) ? data.items : []).map(
          (it: any): ApiSuggestion => ({
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
          })
        );
        setLiveItems(items);
        setLastResultCount(items.length);
      })
      .catch((err) => {
        if ((err as any).name !== "AbortError")
          setLiveError(String((err as any).message || err));
      })
      .finally(() => setLiveLoading(false));

    return () => ctrl.abort();
  }, [
    slotModalOpen,
    city,
    vibe,
    slotKey,
    useNearFilter,
    nearMode,
    nearMaxMins,
    hotel?.lat,
    hotel?.lng,
    areaFilter,
  ]);

  async function rebuildDayForVibe(dayIndex1Based: number) {
    const cats: SlotKey[] = [
      "breakfast",
      "activity",
      "lunch",
      "coffee",
      "dinner",
    ];
    for (const cat of cats) {
      const params = new URLSearchParams({
        q: `Suggest top ${cat} in ${city} for a ${vibe} vibe`,
        city,
        vibe,
        slot: String(cat),
        limit: "1",
        lat: hotel?.lat != null ? String(hotel.lat) : "",
        lng: hotel?.lng != null ? String(hotel.lng) : "",
        near: String(useNearFilter),
        mode: nearMode,
        maxMins: String(nearMaxMins),
        area: areaFilter || "",
      });
      try {
        const r = await fetch(`${API_BASE}/api/places?${params.toString()}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: AiResponse = await r.json();
        const first = data.items?.[0];
        if (first)
          setSlot(dayIndex1Based, cat, {
            name: first.name,
            url: first.url,
            area: first.area,
            cuisine: first.cuisine,
            price: first.price,
            lat: first.lat,
            lng: first.lng,
            desc: first.desc,
            meta: first.meta,
          });
      } catch {
        // ignore per-slot
      }
    }
  }

  // directions (optional AI endpoint) – keep fallback
  useEffect(() => {
    if (chosenItems.length < 2) {
      setDirSegs(null);
      setDirErr(null);
      return;
    }

    const coordsStr = chosenItems
      .map((p) => `${p.lat},${p.lng},${p.name}`)
      .join(";");
    const q = `directions please for coords=${coordsStr}`;
    const params = new URLSearchParams({ q, city, withDirections: "true" });

    const ctrl = new AbortController();
    fetch(`${API_BASE}/api/ai?${params.toString()}`, {
      signal: ctrl.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: AiResponse = await r.json();
        const segs = (data.directions || []).map((s) => ({
          path: s.path || [],
          mins: s.mins,
          mode: s.mode,
          from: s.from,
          to: s.to,
        }));
        setDirSegs(segs);
        setDirErr(null);
      })
      .catch((err) => {
        if ((err as any).name !== "AbortError") {
          setDirErr(String((err as any).message || err));
          setDirSegs(null);
        }
      });
    return () => ctrl.abort();
  }, [chosenItems.map((p) => p.name).join("|"), city]);

  function handlePrint() {
    window.print();
  }

  async function openDetail(dayIdx1: number) {
    setDetailDay(dayIdx1);
    const day = plan[dayIdx1 - 1];
    const uiText = buildDetailText(day, vibe);
    setDetailText(uiText);
    setDetailOpen(true);

    // try backend enrich if available
    try {
      const r = await fetch(`${API_BASE}/api/enrich`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          city,
          vibe,
          selections: {
            breakfast: day?.breakfast?.name,
            activity: day?.activity?.name,
            lunch: day?.lunch?.name,
            coffee: day?.coffee?.name,
            dinner: day?.dinner?.name,
          },
        }),
      });
      if (r.ok) {
        const j = await r.json();
        if (j?.desc) setDetailText(j.desc);
      }
    } catch {
      // ignore, fallback already shown
    }
  }

  function insertDetailIntoNotes() {
    setPlan((prev) => {
      const next = prev.map((d) => ({ ...d }));
      const i = detailDay - 1;
      const existing = next[i].notes?.trim();
      next[i].notes = existing
        ? `${existing}\n\n${detailText}`
        : detailText;
      return next;
    });
    setDetailOpen(false);
  }

  // api status
  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      const start = performance.now();
      try {
        const res = await fetch(
          `${API_BASE}/api/places?city=test&slot=activity&limit=1`
        );
        const latency = Math.round(performance.now() - start);
        if (!cancelled) {
          setApiLatency(latency);
          setApiOk(res.ok);
          setApiMsg(res.ok ? "OK" : `HTTP ${res.status}`);
        }
      } catch (e: any) {
        if (!cancelled) {
          setApiOk(false);
          setApiLatency(null);
          setApiMsg(String(e?.message || "error"));
        }
      }
    };
    ping();
    const id = setInterval(ping, 60000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // 👇 geolocation fix
  function useMyLocation() {
    if (typeof window === "undefined") {
      setHotelError("Geolocation not available (SSR)");
      return;
    }
    if (!("geolocation" in navigator)) {
      setHotelError("Geolocation unavailable in this browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setHotel({
          name: "My location",
          area: "current location",
          lat: latitude,
          lng: longitude,
          desc: "Browser-provided location",
        });
        setHotelError(null);
      },
      (err) => {
        setHotelError(
          err?.message ||
            "Failed to get location (check site permissions / HTTPS)"
        );
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  // basic runtime assertions
  useEffect(() => {
    try {
      console.assert(
        Math.abs(
          haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })
        ) < 1e-9,
        "haversine zero"
      );
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-indigo-50 to-white p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Top bar */}
        <div className="rounded-2xl bg-white border p-4 flex flex-wrap items-center gap-3">
          <div className="text-lg font-semibold mr-auto">
            Largekite - Plan Builder
          </div>
          <div className="flex items-center gap-2 text-xs mr-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${
                apiOk == null
                  ? "bg-slate-50 text-slate-600"
                  : apiOk
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              <Wifi className="w-3.5 h-3.5" />
              {apiOk == null
                ? "API: unknown"
                : apiOk
                ? `API: ok${apiLatency != null ? ` · ${apiLatency}ms` : ""}`
                : `API: down (${apiMsg || "error"})`}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-600">Country</span>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="border rounded-lg p-1"
            >
              <option value="USA">USA</option>
            </select>
            <span className="text-slate-600">City</span>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g., St. Louis"
              className="border rounded-lg p-1 w-44"
            />
          </div>
          <div className="flex gap-2">
            {VIBES.map((v) => (
              <button
                key={v}
                onClick={() => setVibe(v)}
                aria-pressed={vibe === v}
                className={`px-3 py-1.5 rounded-full border text-sm ${
                  vibe === v
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-800"
                }`}
              >
                {v === "romantic" && (
                  <Heart className="inline w-4 h-4 mr-1" />
                )}
                {v === "family" && (
                  <Users className="inline w-4 h-4 mr-1" />
                )}
                {v === "adventurous" && (
                  <Mountain className="inline w-4 h-4 mr-1" />
                )}
                {v}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-slate-600" />
            <span className="text-slate-600">Days</span>
            <input
              type="number"
              min={1}
              max={14}
              value={daysCount}
              onChange={(e) =>
                setDaysCount(
                  Math.max(1, Math.min(14, parseInt(e.target.value || "1")))
                )
              }
              className="w-20 border rounded-lg p-1"
            />
          </div>
          <div className="w-full sm:w-auto">
            <DaysStrip
              daysCount={daysCount}
              currentDay={currentDay}
              setCurrentDay={setCurrentDay}
            />
          </div>
        </div>

        {/* Hotel / Area */}
        <div className="rounded-2xl bg-white border p-4">
          <div className="font-semibold mb-2">Hotel / Area</div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex items-center gap-2 text-sm">
                <span className="text-slate-600">Search</span>
                <div className="flex items-center gap-2 border rounded-lg px-2 py-1 w-[320px] bg-white">
                  <Search className="w-4 h-4 text-slate-500" />
                  <input
                    value={hotelQuery}
                    onChange={(e) => setHotelQuery(e.target.value)}
                    placeholder="e.g., Marriott, Union Station, Central West End"
                    className="outline-none w-full"
                  />
                </div>
              </div>
              <button
                onClick={useMyLocation}
                className="px-3 py-2 rounded-lg border flex items-center gap-2 bg-white hover:bg-slate-50"
              >
                <Crosshair className="w-4 h-4" /> Use my location
              </button>
              <button
                onClick={() => openSlot("hotel")}
                className="px-3 py-2 rounded-lg border flex items-center gap-2 bg-white hover:bg-slate-50"
              >
                <Hotel className="w-4 h-4" /> Open chooser
              </button>
            </div>
            {(hotelLoading || hotelError || hotelSugs.length > 0) && (
              <div className="border rounded-xl p-2 bg-slate-50">
                <div className="text-xs text-slate-500 mb-1">
                  {hotelLoading
                    ? "Searching…"
                    : hotelError
                    ? hotelError
                    : "Matches"}
                </div>
                <div className="divide-y max-h-60 overflow-auto">
                  {hotelSugs.map((h, i) => (
                    <button
                      key={`${h.name}-${i}`}
                      onClick={() => {
                        setHotel({
                          name: h.name,
                          url: h.url,
                          area: h.area,
                          lat: h.lat,
                          lng: h.lng,
                          desc: h.desc,
                        });
                        setHotelQuery(h.name);
                        setHotelError(null);
                      }}
                      className="w-full text-left py-2 px-2 hover:bg-white rounded-lg"
                    >
                      <div className="font-medium">{h.name}</div>
                      <div className="text-xs text-slate-600">
                        {[h.area, h.desc].filter(Boolean).join(" · ")}
                      </div>
                    </button>
                  ))}
                  {!hotelLoading && !hotelError && hotelSugs.length === 0 && (
                    <div className="text-xs text-slate-500 py-2 px-2">
                      No matches yet.
                    </div>
                  )}
                </div>
              </div>
            )}
            {hotelError && (
              <div className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded px-2 py-1">
                {hotelError}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              {hotel?.name ? (
                <div className="text-sm">
                  Selected: <span className="font-medium">{hotel.name}</span>
                  {hotel.area ? (
                    <span className="text-slate-500"> · {hotel.area}</span>
                  ) : null}
                </div>
              ) : (
                <div className="text-sm text-slate-500">None selected</div>
              )}
              {hotel?.lat && hotel?.lng ? (
                <div className="text-xs text-slate-500">
                  ({hotel.lat.toFixed(4)}, {hotel.lng.toFixed(4)})
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Main two-column */}
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Left: Day plan */}
          <div className="bg-white rounded-2xl border p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Day {currentDay}</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => rebuildDayForVibe(currentDay)}
                  className="text-xs flex items-center gap-1 px-2 py-1 rounded border bg-white hover:bg-slate-50"
                >
                  Rebuild for vibe
                </button>
                <button
                  onClick={() => openDetail(currentDay)}
                  className="text-xs flex items-center gap-1 px-2 py-1 rounded border bg-indigo-50 hover:bg-indigo-100"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  Suggest details
                </button>
                <button
                  onClick={() => clearDay(currentDay)}
                  className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SlotButton
                label="Activity"
                value={cur.activity}
                onClick={() => openSlot("activity")}
              />
              <SlotButton
                label="Breakfast"
                value={cur.breakfast}
                onClick={() => openSlot("breakfast")}
              />
              <SlotButton
                label="Lunch"
                value={cur.lunch}
                onClick={() => openSlot("lunch")}
              />
              <SlotButton
                label="Dinner"
                value={cur.dinner}
                onClick={() => openSlot("dinner")}
              />
              <SlotButton
                label="Coffee"
                value={cur.coffee}
                onClick={() => openSlot("coffee")}
              />
            </div>
            <textarea
              value={cur.notes || ""}
              onChange={(e) =>
                setPlan((prev) => {
                  const next = [...prev];
                  next[currentDay - 1] = {
                    ...next[currentDay - 1],
                    notes: e.target.value,
                  };
                  return next;
                })
              }
              placeholder="Notes (times, confirmations, etc.)"
              className="mt-3 w-full border rounded-lg p-2 text-sm"
            />
          </div>

          {/* Right: Map */}
          <div className="bg-white rounded-2xl border p-4">
            <div className="font-semibold mb-2">Map - Day {currentDay}</div>
            <div className="text-[11px] text-slate-500 mb-2">
              Routes show real ETAs when the backend returns directions;
              otherwise straight-line estimates.
            </div>
            <svg
              viewBox="0 0 100 100"
              className="w-full aspect-square rounded-xl border bg-slate-50"
            >
              {/* Grid */}
              {[...Array(8)].map((_, i) => (
                <line
                  key={`h-${i}`}
                  x1={6}
                  x2={94}
                  y1={6 + i * 11}
                  y2={6 + i * 11}
                  stroke="#e5e7eb"
                  strokeWidth={0.4}
                />
              ))}
              {[...Array(8)].map((_, i) => (
                <line
                  key={`v-${i}`}
                  y1={6}
                  y2={94}
                  x1={6 + i * 11}
                  x2={6 + i * 11}
                  stroke="#e5e7eb"
                  strokeWidth={0.4}
                />
              ))}

              {/* backend directions */}
              {dirSegs &&
                dirSegs.map((seg, idx) => (
                  <g key={`rseg-${idx}`}>
                    <path
                      d={toSvgPath(seg.path)}
                      fill="none"
                      stroke={seg.mode === "walk" ? "#16a34a" : "#2563eb"}
                      strokeWidth={1.6}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {(() => {
                      const first = seg.path[0];
                      const last = seg.path[seg.path.length - 1];
                      if (!first || !last) return null;
                      const a = project(first[0], first[1]);
                      const b = project(last[0], last[1]);
                      const mx = (a.x + b.x) / 2;
                      const my = (a.y + b.y) / 2;
                      return (
                        <text
                          x={mx + 1}
                          y={my - 1}
                          fontSize={3}
                          fill="#334155"
                        >
                          {seg.mins} min
                        </text>
                      );
                    })()}
                  </g>
                ))}

              {/* straight-line fallback */}
              {!dirSegs &&
                straightSegments.map((seg, idx) => {
                  const a = project(seg.a.lat, seg.a.lng);
                  const b = project(seg.b.lat, seg.b.lng);
                  const color = seg.mode === "walk" ? "#16a34a" : "#2563eb";
                  const midx = (a.x + b.x) / 2;
                  const midy = (a.y + b.y) / 2;
                  return (
                    <g key={`seg-${idx}`}>
                      <line
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke={color}
                        strokeWidth={1.2}
                      />
                      <text
                        x={midx + 1}
                        y={midy - 1}
                        fontSize={3}
                        fill="#334155"
                      >
                        {seg.mins} min
                      </text>
                    </g>
                  );
                })}

              {/* Pins */}
              {chosenItems.map((p, idx) => {
                const { x, y, hidden } = project(p.lat, p.lng);
                if (hidden) return null;
                const hue = 220 + idx * 40;
                return (
                  <g key={`${p.name}-${idx}`}>
                    {/* 👇 changed to comma-style hsl */}
                    <circle
                      cx={x}
                      cy={y}
                      r={2.8}
                      fill={`hsl(${hue}, 80%, 45%)`}
                    />
                    <text
                      x={x + 3.8}
                      y={y + 1.6}
                      fontSize={3}
                      fill="#334155"
                    >
                      {p.name}
                    </text>
                  </g>
                );
              })}

              {/* Hotel pin */}
              {hotel && hotel.lat && hotel.lng && (() => {
                const { x, y, hidden } = project(hotel.lat, hotel.lng);
                if (hidden) return null;
                return (
                  <g key="hotel">
                    <rect
                      x={x - 2}
                      y={y - 2}
                      width={4}
                      height={4}
                      fill="#f59e0b"
                    />
                    <text
                      x={x + 3.8}
                      y={y + 1.6}
                      fontSize={3}
                      fill="#92400e"
                    >
                      Hotel/Center
                    </text>
                  </g>
                );
              })()}
            </svg>
            <div className="mt-2 text-xs text-slate-600">
              {chosenItems.length === 0 ? (
                <div>
                  No places selected yet. Choose slots on the left to plot and
                  route them here.
                </div>
              ) : (
                <ul className="list-disc pl-5">
                  {chosenItems.map((p, i) => (
                    <li key={`${p.name}-legend-${i}`}>
                      {p.name}{" "}
                      {p.area ? (
                        <span className="text-slate-500">· {p.area}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {dirErr && (
              <div className="mt-2 text-xs text-amber-700">
                Directions error: {dirErr}. Falling back to straight-line
                estimates.
              </div>
            )}
          </div>
        </div>

        {/* Plan View */}
        <div className="rounded-2xl bg-white border p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Plan View</div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-lg border bg-slate-50 hover:bg-slate-100 text-sm flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </div>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-4">Day</th>
                  <th className="py-2 pr-4">Breakfast</th>
                  <th className="py-2 pr-4">Activity</th>
                  <th className="py-2 pr-4">Lunch</th>
                  <th className="py-2 pr-4">Coffee</th>
                  <th className="py-2 pr-4">Dinner</th>
                  <th className="py-2 pr-4">Notes</th>
                </tr>
              </thead>
              <tbody>
                {plan.map((d, i) => (
                  <tr key={`day-${i}`} className="border-t align-top">
                    <td className="py-2 pr-4 font-medium whitespace-nowrap">
                      Day {i + 1}
                    </td>
                    <td className="py-2 pr-4">
                      {d.breakfast?.name || (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {d.activity?.name || (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {d.lunch?.name || (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {d.coffee?.name || (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {d.dinner?.name || (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td
                      className="py-2 pr-4 max-w-[320px] truncate"
                      title={d.notes}
                    >
                      {d.notes || <span className="text-slate-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Suggestions modal */}
        <Modal
          open={slotModalOpen}
          title={`Choose ${
            slotKey === "hotel"
              ? "Hotel / Area"
              : slotKey.charAt(0).toUpperCase() + slotKey.slice(1)
          }`}
          onClose={() => setSlotModalOpen(false)}
        >
          <div className="mb-4 rounded-xl border p-3 bg-slate-50">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-600">Area/Neighborhood</span>
                <input
                  value={areaFilter}
                  onChange={(e) => setAreaFilter(e.target.value)}
                  placeholder="e.g., Tower Grove, Central West End"
                  className="border rounded-lg p-1"
                />
              </div>
              {slotKey !== "hotel" && (
                <>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={useNearFilter}
                      onChange={(e) => setUseNearFilter(e.target.checked)}
                    />
                    <span>Filter by near me</span>
                  </label>
                  <div className="flex items-center gap-2 text-sm">
                    <button
                      onClick={() => setNearMode("walk")}
                      className={`px-2 py-1 rounded border text-xs ${
                        nearMode === "walk"
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white"
                      }`}
                    >
                      <Footprints className="inline w-3.5 h-3.5 mr-1" />
                      Walk
                    </button>
                    <button
                      onClick={() => setNearMode("drive")}
                      className={`px-2 py-1 rounded border text-xs ${
                        nearMode === "drive"
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white"
                      }`}
                    >
                      <Car className="inline w-3.5 h-3.5 mr-1" />
                      Drive
                    </button>
                  </div>
                  <div className="text-xs text-slate-600">
                    Max minutes: {nearMaxMins}
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={30}
                    value={nearMaxMins}
                    onChange={(e) =>
                      setNearMaxMins(parseInt(e.target.value))
                    }
                  />
                  {!hotel && useNearFilter && (
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                      Pick a hotel/center to enable near-me filtering.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mb-2">
            <div>
              Last request URL:{" "}
              <span className="break-all">
                {lastFetchUrl || "(none yet)"}
              </span>
            </div>
            <div>Items returned: {lastResultCount}</div>
          </div>
          <SuggestionList
            items={liveItems}
            onChoose={chooseForSlot}
            loading={liveLoading}
            error={liveError}
            usingApi={true}
          />
        </Modal>

        {/* Detail modal */}
        <Modal
          open={detailOpen}
          title={`Suggested details - Day ${detailDay}`}
          onClose={() => setDetailOpen(false)}
        >
          <div className="space-y-3">
            <textarea
              value={detailText}
              onChange={(e) => setDetailText(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm min-h-[160px]"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={insertDetailIntoNotes}
                className="px-3 py-1.5 rounded-lg border bg-indigo-50 hover:bg-indigo-100 text-sm"
              >
                Insert into Day {detailDay} notes
              </button>
              <button
                onClick={() => setDetailOpen(false)}
                className="px-3 py-1.5 rounded-lg border bg-white hover:bg-slate-50 text-sm"
              >
                Close
              </button>
            </div>
            <div className="text-[11px] text-slate-500">
              Fetched from backend when available, otherwise generated in UI.
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
