import React, { useState } from "react";
import {
  Heart, Users, Mountain, Star,
  ChevronLeft, ChevronRight, MapPin, Settings2,
  Search, Crosshair, Hotel, Copy, X
} from "lucide-react";
import { VIBES, BUDGETS, Vibe, Budget, SelectedItem } from "../lib/types";

type Props = {
  country: string;
  setCountry: (c: string) => void;
  city: string;
  setCity: (c: string) => void;
  vibe: Vibe;
  setVibe: (v: Vibe) => void;
  daysCount: number;
  setDaysCount: (n: number) => void;
  currentDay: number;
  setCurrentDay: (n: number) => void;
  budget: Budget;
  setBudget: (b: Budget) => void;
  completionPercent?: number;
  // Hotel
  hotel: SelectedItem | null;
  setHotel: (h: SelectedItem | null) => void;
  apiBase: string;
  onUseForAllDays?: (hotel: SelectedItem) => void;
  onSampleItinerary?: () => void;
};

const VIBE_ICONS: Partial<Record<Vibe, React.ElementType>> = {
  romantic: Heart,
  family: Users,
  adventurous: Mountain,
  popular: Star,
};

const BUDGET_LABELS: Record<Budget, string> = {
  budget: "$",
  moderate: "$$",
  luxury: "$$$",
};

