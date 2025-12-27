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
import { optimizeRoute, calculateRouteTotals } from "./lib/routeOptimizer";
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
import SampleItinerary from "./components/SampleItinerary";

// slots in the order they show up on the map
const SLOT_SEQUENCE: (keyof DayPlan)[] = [
  "hotel",
  "breakfast",
  "activity",
  "activity2",
  "lunch",
  "coffee",
  "dinner",
];

// safe clone for day data (no structuredClone)
function cloneDay(d: DayPlan | undefined): DayPlan {
  return {
    hotel: d?.hotel ? { ...d.hotel } : undefined,
    activity: d?.activity ? { ...d.activity } : undefined,
    activity2: d?.activity2 ? { ...d.activity2 } : undefined,
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
  const [city, setCity] = useState(() => {
    const saved = localStorage.getItem('travel-city');
    // Return empty string if not found, will show Quick Start
    return saved || "";
  });
  const [vibe, setVibe] = useState<Vibe>(() => {
    // Only restore vibe if saved-plan exists
    const saved = localStorage.getItem('saved-plan');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.vibe) return data.vibe;
      } catch {}
    }
    return "popular";
  });
  const [daysCount, setDaysCount] = useState(() => {
    const saved = localStorage.getItem('saved-plan');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        return data.daysCount || 3;
      } catch {}
    }
    return 3;
  });
  const [currentDay, setCurrentDay] = useState(1);
  
  // Load saved plan from localStorage
  const getInitialPlan = (): DayPlan[] => {
    const saved = localStorage.getItem('saved-plan');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        return data.plan || Array.from({ length: 3 }, () => ({}));
      } catch {}
    }
    return Array.from({ length: 3 }, () => ({}));
  };
  
  const planHistory = useHistory<DayPlan[]>(getInitialPlan());
  const plan = planHistory.currentState;
  const setPlan = planHistory.pushState;
  
  // hotel / center
  const [hotel, setHotel] = useState<SelectedItem | null>(() => {
    const saved = localStorage.getItem('saved-plan');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        return data.hotel || null;
      } catch {}
    }
    return null;
  });
  
  // UI state
  const [showSmartDefaults, setShowSmartDefaults] = useState(!city || city === "");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [showSampleItinerary, setShowSampleItinerary] = useState(false);
  
  // Online status
  const isOnline = useOnline();

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
          `${API_BASE}/api/places?health=1`
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

    // 1) set the slot
    const next = plan.map((d: DayPlan) => ({ ...d }));
    const idx = currentDay - 1;
    (next[idx] as any)[slotKey] = sel;
    setPlan(next);

    // If the user chose a hotel/center, also update the global `hotel` state
    // so maps and other UI that rely on `hotel` will reflect the selection.
    if (slotKey === 'hotel') {
      setHotel(sel);
    }

    // 2) ask backend to generate notes for this day (non-hardcoded)
    if (API_BASE) {
      const dayIdx = currentDay;
      const snapshot = cloneDay({ ...currentDayData, [slotKey]: sel });
      // Capture the selected item value to preserve it when notes arrive
      const selectedItemValue = sel;
      const capturedSlotKey = slotKey;
      
      fetchDayNotes(API_BASE, dayIdx, city, vibe, snapshot)
        .then((notes) => {
          if (!notes) return;

          // Update plan while preserving the selected slot item
          const updated = plan.map((d: DayPlan) => ({ ...d }));
          // Restore the selected item in case plan changed
          (updated[dayIdx - 1] as any)[capturedSlotKey] = selectedItemValue;
          updated[dayIdx - 1].notes = notes;
          setPlan(updated);
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

  // Clear saved data and reset app state to defaults
  function handleClearSaved() {
    const ok = window.confirm('Clear saved trip and reset to defaults? This will remove saved city and plan from your browser.');
    if (!ok) return;
    // Clear all saved data
    localStorage.removeItem('saved-plan');
    localStorage.removeItem('travel-city');
    // Reset all state to defaults
    setCity('');
    setVibe('popular');
    setHotel(null);
    setDaysCount(3);
    setPlan(Array.from({ length: 3 }, () => ({} as DayPlan)));
    setCurrentDay(1);
    setShowSmartDefaults(true);
  }
  
  const handleShare = async () => {
    // Create a detailed itinerary text to share
    const itinerary = plan
      .map((day, i) => {
        const items = [
          day.hotel ? `🏨 ${day.hotel.name}` : null,
          day.breakfast ? `🍳 ${day.breakfast.name}` : null,
          day.activity ? `🎯 ${day.activity.name}` : null,
          day.activity2 ? `🎨 ${day.activity2.name}` : null,
          day.lunch ? `🍽️ ${day.lunch.name}` : null,
          day.coffee ? `☕ ${day.coffee.name}` : null,
          day.dinner ? `🍷 ${day.dinner.name}` : null,
          day.notes ? `📝 ${day.notes}` : null
        ].filter(Boolean).join('\n');
        return `Day ${i + 1}:\n${items}`;
      })
      .join('\n\n');
    
    const shareText = `${vibe.charAt(0).toUpperCase() + vibe.slice(1)} trip to ${city}\n\n${itinerary}`;
    
    if (navigator.share) {
      await navigator.share({
        title: `${vibe} trip to ${city}`,
        text: shareText
      });
    } else {
      // Copy detailed itinerary to clipboard
      navigator.clipboard.writeText(shareText);
      alert('Itinerary copied to clipboard!');
    }
  };
  
  const handlePrint = () => {
    // Create a print-friendly version of the plan
    const planHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${vibe} Trip to ${city}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; margin: 20px; }
            h1 { color: #333; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f0f0f0; padding: 12px; text-align: left; border: 1px solid #ddd; font-weight: bold; }
            td { padding: 12px; border: 1px solid #ddd; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            @media print { body { margin: 10px; } }
          </style>
        </head>
        <body>
          <h1>${vibe.charAt(0).toUpperCase() + vibe.slice(1)} Trip to ${city}</h1>
          <table>
            <thead>
              <tr>
                <th>Day</th>
                <th>Hotel</th>
                <th>Breakfast</th>
                <th>Morning Activity</th>
                <th>Afternoon Activity</th>
                <th>Lunch</th>
                <th>Coffee</th>
                <th>Dinner</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${plan.map((d, i) => `
                <tr>
                  <td><strong>Day ${i + 1}</strong></td>
                  <td>${d.hotel?.name || '—'}</td>
                  <td>${d.breakfast?.name || '—'}</td>
                  <td>${d.activity?.name || '—'}</td>
                  <td>${d.activity2?.name || '—'}</td>
                  <td>${d.lunch?.name || '—'}</td>
                  <td>${d.coffee?.name || '—'}</td>
                  <td>${d.dinner?.name || '—'}</td>
                  <td>${d.notes || '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    // Open in new window and print
    const printWindow = window.open('', '', 'width=1200,height=800');
    if (printWindow) {
      printWindow.document.write(planHTML);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };
    }
  };
  
  const handleAutoFill = async () => {
    if (!API_BASE) return;
    
    setLoadingProgress(0);
    const slots = ['hotel', 'breakfast', 'activity', 'activity2', 'lunch', 'coffee', 'dinner'];
    
    try {
      // Fetch more options to avoid duplicates
      const promises = slots.map(slot => {
        const params = new URLSearchParams({
          city, vibe, slot, limit: "5"
        });
        return fetchAllPlaces(API_BASE, params, 1).then(result => ({ slot, items: result.items }));
      });
      
      const results = await Promise.all(promises);
      
      const newPlan = [...plan];
      const usedNames = new Set<string>();
      
      results.forEach(({ slot, items }) => {
        // Allow activities to be duplicated, but avoid duplicates within meals
        const isMealSlot = ['breakfast', 'lunch', 'coffee', 'dinner'].includes(slot);
        
        // Find first item that hasn't been used (only check for meal slots)
        const availableItem = isMealSlot 
          ? items.find(item => !usedNames.has(item.name))
          : items[0]; // For activities, just take first item
          
        if (availableItem) {
          // Only add to usedNames if it's a meal slot
          if (isMealSlot) {
            usedNames.add(availableItem.name);
          }
          (newPlan[currentDay - 1] as any)[slot] = {
            name: availableItem.name,
            url: availableItem.url,
            area: availableItem.area,
            lat: availableItem.lat,
            lng: availableItem.lng,
            desc: availableItem.desc
          };
        }
      });
      
      setPlan(newPlan);
      setLoadingProgress(100);
      
      // Generate notes for the auto-filled day
      const dayIdx = currentDay;
      const snapshot = cloneDay(newPlan[dayIdx - 1]);
      
      fetchDayNotes(API_BASE, dayIdx, city, vibe, snapshot)
        .then((notes) => {
          if (!notes) return;
          
          const updated = [...newPlan];
          updated[dayIdx - 1].notes = notes;
          setPlan(updated);
        })
        .catch(() => {
          // ignore notes error
        });
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
          setCity={setCity}
          apiBase={API_BASE}
          onSampleItinerary={() => setShowSampleItinerary(true)}
        />
        
        {/* Route Optimization Panel */}
        {chosenItems.length > 2 && (
          <div className="rounded-2xl bg-white/90 backdrop-blur border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold">Rearrange Your Itinerary</div>
                <div className="text-xs text-slate-500">Minimize walking between activities</div>
              </div>
              <button
                onClick={() => setShowOptimization(!showOptimization)}
                className="px-3 py-1.5 rounded-lg border bg-white text-sm"
              >
                {showOptimization ? 'Hide' : 'See Suggestions'}
              </button>
            </div>
            
            {showOptimization && (() => {
              const optimization = optimizeRoute(
                chosenItems, 
                hotel ? { lat: hotel.lat!, lng: hotel.lng! } : undefined,
                "walk"
              );
              // Compute original route totals for a fair comparison
              const originalTotals = calculateRouteTotals(
                chosenItems,
                hotel ? { lat: hotel.lat!, lng: hotel.lng! } : undefined,
                "walk"
              );
              const savedMinutes = Math.max(0, Math.round(originalTotals.totalTime - optimization.totalTime));

              return (
                <div className="space-y-3">
                  <div className="text-sm bg-green-50 border border-green-200 rounded p-3 text-green-800">
                    💡 Rearranging in this order saves ~{savedMinutes} minutes of walking — {originalTotals.totalTime}min → {optimization.totalTime}min
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium mb-2 text-slate-700">Your Current Order:</div>
                      <div className="space-y-1">
                        {chosenItems.map((item, i) => (
                          <div key={i} className="text-slate-600">
                            {i + 1}. {item.name}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <div className="font-medium mb-2 text-slate-700">Suggested Order:</div>
                      <div className="space-y-1">
                        {optimization.optimizedOrder.map((item, i) => (
                          <div key={i} className="text-slate-600">
                            {i + 1}. {item.name}
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        Walking: {optimization.totalTime}min, {optimization.totalDistance}km
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
                    Use This Order
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
              onAutoFill={handleAutoFill}
              loadingProgress={loadingProgress}
            />
            
          </div>

          <MapPanel
            currentDay={currentDay}
            city={city}
            hotel={hotel}
            chosenItems={chosenItems}
            dirSegs={dirSegs}
            dirErr={dirErr}
          />
        </div>

        {/* Plan view */}
        <div className="rounded-2xl bg-white/90 backdrop-blur border p-4 shadow-sm" data-print-section>
          <div className="font-semibold mb-3">Plan View</div>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-4">Day</th>
                  <th className="py-2 pr-4">Hotel</th>
                    <th className="py-2 pr-4">Breakfast</th>
                    <th className="py-2 pr-4">Morning Activity</th>
                    <th className="py-2 pr-4">Afternoon Activity</th>
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
                      {d.hotel?.name || <span className="text-slate-400">—</span>}
                    </td>
                      <td className="py-2 pr-4">
                        {d.breakfast?.name || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="py-2 pr-4">
                        {d.activity?.name || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="py-2 pr-4">
                        {d.activity2?.name || <span className="text-slate-400">—</span>}
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
                    <td className="py-2 pr-4 max-w-[400px]" title={d.notes}>
                      <div className="line-clamp-3 text-slate-700 leading-relaxed">
                        {d.notes || <span className="text-slate-400">—</span>}
                      </div>
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
          onClearSaved={handleClearSaved}
        />
        
        {/* Sample Itinerary Modal */}
        {showSampleItinerary && (
          <SampleItinerary
            city={city}
            vibe={vibe}
            daysCount={daysCount}
            onClose={() => setShowSampleItinerary(false)}
            onApplyPlan={(newPlan) => {
              setPlan(newPlan);
              setShowSampleItinerary(false);
            }}
          />
        )}
        
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
