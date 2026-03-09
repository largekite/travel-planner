import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import Toast, { type ToastData } from "./components/Toast";
import { useSwipeable } from 'react-swipeable';
import TopBar from "./components/TopBar";
import SuggestionModal from "./components/SuggestionModal";
import MapPanel from "./components/MapPanel";
import Footer from "./components/Footer";
import ViewToggle from "./components/ViewToggle";
import {
  DayPlan,
  SelectedItem,
  SlotKey,
  Vibe,
  Budget,
  ApiSuggestion,
  DirectionsSegment,
} from "./lib/types";
import {
  fetchAllPlaces,
  fetchDayNotes,
  fetchDirections,
  detectApiBase,
} from "./lib/api";
import RouteOptimizerPanel from "./components/RouteOptimizer";
import PDFExportModal from "./components/PDFExportModal";
import ErrorBoundary from "./components/ErrorBoundary";
import PlaceDetails from "./components/PlaceDetails";
import QuickActionsToolbar from "./components/QuickActionsToolbar";
import SmartDefaults from "./components/SmartDefaults";
import DragDropDayPlanner from "./components/DragDropDayPlanner";
import ProgressIndicator from "./components/ProgressIndicator";
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
  const [city, setCity] = useState("");
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
  const [budget, setBudget] = useState<Budget>('moderate');
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  
  // Load saved plan from localStorage
  const planHistory = useHistory<DayPlan[]>(Array.from({ length: 3 }, () => ({} as DayPlan)));
  const plan = planHistory.currentState;
  const setPlan = planHistory.pushState;
  
  // hotel / center — restore from localStorage on startup
  const [hotel, setHotel] = useState<SelectedItem | null>(() => {
    const saved = localStorage.getItem('saved-plan');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.hotel) return data.hotel;
      } catch {}
    }
    return null;
  });
  
  // UI state
  const [showSmartDefaults, setShowSmartDefaults] = useState(!city || city === "");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [showSampleItinerary, setShowSampleItinerary] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  
  // Online status
  const isOnline = useOnline();



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

  // detail modal for map items
  const [detailItem, setDetailItem] = useState<SelectedItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState<ToastData | null>(null);
  const showToast = (message: string, type: ToastData['type'] = 'success') =>
    setToast({ message, type });
  
  // Swipe gestures for mobile (touch only — trackMouse causes accidental day switches)
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => setCurrentDay(Math.min(daysCount, currentDay + 1)),
    onSwipedRight: () => setCurrentDay(Math.max(1, currentDay - 1)),
    trackMouse: false
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

  // Sync global hotel from current day's plan when switching days
  useEffect(() => {
    const dayHotel = currentDayData.hotel;
    if (dayHotel?.lat && dayHotel?.lng) {
      setHotel(dayHotel);
    }
  }, [currentDay]);


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
      photo: item.photos?.[0],
      placeId: item.placeId,
      googleRating: item.ratings?.google,
      googleReviews: item.ratings?.googleReviews,
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
    budget,
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
    .then(({ items }) => {
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
  budget,
  useNearFilter,
  nearMode,
  nearMaxMins,
  hotel?.lat,
  hotel?.lng,
  areaFilter,
  API_BASE,
]);



  // Enhanced actions
  const handleSave = (silent = false) => {
    const planData = { plan, city, vibe, daysCount, hotel };
    localStorage.setItem('saved-plan', JSON.stringify(planData));
    localStorage.setItem('travel-city', city);
    if (!silent) showToast('Plan saved!');
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
      showToast('Itinerary copied to clipboard!', 'info');
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
    if (!API_BASE) { showToast('API not available', 'error'); return; }
    if (!city) { showToast('Pick a city first', 'error'); return; }

    setLoadingProgress(10);

    // If the user already has a hotel (global or current day), keep it
    const existingHotel = currentDayData.hotel || hotel;
    const slotsToFetch = existingHotel
      ? ['breakfast', 'activity', 'activity2', 'lunch', 'coffee', 'dinner']
      : ['hotel', 'breakfast', 'activity', 'activity2', 'lunch', 'coffee', 'dinner'];

    try {
      // Fetch more options to avoid duplicates
      const promises = slotsToFetch.map(slot => {
        const params = new URLSearchParams({
          city, vibe, slot, limit: "5", budget
        });
        return fetchAllPlaces(API_BASE, params, 1).then(result => ({ slot, items: result.items }));
      });

      const results = await Promise.all(promises);

      const newPlan = [...plan];
      const usedNames = new Set<string>();

      // Preserve existing hotel
      if (existingHotel) {
        (newPlan[currentDay - 1] as any).hotel = existingHotel;
      }

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
            cuisine: availableItem.cuisine,
            price: availableItem.price,
            lat: availableItem.lat,
            lng: availableItem.lng,
            desc: availableItem.desc,
            placeId: availableItem.placeId,
            photo: availableItem.photos?.[0],
            googleRating: availableItem.ratings?.google,
            googleReviews: availableItem.ratings?.googleReviews,
          } satisfies SelectedItem;
        }
      });

      // Sync global hotel from newly fetched hotel if we didn't have one
      if (!existingHotel) {
        const fetchedHotel = (newPlan[currentDay - 1] as any).hotel;
        if (fetchedHotel?.lat && fetchedHotel?.lng) {
          setHotel(fetchedHotel);
        }
      }

      setPlan(newPlan);
      setLoadingProgress(100);
      showToast('Day auto-filled!');

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
      showToast('Auto-fill failed — check API connection', 'error');
    }
    
    setTimeout(() => setLoadingProgress(0), 1000);
  };
  
  // Keyboard shortcuts
  useKeyboard({
    z: planHistory.undo,
    y: planHistory.redo,
    s: () => handleSave(false),
    p: handlePrint
  });


  
  // Auto-save (silent)
  useEffect(() => {
    const timer = setTimeout(() => handleSave(true), 2000);
    return () => clearTimeout(timer);
  }, [plan, city, vibe, hotel]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-b from-sky-50 via-indigo-50 to-white p-6 pb-24" {...swipeHandlers}>
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
          budget={budget}
          setBudget={setBudget}
          hotel={hotel}
          setHotel={(h) => {
            setHotel(h);
            if (h) {
              const next = plan.map((d) => ({ ...d }));
              next[currentDay - 1].hotel = h;
              setPlan(next);
            }
          }}
          apiBase={API_BASE}
          plan={plan}
          onUseForAllDays={(h) => {
            const next = plan.map((d) => ({ ...d, hotel: h }));
            setPlan(next);
            showToast(`"${h.name}" set as hotel for all ${daysCount} days`);
          }}
          onSampleItinerary={() => setShowSampleItinerary(true)}
        />

        {/* Smart Defaults (first-time setup) */}
        {showSmartDefaults && (
          <div className="rounded-2xl bg-white/90 backdrop-blur border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">Quick Start</h2>
              <button onClick={() => setShowSmartDefaults(false)} className="text-slate-400 hover:text-slate-600 text-sm">×</button>
            </div>
            <SmartDefaults
              onCitySelect={(newCity) => {
                setCity(newCity);
                setHotel(null);
                setPlan(Array.from({ length: daysCount }, () => ({} as DayPlan)));
                setShowSmartDefaults(false);
              }}
              onVibeSelect={setVibe}
              onQuickFill={handleAutoFill}
            />
          </div>
        )}

        <div className="grid lg:grid-cols-[3fr_2fr] gap-4">
          <div className={`space-y-4 ${mobileView === 'map' ? 'hidden lg:block' : ''}`}>
            <DragDropDayPlanner
              currentDay={currentDay}
              plan={plan}
              setPlan={setPlan}
              openSlot={(slot: string) => openSlot(slot as SlotKey)}
              onAutoFill={handleAutoFill}
              loadingProgress={loadingProgress}
              city={city}
              vibe={vibe}
              daysCount={daysCount}
            />

            {/* Route Optimization (inside left column, below planner) */}
            <RouteOptimizerPanel
              chosenItems={chosenItems}
              hotel={hotel}
              onApply={(optimizedOrder) => {
                const dayData = { ...currentDayData };
                const slots = ['breakfast', 'activity', 'lunch', 'activity2', 'coffee', 'dinner'] as const;
                slots.forEach(slot => delete dayData[slot]);
                optimizedOrder.forEach((item, i) => {
                  if (slots[i]) dayData[slots[i]] = item;
                });
                const next = [...plan];
                next[currentDay - 1] = dayData;
                setPlan(next);
              }}
              onToast={(msg) => showToast(msg, 'info')}
            />
          </div>

          <div className={`${mobileView === 'list' ? 'hidden lg:block' : ''}`}>
            <div className="lg:sticky lg:top-4">
            <MapPanel
              currentDay={currentDay}
              city={city}
              hotel={hotel}
              chosenItems={chosenItems}
              dirSegs={dirSegs}
              dirErr={dirErr}
              onItemClick={(item) => {
                setDetailItem(item);
                setShowDetailModal(true);
              }}
            />
            </div>
          </div>
        </div>

        {/* Mobile View Toggle */}
        <ViewToggle view={mobileView} onViewChange={setMobileView} />

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
          budget={budget}
          setBudget={setBudget}
          city={city}
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
          onExportPDF={() => setShowPDFModal(true)}
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
              // Sync global hotel from day 1's hotel (or first day that has one)
              const firstHotel = newPlan.find(d => d.hotel?.lat && d.hotel?.lng)?.hotel;
              if (firstHotel) setHotel(firstHotel);
              setShowSampleItinerary(false);
              showToast('Sample itinerary applied!');
            }}
            onToast={(msg) => showToast(msg, 'info')}
          />
        )}
        
        {/* Help Modal */}
        {showHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowHelp(false)}>
            <div className="bg-white rounded-2xl p-6 max-w-lg mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold text-lg mb-4">How to use Travel Planner</h3>

              {/* Getting started steps */}
              <div className="mb-5">
                <div className="text-sm font-medium text-slate-700 mb-2">Getting Started</div>
                <div className="space-y-2">
                  {[
                    { step: '1', text: 'Pick a city from Quick Start or type one in' },
                    { step: '2', text: 'Choose your trip vibe and budget level' },
                    { step: '3', text: 'Set number of days for your trip' },
                    { step: '4', text: 'Select a hotel/base to center your search' },
                    { step: '5', text: 'Fill each time slot or use Auto-fill' },
                    { step: '6', text: 'Optimize your route to save walking time' },
                    { step: '7', text: 'Export as PDF, print, or share your plan' },
                  ].map(({ step, text }) => (
                    <div key={step} className="flex items-start gap-3 text-sm">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{step}</span>
                      <span className="text-slate-600">{text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div className="mb-5">
                <div className="text-sm font-medium text-slate-700 mb-2">Features</div>
                <div className="space-y-1.5 text-sm text-slate-600">
                  <p>- Click time slots to browse and add places</p>
                  <p>- Use "Copy day" to duplicate a day's plan</p>
                  <p>- Click the refresh icon to get a different suggestion</p>
                  <p>- Use filters (area, distance, budget) to refine results</p>
                  <p>- Compare places side-by-side before choosing</p>
                  <p>- Route optimization rearranges stops to save walking</p>
                  <p>- Swipe left/right on mobile to change days</p>
                </div>
              </div>

              {/* Keyboard Shortcuts */}
              <div className="mb-5">
                <div className="text-sm font-medium text-slate-700 mb-2">Keyboard Shortcuts</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    { keys: 'Ctrl + Z', action: 'Undo' },
                    { keys: 'Ctrl + Y', action: 'Redo' },
                    { keys: 'Ctrl + S', action: 'Save' },
                    { keys: 'Ctrl + P', action: 'Print' },
                  ].map(({ keys, action }) => (
                    <div key={keys} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-slate-600">{action}</span>
                      <kbd className="px-2 py-0.5 rounded bg-slate-200 text-xs font-mono text-slate-700">{keys}</kbd>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowHelp(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 w-full"
              >
                Got it!
              </button>
            </div>
          </div>
        )}
        
        {/* Place details modal from map click */}
        {showDetailModal && detailItem && (
          <PlaceDetails
            place={detailItem}
            onClose={() => {
              setShowDetailModal(false);
              setDetailItem(null);
            }}
          />
        )}

        </div>

        {/* Footer */}
        <Footer />
      </div>

      {/* PDF Export Modal */}
      {showPDFModal && (
        <PDFExportModal
          plan={plan}
          city={city}
          vibe={vibe}
          onClose={() => setShowPDFModal(false)}
          onToast={(msg, type) => showToast(msg, type)}
        />
      )}

      {/* Toast notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </ErrorBoundary>
  );
}