export default function TopBar({
  city, setCity,
  vibe, setVibe,
  daysCount, setDaysCount,
  currentDay, setCurrentDay,
  budget, setBudget,
  hotel, setHotel,
  apiBase,
  onUseForAllDays,
  onSampleItinerary,
}: Props) {
  const [showSettings, setShowSettings] = useState(false);
  const [hotelQuery, setHotelQuery] = useState("");
  const [hotelResults, setHotelResults] = useState<SelectedItem[]>([]);
  const [hotelSearching, setHotelSearching] = useState(false);
  const [showHotelSearch, setShowHotelSearch] = useState(false);

  async function searchHotels(q: string) {
    if (!apiBase || q.trim().length < 3) return;
    setHotelSearching(true);
    try {
      const params = new URLSearchParams({ area: q, city, slot: "hotel", limit: "5" });
      const r = await fetch(`${apiBase}/api/places?${params}`);
      if (!r.ok) throw new Error();
      const data = await r.json();
      setHotelResults((data.items || data.results || []).map((it: any) => ({
        name: it.name, url: it.url, area: it.area,
        lat: it.lat || it.geometry?.location?.lat,
        lng: it.lng || it.geometry?.location?.lng,
        desc: it.desc,
      })));
    } catch { setHotelResults([]); }
    finally { setHotelSearching(false); }
  }

  return (
    <div className="rounded-2xl bg-white/90 backdrop-blur border shadow-sm">
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-2.5">
        {/* Logo + City */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-base whitespace-nowrap">Largekite</span>
          {city && (
            <span className="flex items-center gap-1 text-sm text-indigo-600 font-medium truncate">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              {city}
            </span>
          )}
        </div>

        {/* Hotel inline */}
        <div className="hidden sm:flex items-center gap-1.5 ml-1 relative">
          {hotel ? (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 text-xs">
              <Hotel className="w-3 h-3 text-amber-600" />
              <span className="font-medium text-amber-800 truncate max-w-[120px]">{hotel.name}</span>
              <button onClick={() => setHotel(null)} className="text-amber-400 hover:text-amber-700">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowHotelSearch(!showHotelSearch)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-slate-300 text-xs text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
            >
              <Hotel className="w-3 h-3" />
              Set hotel
            </button>
          )}

          {/* Hotel search dropdown */}
          {showHotelSearch && !hotel && (
            <div className="absolute top-full left-0 mt-1 bg-white border rounded-xl shadow-lg p-2 z-50 w-72">
              <div className="flex gap-1.5 mb-2">
                <div className="flex items-center gap-1.5 border rounded-lg px-2 py-1 flex-1 bg-white">
                  <Search className="w-3 h-3 text-slate-400" />
                  <input
                    value={hotelQuery}
                    onChange={(e) => setHotelQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchHotels(hotelQuery)}
                    placeholder="Hotel or area..."
                    className="outline-none text-xs w-full"
                    autoFocus
                  />
                </div>
                <button onClick={() => searchHotels(hotelQuery)} className="px-2 py-1 bg-indigo-600 text-white rounded-lg text-xs">Go</button>
              </div>
              <button
                onClick={() => {
                  navigator.geolocation?.getCurrentPosition(
                    (pos) => {
                      setHotel({ name: "My location", area: city, lat: pos.coords.latitude, lng: pos.coords.longitude, desc: "Browser location" });
                      setShowHotelSearch(false);
                    },
                    () => {}
                  );
                }}
                className="w-full text-left px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50 rounded flex items-center gap-1.5 mb-1"
              >
                <Crosshair className="w-3 h-3" /> Use my location
              </button>
              {hotelSearching && <div className="text-xs text-slate-400 px-2 py-1">Searching...</div>}
              {hotelResults.map((h, i) => (
                <button
                  key={i}
                  onClick={() => { setHotel(h); setShowHotelSearch(false); setHotelQuery(""); setHotelResults([]); }}
                  className="w-full text-left px-2 py-1.5 hover:bg-indigo-50 rounded text-xs"
                >
                  <div className="font-medium">{h.name}</div>
                  {h.area && <div className="text-slate-500">{h.area}</div>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Vibe pills (compact) */}
        <div className="hidden md:flex gap-1">
          {[...new Set(VIBES)].map((v) => {
            const Icon = VIBE_ICONS[v];
            return (
              <button
                key={v}
                onClick={() => setVibe(v)}
                className={`px-2 py-1 rounded-full text-xs font-medium capitalize transition-all ${
                  vibe === v ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {Icon && <Icon className="w-3 h-3 inline mr-0.5" />}
                {v}
              </button>
            );
          })}
        </div>

        {/* Budget pills */}
        <div className="flex gap-0.5 bg-slate-100 rounded-full p-0.5">
          {BUDGETS.map((b) => (
            <button
              key={b}
              onClick={() => setBudget(b)}
              className={`px-2 py-0.5 rounded-full text-xs font-medium transition-all ${
                budget === b ? "bg-emerald-600 text-white" : "text-slate-500"
              }`}
            >
              {BUDGET_LABELS[b]}
            </button>
          ))}
        </div>

        {/* Settings gear (mobile fallback for vibe) */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="md:hidden p-1.5 rounded-lg hover:bg-slate-100"
        >
          <Settings2 className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Mobile settings panel */}
      {showSettings && (
        <div className="md:hidden border-t px-4 py-2 flex flex-wrap gap-1.5">
          {[...new Set(VIBES)].map((v) => {
            const Icon = VIBE_ICONS[v];
            return (
              <button
                key={v}
                onClick={() => { setVibe(v); setShowSettings(false); }}
                className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-all ${
                  vibe === v ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {Icon && <Icon className="w-3 h-3 inline mr-0.5" />}
                {v}
              </button>
            );
          })}
          {/* Mobile hotel */}
          <div className="w-full mt-1 sm:hidden">
            {hotel ? (
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 text-xs">
                <Hotel className="w-3 h-3 text-amber-600" />
                <span className="font-medium text-amber-800">{hotel.name}</span>
                {onUseForAllDays && (
                  <button onClick={() => onUseForAllDays(hotel)} className="text-indigo-600 text-[10px] ml-auto flex items-center gap-0.5">
                    <Copy className="w-2.5 h-2.5" /> All days
                  </button>
                )}
                <button onClick={() => setHotel(null)} className="text-amber-400 hover:text-amber-700 ml-1">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowHotelSearch(!showHotelSearch)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed text-xs text-slate-500"
              >
                <Hotel className="w-3 h-3" /> Set hotel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Day navigation bar */}
      <div className="flex items-center gap-1 px-4 py-2 border-t bg-slate-50/50 rounded-b-2xl">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-2">
          <input
            type="number"
            min={1}
            value={daysCount}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              if (v >= 1) setDaysCount(v);
            }}
            className="w-10 border rounded px-1 py-0.5 text-center text-xs bg-white"
            aria-label="Number of days"
          />
          <span className="hidden sm:inline">days</span>
        </div>

        {daysCount > 7 && (
          <button
            onClick={() => setCurrentDay(Math.max(1, currentDay - 1))}
            disabled={currentDay <= 1}
            className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-30"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="flex gap-1 overflow-x-auto">
          {Array.from({ length: daysCount }, (_, i) => i + 1).map((d) => (
            <button
              key={d}
              onClick={() => setCurrentDay(d)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                currentDay === d
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {daysCount > 7 && (
          <button
            onClick={() => setCurrentDay(Math.min(daysCount, currentDay + 1))}
            disabled={currentDay >= daysCount}
            className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-30"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="flex-1" />

        {onSampleItinerary && (
          <button
            onClick={onSampleItinerary}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Generate plan
          </button>
        )}

        {hotel && onUseForAllDays && (
          <button
            onClick={() => onUseForAllDays(hotel)}
            className="hidden sm:flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600"
          >
            <Copy className="w-3 h-3" /> Hotel all days
          </button>
        )}
      </div>
    </div>
  );
}
