import React, { useState, useRef, useEffect } from "react";
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
  plan?: Record<string, any>[];
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
  plan,
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

  // Auto-search hotels in current city when modal opens
  useEffect(() => {
    if (showHotelSearch && city && apiBase) {
      searchHotels(city);
    }
  }, [showHotelSearch]);

  async function searchHotels(q: string) {
    if (!apiBase || q.trim().length < 2) return;
    setHotelSearching(true);
    try {
      const params = new URLSearchParams({ area: q, city, slot: "hotel", limit: "8" });
      const r = await fetch(`${apiBase}/api/places?${params}`);
      if (!r.ok) throw new Error();
      const data = await r.json();
      setHotelResults((data.items || data.results || []).map((it: any) => ({
        name: it.name, url: it.url, area: it.area,
        lat: it.lat || it.geometry?.location?.lat,
        lng: it.lng || it.geometry?.location?.lng,
        desc: it.desc,
        placeId: it.placeId,
        photo: it.photos?.[0],
        googleRating: it.ratings?.google,
        googleReviews: it.ratings?.googleReviews,
        price: it.price,
      })));
    } catch { setHotelResults([]); }
    finally { setHotelSearching(false); }
  }

  function selectHotel(h: SelectedItem) {
    setHotel(h);
    setShowHotelSearch(false);
    setHotelQuery("");
    setHotelResults([]);
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        selectHotel({
          name: "My location", area: city,
          lat: pos.coords.latitude, lng: pos.coords.longitude,
          desc: "Browser location",
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  // Hotel button shown inline in the header
  const hotelButton = hotel ? (
    <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 text-xs">
      <Hotel className="w-3 h-3 text-amber-600" />
      <span className="font-medium text-amber-800 truncate max-w-[140px]">{hotel.name}</span>
      <button onClick={() => setHotel(null)} className="text-amber-400 hover:text-amber-700">
        <X className="w-3 h-3" />
      </button>
    </div>
  ) : (
    <button
      onClick={() => setShowHotelSearch(true)}
      className="flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-slate-300 text-xs text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
    >
      <Hotel className="w-3 h-3" />
      Set hotel
    </button>
  );

  return (
    <>
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

          {/* Hotel button — desktop */}
          <div className="hidden sm:block">{hotelButton}</div>

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

          {/* Settings gear (mobile fallback for vibe + hotel) */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="md:hidden p-1.5 rounded-lg hover:bg-slate-100"
          >
            <Settings2 className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Mobile settings panel */}
        {showSettings && (
          <div className="md:hidden border-t px-4 py-2 space-y-2">
            <div className="flex flex-wrap gap-1.5">
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
            </div>
            {/* Mobile hotel */}
            <div className="sm:hidden">{hotelButton}</div>
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
            {Array.from({ length: daysCount }, (_, i) => i + 1).map((d) => {
              const dayData = plan?.[d - 1] || {};
              const slotKeys = ['hotel', 'breakfast', 'activity', 'lunch', 'activity2', 'coffee', 'dinner'];
              const filled = slotKeys.filter(k => dayData[k] && typeof dayData[k] === 'object' && 'name' in dayData[k]).length;
              const total = slotKeys.length;
              const isCurrent = currentDay === d;
              return (
                <button
                  key={d}
                  onClick={() => setCurrentDay(d)}
                  className={`relative px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    isCurrent
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-white"
                  }`}
                >
                  {d}
                  {filled > 0 && (
                    <span
                      className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border ${
                        filled >= total
                          ? (isCurrent ? 'bg-emerald-400 border-indigo-600' : 'bg-emerald-400 border-slate-50')
                          : (isCurrent ? 'bg-amber-400 border-indigo-600' : 'bg-amber-400 border-slate-50')
                      }`}
                    />
                  )}
                </button>
              );
            })}
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

      {/* Hotel search modal — rendered outside TopBar to avoid clipping */}
      {showHotelSearch && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowHotelSearch(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Hotel className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold text-sm">
                  {city ? `Find a hotel in ${city}` : 'Find a hotel'}
                </span>
              </div>
              <button onClick={() => setShowHotelSearch(false)} className="p-1 rounded hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Search input */}
            <div className="px-4 py-3 border-b">
              <div className="flex gap-2">
                <div className="flex items-center gap-2 border rounded-lg px-3 py-2 flex-1 bg-white focus-within:border-indigo-300">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input
                    value={hotelQuery}
                    onChange={(e) => setHotelQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchHotels(hotelQuery || city)}
                    placeholder={city ? `Search hotels in ${city}...` : "Search hotels..."}
                    className="outline-none text-sm w-full"
                    autoFocus
                  />
                </div>
                <button
                  onClick={() => searchHotels(hotelQuery || city)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  Search
                </button>
              </div>
              <button
                onClick={handleUseMyLocation}
                className="mt-2 w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg flex items-center gap-2"
              >
                <Crosshair className="w-4 h-4" /> Use my current location
              </button>
            </div>

            {/* Results */}
            <div className="max-h-72 overflow-y-auto">
              {hotelSearching && (
                <div className="text-sm text-slate-400 px-4 py-6 text-center">Searching...</div>
              )}
              {!hotelSearching && hotelResults.length === 0 && (
                <div className="text-sm text-slate-400 px-4 py-6 text-center">
                  {city ? 'Type a hotel name or press Search to find hotels' : 'Enter a city first, then search for hotels'}
                </div>
              )}
              {hotelResults.map((h, i) => (
                <button
                  key={i}
                  onClick={() => selectHotel(h)}
                  className="w-full text-left px-4 py-3 hover:bg-indigo-50 border-b last:border-b-0 transition-colors"
                >
                  <div className="font-medium text-sm">{h.name}</div>
                  {(h.area || h.desc) && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      {[h.area, h.desc].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
