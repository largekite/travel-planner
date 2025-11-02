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
 * Largekite - Travel Planner
 * --------------------------------------------------
 * Fetches live travel data (activities, food, coffee)
 * from a backend AI endpoint (`/api/ai`).
 * - Works with Vite and Vercel.
 * - No Node process reference (uses import.meta.env).
 ****************************************************/

// --------------------------------------------------
// API Base Resolution (fixed for Vite/Vercel)
// --------------------------------------------------
const API_BASE: string | undefined =
  (typeof window !== "undefined" && (window as any).__API_BASE__) ||
  (typeof globalThis !== "undefined" && (globalThis as any).__API_BASE__) ||
  (import.meta as any)?.env?.VITE_API_BASE ||
  undefined;

// --------------------------------------------------
// Types & Constants
// --------------------------------------------------
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

type SlotKey =
  | keyof Pick<DayPlan, "activity" | "breakfast" | "lunch" | "dinner" | "coffee">
  | "hotel";

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

// --------------------------------------------------
// Helpers
// --------------------------------------------------
function buildDetailText(d: DayPlan | undefined, vibe: Vibe): string {
  const parts: string[] = [];
  const add = (label: string, item?: SelectedItem) => {
    if (!item?.name) return;
    parts.push(`- ${label}: ${item.name} — vibe: ${vibe}`);
  };
  add("Breakfast", d?.breakfast);
  add("Activity", d?.activity);
  add("Lunch", d?.lunch);
  add("Coffee", d?.coffee);
  add("Dinner", d?.dinner);
  return parts.length ? parts.join("\n") : "No selections yet for this day.";
}

// --------------------------------------------------
// UI Components
// --------------------------------------------------
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
      <div className="relative bg-white rounded-2xl shadow-xl w-[min(900px,96vw)] max-h-[86vh] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-semibold">{title}</div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100"
            aria-label="close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-auto p-4">{children}</div>
      </div>
    </div>
  );
}

// --------------------------------------------------
// Main Component
// --------------------------------------------------
export default function PlannerRedesign() {
  const [country, setCountry] = useState("USA");
  const [city, setCity] = useState("St. Louis");
  const [vibe, setVibe] = useState<Vibe>("romantic");
  const [daysCount, setDaysCount] = useState(3);
  const [currentDay, setCurrentDay] = useState(1);
  const [plan, setPlan] = useState<DayPlan[]>(() =>
    Array.from({ length: 3 }, () => ({}))
  );

  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [slotKey, setSlotKey] = useState<SlotKey>("activity");
  const [liveItems, setLiveItems] = useState<ApiSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --------------------------------------------------
  // Fetch from API
  // --------------------------------------------------
  useEffect(() => {
    if (!slotModalOpen || !API_BASE) return;
    const q = `Suggest ${slotKey} in ${city} for ${vibe} vibe`;
    const url = `${API_BASE}/api/ai?q=${encodeURIComponent(q)}`;
    setLoading(true);
    setError(null);
    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: AiResponse = await r.json();
        setLiveItems(data.items || []);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [slotModalOpen, city, vibe, slotKey]);

  // --------------------------------------------------
  // Render
  // --------------------------------------------------
  const cur = plan[currentDay - 1];

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-indigo-50 to-white p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Top bar */}
        <div className="rounded-2xl bg-white border p-4 flex flex-wrap items-center gap-3">
          <div className="text-lg font-semibold mr-auto">
            Largekite - Plan Builder
          </div>
          <div className="flex gap-2">
            {VIBES.map((v) => (
              <button
                key={v}
                onClick={() => setVibe(v)}
                className={`px-3 py-1.5 rounded-full border text-sm ${
                  vibe === v
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-800"
                }`}
              >
                {v === "romantic" && <Heart className="inline w-4 h-4 mr-1" />}
                {v === "family" && <Users className="inline w-4 h-4 mr-1" />}
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
                setDaysCount(Math.max(1, Math.min(14, parseInt(e.target.value))))
              }
              className="w-20 border rounded-lg p-1"
            />
          </div>
        </div>

        {/* Plan View */}
        <div className="bg-white rounded-2xl border p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">Day {currentDay}</div>
            <button
              onClick={() => setSlotModalOpen(true)}
              className="px-3 py-1.5 rounded-lg border bg-indigo-50 hover:bg-indigo-100 text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add suggestion
            </button>
          </div>
          <div className="text-sm text-slate-600">
            {cur.activity?.name || "No activity selected yet."}
          </div>
        </div>

        {/* Suggestion Modal */}
        <Modal
          open={slotModalOpen}
          title={`Choose ${slotKey}`}
          onClose={() => setSlotModalOpen(false)}
        >
          {loading && <div>Loading...</div>}
          {error && <div className="text-red-600">{error}</div>}
          {!loading &&
            liveItems.map((it, idx) => (
              <div
                key={idx}
                className="py-2 border-b cursor-pointer hover:bg-slate-50"
                onClick={() => {
                  const selected: SelectedItem = {
                    name: it.name,
                    url: it.url,
                    desc: it.desc,
                  };
                  setPlan((prev) => {
                    const next = [...prev];
                    (next[currentDay - 1] as any)[slotKey] = selected;
                    return next;
                  });
                  setSlotModalOpen(false);
                }}
              >
                <div className="font-medium">{it.name}</div>
                <div className="text-xs text-slate-500">{it.desc}</div>
              </div>
            ))}
        </Modal>
      </div>
    </div>
  );
}
