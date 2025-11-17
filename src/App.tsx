import React, { useEffect, useState } from "react";
import { Printer, Share2, WifiOff } from "lucide-react";
import { useSwipeable } from 'react-swipeable';
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
  fetchAllPlaces,
  fetchDayNotes,
  fetchDirections,
  detectApiBase,
} from "./lib/api";
import { optimizeRoute } from "./lib/routeOptimizer";
import LocationButton from "./components/LocationButton";
import ErrorBoundary from "./components/ErrorBoundary";
import QuickActionsToolbar from "./components/QuickActionsToolbar";
import SmartDefaults from "./components/SmartDefaults";
import DragDropDayPlanner from "./components/DragDropDayPlanner";
import ProgressIndicator from "./components/ProgressIndicator";
import Tooltip from "./components/Tooltip";
import { useHistory } from "./hooks/useHistory";
import { useKeyboard } from "./hooks/useKeyboard";
import { useOnline } from "./hooks/useOnline";

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

  // global trip state with history
  const [country, setCountry] = useState("USA");
  const [city, setCity] = useState(() => 
    localStorage.getItem('travel-city') || "St. Louis"
  );
  const [vibe, setVibe] = useState<Vibe>("romantic");
  const [daysCount, setDaysCount] = useState(3);
  const [currentDay, setCurrentDay] = useState(1);
  
  const planHistory = useHistory<DayPlan[]>(
    Array.from({ length: 3 }, () => ({}))
  );
  const plan = planHistory.currentState;
  const setPlan = planHistory.pushState;
  
  // UI state
  const [showSmartDefaults, setShowSmartDefaults] = useState(!city || city === "St. Louis");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  
  // Online status
  const isOnline = useOnline();

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
  
  // Swipe gestures for mobile
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => setCurrentDay(Math.min(daysCount, currentDay + 1)),
    onSwipedRight: () => setCurrentDay(Math.max(1, currentDay - 1)),
    trackMouse: true
  });

  // keep days array in sync
  useEffect(() => {
    const copy = [...plan];
    let newPlan: DayPlan[];
    if (daysCount > copy.length) {
      newPlan = copy.concat(
        Array.from({ length: daysCount - copy.length }, () => ({} as DayPlan))
      );
    } else if (daysCount < copy.length) {
      newPlan = copy.slice(0, daysCount);
    } else {
      newPlan = copy;
    }
    if (newPlan !== plan) {
      setPlan(newPlan);
    }
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
    // Clear any existing items to force fresh fetch
    setLiveItems([]);
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
    const next = plan.map((d: DayPlan) => ({ ...d }));
    const idx = currentDay - 1;
    (next[idx] as any)[slotKey] = sel;
    setPlan(next);

    // 2) ask backend to generate notes for this day (non-hardcoded)
    if (API_BASE) {
      const dayIdx = currentDay;
      const snapshot = cloneDay({ ...currentDayData, [slotKey]: sel });
      fetchDayNotes(API_BASE, dayIdx, city, vibe, snapshot)
        .then((notes) => {
          if (!notes) return;
          const next = plan.map((d: DayPlan) => ({ ...d }));
          next[dayIdx - 1].notes = notes;
          setPlan(next);
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

  fetchAllPlaces(API_BASE, params, 2, ctrl.signal)
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
    const next = plan.map((d: DayPlan) => ({ ...d }));
    next[dayIndex1Based - 1] = {} as DayPlan;
    setPlan(next);
  }

  // Enhanced actions
  const handleSave = () => {
    const planData = { plan, city, vibe, daysCount, hotel };
    localStorage.setItem('saved-plan', JSON.stringify(planData));
    localStorage.setItem('travel-city', city);
  };
  
  const handleShare = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('city', city);
    url.searchParams.set('vibe', vibe);
    
    if (navigator.share) {
      await navigator.share({
        title: `${vibe} trip to ${city}`,
        url: url.toString()
      });
    } else {
      navigator.clipboard.writeText(url.toString());
      alert('Link copied to clipboard!');
    }
  };
  
  const handlePrint = () => window.print();
  
  const handleAutoFill = async () => {
    if (!API_BASE) return;
    
    setLoadingProgress(0);
    const slots = ['breakfast', 'activity', 'lunch', 'coffee', 'dinner'];
    
    try {
      // Make all requests concurrently for better performance
      const promises = slots.map(slot => {
        const params = new URLSearchParams({
          city, vibe, slot, limit: "1"
        });
        return fetchAllPlaces(API_BASE, params, 1).then(result => ({ slot, items: result.items }));
      });
      
      const results = await Promise.all(promises);
      
      const newPlan = [...plan];
      results.forEach(({ slot, items }) => {
        if (items[0]) {
          (newPlan[currentDay - 1] as any)[slot] = {
            name: items[0].name,
            url: items[0].url,
            area: items[0].area,
            lat: items[0].lat,
            lng: items[0].lng,
            desc: items[0].desc
          };
        }
      });
      
      setPlan(newPlan);
      setLoadingProgress(100);
    } catch (error) {
      console.error('Auto-fill failed:', error);
    }
    
    setTimeout(() => setLoadingProgress(0), 1000);
  };
  
  // Keyboard shortcuts
  useKeyboard({
    z: planHistory.undo,
    y: planHistory.redo,
    s: handleSave,
    p: handlePrint
  });
  
  // Auto-save
  useEffect(() => {
    const timer = setTimeout(handleSave, 2000);
    return () => clearTimeout(timer);
  }, [plan, city, vibe, hotel]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-b from-sky-50 via-indigo-50 to-white p-6" {...swipeHandlers}>
        {/* Offline indicator */}
        {!isOnline && (
          <div className="fixed top-4 right-4 bg-amber-100 border border-amber-300 rounded-lg p-3 flex items-center gap-2 z-50">
            <WifiOff className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-800">You're offline</span>
          </div>
        )}
        
        {/* Loading progress */}
        {loadingProgress > 0 && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-3 z-50">
            <ProgressIndicator 
              message="Auto-filling your day..." 
              progress={loadingProgress} 
            />
          </div>
        )}
        
        <div className="max-w-6xl mx-auto space-y-5">
        <TopBar
          apiOk={apiOk}
          apiLatency={apiLatency}
          apiMsg={apiMsg}
          country={country}
          setCountry={setCountry}
          city={city}
          setCity={(newCity) => {
            setCity(newCity);
            setShowSmartDefaults(false);
          }}
          vibe={vibe}
          setVibe={setVibe}
          daysCount={daysCount}
          setDaysCount={setDaysCount}
          currentDay={currentDay}
          setCurrentDay={setCurrentDay}
        />
        
        {/* Smart Defaults */}
        {showSmartDefaults && (
          <div className="rounded-2xl bg-white/90 backdrop-blur border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Quick Start</h2>
              <button 
                onClick={() => setShowSmartDefaults(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>
            <SmartDefaults
              onCitySelect={(newCity) => {
                setCity(newCity);
                setShowSmartDefaults(false);
              }}
              onVibeSelect={setVibe}
              onQuickFill={handleAutoFill}
            />
          </div>
        )}

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
                      
                      const next = [...plan];
                      next[currentDay - 1] = dayData;
                      setPlan(next);
                      
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
            <DragDropDayPlanner
              currentDay={currentDay}
              plan={plan}
              setPlan={setPlan}
              openSlot={(slot: string) => openSlot(slot as SlotKey)}
            />
            
            {/* Quick Actions */}
            <div className="rounded-2xl bg-white/90 backdrop-blur border p-4 shadow-sm">
              <div className="font-semibold mb-3">Quick Actions</div>
              <div className="flex gap-2 flex-wrap">
                <Tooltip content="Use your current location as hotel">
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
                </Tooltip>
                
                <Tooltip content="Automatically fill day with popular places">
                  <button
                    onClick={handleAutoFill}
                    disabled={loadingProgress > 0}
                    className="px-3 py-1.5 rounded-lg border bg-white hover:bg-slate-50 text-sm disabled:opacity-50"
                  >
                    {loadingProgress > 0 ? 'Filling...' : 'Auto-fill Day'}
                  </button>
                </Tooltip>
              </div>
              
              {/* Help hints */}
              <div className="mt-3 text-xs text-slate-500 space-y-1">
                <div>💡 Tip: Swipe left/right to change days on mobile</div>
                <div>⌨️ Shortcuts: Ctrl+Z (undo), Ctrl+S (save), Ctrl+P (print)</div>
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
              <button 
                onClick={handleShare}
                className="px-3 py-1.5 rounded-lg border bg-white text-sm flex items-center gap-2"
              >
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
        
        {/* Quick Actions Toolbar */}
        <QuickActionsToolbar
          canUndo={planHistory.canUndo}
          canRedo={planHistory.canRedo}
          onUndo={planHistory.undo}
          onRedo={planHistory.redo}
          onSave={handleSave}
          onShare={handleShare}
          onPrint={handlePrint}
          onHelp={() => setShowHelp(true)}
        />
        
        {/* Help Modal */}
        {showHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl p-6 max-w-md mx-4">
              <h3 className="font-semibold mb-4">How to use Travel Planner</h3>
              <div className="space-y-2 text-sm text-slate-600">
                <p>• Click on time slots to add places</p>
                <p>• Drag items to reorder your day</p>
                <p>• Use filters to find specific types of places</p>
                <p>• Compare places before choosing</p>
                <p>• Auto-optimize your route for efficiency</p>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 w-full"
              >
                Got it!
              </button>
            </div>
          </div>
        )}
        
        </div>
      </div>
    </ErrorBoundary>
  );
}
