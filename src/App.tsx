import React, { useEffect, useState } from "react";
import { Printer, Share2 } from "lucide-react";
import TopBar from "./components/TopBar";
import HotelSection from "./components/HotelSection";
import DayPlanner from "./components/DayPlanner";
import SuggestionModal from "./components/SuggestionModal";
import MapPanel from "./components/MapPanel";
import {
  DayPlan,
  SelectedItem,
  SlotKey,
  Vibe,
  ApiSuggestion,
  DirectionsSegment,
} from "./lib/types";
import {
  fetchPlaces,
  fetchDayNotes,
  fetchDirections,
  detectApiBase,
} from "./lib/api";
import { optimizeRoute } from "./lib/routeOptimizer";
import LocationButton from "./components/LocationButton";

// slots in the order they show up on the map
const SLOT_SEQUENCE: (keyof DayPlan)[] = [
  "breakfast",
  "activity",
  "lunch",
  "coffee",
  "dinner",
];

// safe clone for day data (no structuredClone)
function cloneDay(d: DayPlan | undefined): DayPlan {
  return {
    activity: d?.activity ? { ...d.activity } : undefined,
    breakfast: d?.breakfast ? { ...d.breakfast } : undefined,
    lunch: d?.lunch ? { ...d.lunch } : undefined,
    dinner: d?.dinner ? { ...d.dinner } : undefined,
    coffee: d?.coffee ? { ...d.coffee } : undefined,
    notes: d?.notes ?? undefined,
  };
}

export default function App() {
  const API_BASE = detectApiBase();

  // global trip state
  const [country, setCountry] = useState("USA");
  const [city, setCity] = useState("St. Louis");
  const [vibe, setVibe] = useState<Vibe>("romantic");
  const [daysCount, setDaysCount] = useState(3);
  const [currentDay, setCurrentDay] = useState(1);
  const [plan, setPlan] = useState<DayPlan[]>(
    () => Array.from({ length: 3 }, () => ({}))
  );

  // hotel / center
  const [hotel, setHotel] = useState<SelectedItem | null>(null);
  
  // route optimization
  const [showOptimization, setShowOptimization] = useState(false);

  // modal
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [slotKey, setSlotKey] = useState<SlotKey>("activity");
  const [areaFilter, setAreaFilter] = useState("");
  const [useNearFilter, setUseNearFilter] = useState(false);
  const [nearMode, setNearMode] = useState<"walk" | "drive">("walk");
  const [nearMaxMins, setNearMaxMins] = useState(15);
  const [sortMode, setSortMode] = useState<"default" | "distance" | "rating">(
    "default"
  );

  // suggestions
  const [liveItems, setLiveItems] = useState<ApiSuggestion[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [lastFetchUrl, setLastFetchUrl] = useState("");
  const [lastResultCount, setLastResultCount] = useState(0);

  // directions / map
  const [dirSegs, setDirSegs] = useState<DirectionsSegment[] | null>(null);
  const [dirErr, setDirErr] = useState<string | null>(null);

  // API status
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [apiLatency, setApiLatency] = useState<number | null>(null);
  const [apiMsg, setApiMsg] = useState<string | null>(null);

  // keep days array in sync
  useEffect(() => {
    setPlan((prev) => {
      const copy = [...prev];
      if (daysCount > copy.length) {
        return copy.concat(
          Array.from({ length: daysCount - copy.length }, () => ({}))
        );
      }
      if (daysCount < copy.length) {
        return copy.slice(0, daysCount);
      }
      return copy;
    });
    setCurrentDay((d) => Math.max(1, Math.min(daysCount, d)));
  }, [daysCount]);

  const currentDayData = plan[currentDay - 1] || {};
  const chosenItems = SLOT_SEQUENCE.map((k) => currentDayData[k]).filter(
    Boolean
  ) as SelectedItem[];

  // ping API so top bar shows status
  useEffect(() => {
    if (!API_BASE) {
      setApiOk(null);
      setApiMsg("API base not configured");
      return;
    }
    let cancelled = false;
    const ping = async () => {
      const start = performance.now();
      try {
        const r = await fetch(
          `${API_BASE}/api/places?city=test&slot=activity&limit=1`
        );
        const latency = Math.round(performance.now() - start);
        if (!cancelled) {
          setApiLatency(latency);
          setApiOk(r.ok);
          setApiMsg(r.ok ? "OK" : `HTTP ${r.status}`);
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
  }, [API_BASE]);

  // directions fetch
  useEffect(() => {
    if (!API_BASE) return;
    if (chosenItems.length < 2) {
      setDirSegs(null);
      setDirErr(null);
      return;
    }
    fetchDirections(API_BASE, city, chosenItems)
      .then((res) => {
        setDirSegs(res);
        setDirErr(null);
      })
      .catch((err) => {
        setDirErr(String(err?.message || err));
        setDirSegs(null);
      });
  }, [API_BASE, city, JSON.stringify(chosenItems.map((c) => c.name))]);

  // open picker
  function openSlot(slot: SlotKey) {
    setSlotKey(slot);
    setSlotModalOpen(true);
  }

  // choose suggestion -> set slot + fetch notes
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

    // hotel uses same modal
    if (slotKey === "hotel") {
      setHotel(sel);
      setSlotModalOpen(false);
      return;
    }

    // 1) set the slot
    setPlan((prev) => {
      const next = prev.map((d) => ({ ...d }));
      const idx = currentDay - 1;
      (next[idx] as any)[slotKey] = sel;
      return next;
    });

    // 2) ask backend to generate notes for this day (non-hardcoded)
    if (API_BASE) {
      const dayIdx = currentDay;
      const snapshot = cloneDay({ ...currentDayData, [slotKey]: sel });
      fetchDayNotes(API_BASE, dayIdx, city, vibe, snapshot)
        .then((notes) => {
          if (!notes) return;
          setPlan((prev) => {
            const next = prev.map((d) => ({ ...d }));
            next[dayIdx - 1].notes = notes;
            return next;
          });
        })
        .catch(() => {
          // ignore notes error, UI still works
        });
    }

    setSlotModalOpen(false);
  }

  // fetch suggestions whenever modal is open or filters change
// inside App.tsx
useEffect(() => {
  if (!slotModalOpen) return;
  if (!API_BASE) {
    setLiveItems([]);
    setLiveError("API base not configured");
    return;
  }

  const ctrl = new AbortController();
  setLiveLoading(true);

  const params = new URLSearchParams({
    city,
    vibe,
    slot: slotKey,
    limit: "10",
    near: String(useNearFilter),
    mode: nearMode,
    maxMins: String(nearMaxMins),
    lat: hotel?.lat ? String(hotel.lat) : "",
    lng: hotel?.lng ? String(hotel.lng) : "",
    area: areaFilter || "",
    q: `Suggest top ${slotKey} places in ${city} for a ${vibe} vibe${
      areaFilter ? " around " + areaFilter : ""
    }`,
  });

  fetchPlaces(API_BASE, params, ctrl.signal)
    .then(({ items, raw }) => {
      setLiveItems(items);
      setLiveError(null);
      setLastFetchUrl(`${API_BASE}/api/places?${params.toString()}`);
      setLastResultCount(items.length);
    })
    .catch((err) => {
      if ((err as any).name !== "AbortError") {
        setLiveError(String(err?.message || err));
      }
      setLiveItems([]);
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
  API_BASE,
]);


  function clearDay(dayIndex1Based: number) {
    setPlan((prev) => {
      const next = prev.map((d) => ({ ...d }));
      next[dayIndex1Based - 1] = {};
      return next;
    });
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-indigo-50 to-white p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        <TopBar
          apiOk={apiOk}
          apiLatency={apiLatency}
          apiMsg={apiMsg}
          country={country}
          setCountry={setCountry}
          city={city}
          setCity={setCity}
          vibe={vibe}
          setVibe={setVibe}
          daysCount={daysCount}
          setDaysCount={setDaysCount}
          currentDay={currentDay}
          setCurrentDay={setCurrentDay}
        />

        <HotelSection
          city={city}
          hotel={hotel}
          setHotel={setHotel}
          apiBase={API_BASE}
        />
        
        {/* Route Optimization Panel */}
        {chosenItems.length > 2 && (
          <div className="rounded-2xl bg-white/90 backdrop-blur border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">Route Optimization</div>
              <button
                onClick={() => setShowOptimization(!showOptimization)}
                className="px-3 py-1.5 rounded-lg border bg-white text-sm"
              >
                {showOptimization ? 'Hide' : 'Optimize Route'}
              </button>
            </div>
            
            {showOptimization && (() => {
              const optimization = optimizeRoute(
                chosenItems, 
                hotel ? { lat: hotel.lat!, lng: hotel.lng! } : undefined,
                "walk"
              );
              
              return (
                <div className="space-y-3">
                  <div className="text-sm text-slate-600">
                    Optimized route saves ~{Math.max(0, chosenItems.length * 5 - optimization.totalTime)} minutes
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium mb-2">Current Order:</div>
                      <div className="space-y-1">
                        {chosenItems.map((item, i) => (
                          <div key={i} className="text-slate-600">
                            {i + 1}. {item.name}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <div className="font-medium mb-2">Optimized Order:</div>
                      <div className="space-y-1">
                        {optimization.optimizedOrder.map((item, i) => (
                          <div key={i} className="text-slate-600">
                            {i + 1}. {item.name}
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        Total: {optimization.totalTime}min, {optimization.totalDistance}km
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      // Apply optimization to current day
                      const dayData = { ...currentDayData };
                      const slots = ['breakfast', 'activity', 'lunch', 'coffee', 'dinner'] as const;
                      
                      // Clear current slots
                      slots.forEach(slot => delete dayData[slot]);
                      
                      // Apply optimized order
                      optimization.optimizedOrder.forEach((item, i) => {
                        if (slots[i]) {
                          dayData[slots[i]] = item;
                        }
                      });
                      
                      setPlan(prev => {
                        const next = [...prev];
                        next[currentDay - 1] = dayData;
                        return next;
                      });
                      
                      setShowOptimization(false);
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                  >
                    Apply Optimized Route
                  </button>
                </div>
              );
            })()}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="space-y-4">
            <DayPlanner
              currentDay={currentDay}
              plan={plan}
              openSlot={openSlot}
              clearDay={clearDay}
              setPlan={setPlan}
            />
            
            {/* Quick Location Actions */}
            <div className="rounded-2xl bg-white/90 backdrop-blur border p-4 shadow-sm">
              <div className="font-semibold mb-3">Quick Actions</div>
              <div className="flex gap-2 flex-wrap">
                <LocationButton
                  onLocationFound={(lat, lng) => {
                    setHotel({
                      name: "Current Location",
                      lat,
                      lng,
                      area: "Your location"
                    });
                  }}
                  className="text-sm"
                />
                <button
                  onClick={() => {
                    // Auto-fill day with popular places
                    if (API_BASE) {
                      const slots = ['breakfast', 'activity', 'lunch', 'coffee', 'dinner'];
                      slots.forEach((slot, i) => {
                        setTimeout(() => {
                          const params = new URLSearchParams({
                            city,
                            vibe,
                            slot,
                            limit: "1"
                          });
                          fetchPlaces(API_BASE, params)
                            .then(({ items }) => {
                              if (items[0]) {
                                setPlan(prev => {
                                  const next = [...prev];
                                  (next[currentDay - 1] as any)[slot] = {
                                    name: items[0].name,
                                    url: items[0].url,
                                    area: items[0].area,
                                    lat: items[0].lat,
                                    lng: items[0].lng,
                                    desc: items[0].desc
                                  };
                                  return next;
                                });
                              }
                            })
                            .catch(() => {});
                        }, i * 200);
                      });
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg border bg-white hover:bg-slate-50 text-sm"
                >
                  Auto-fill Day
                </button>
              </div>
            </div>
          </div>

          <MapPanel
            currentDay={currentDay}
            hotel={hotel}
            chosenItems={chosenItems}
            dirSegs={dirSegs}
            dirErr={dirErr}
          />
        </div>

        {/* Plan view */}
        <div className="rounded-2xl bg-white/90 backdrop-blur border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Plan View</div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 rounded-lg border bg-white text-sm flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-lg border bg-slate-50 text-sm flex items-center gap-2"
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
                  <tr key={i} className="border-t align-top">
                    <td className="py-2 pr-4 font-medium">Day {i + 1}</td>
                    <td className="py-2 pr-4">
                      {d.breakfast?.name || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-2 pr-4">
                      {d.activity?.name || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-2 pr-4">
                      {d.lunch?.name || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-2 pr-4">
                      {d.coffee?.name || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-2 pr-4">
                      {d.dinner?.name || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-2 pr-4 max-w-[320px] truncate" title={d.notes}>
                      {d.notes || <span className="text-slate-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <SuggestionModal
          open={slotModalOpen}
          onClose={() => setSlotModalOpen(false)}
          slotKey={slotKey}
          areaFilter={areaFilter}
          setAreaFilter={setAreaFilter}
          useNearFilter={useNearFilter}
          setUseNearFilter={setUseNearFilter}
          nearMode={nearMode}
          setNearMode={setNearMode}
          nearMaxMins={nearMaxMins}
          setNearMaxMins={setNearMaxMins}
          hotel={hotel}
          items={liveItems}
          loading={liveLoading}
          error={liveError}
          onChoose={chooseForSlot}
          sortMode={sortMode}
          setSortMode={setSortMode}
          lastFetchUrl={lastFetchUrl}
          lastResultCount={lastResultCount}
        />
      </div>
    </div>
  );
}
