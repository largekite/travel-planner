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
      q: `Suggest top ${slotKey} places in ${city} for a ${vibe} vibe`,
    });

    const url = `${API_BASE}/api/places?${params.toString()}`;
    setLastFetchUrl(url);

    fetchPlaces(API_BASE, params, ctrl.signal)
      .then((items) => {
        let sorted = items;
        if (sortMode === "rating") {
          sorted = [...items].sort(
            (a, b) => (b.ratings?.google || 0) - (a.ratings?.google || 0)
          );
        } else if (sortMode === "distance") {
          sorted = [...items].sort((a, b) => {
            const am = a.meta?.match(/(\d+)\s*min/)?.[1];
            const bm = b.meta?.match(/(\d+)\s*min/)?.[1];
            if (am && bm) return Number(am) - Number(bm);
            return 0;
          });
        }
        setLiveItems(sorted);
        setLastResultCount(sorted.length);
        setLiveError(null);
      })
      .catch((err) => {
        if ((err as any).name !== "AbortError") {
          setLiveError(String(err?.message || err));
        }
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
    sortMode,
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

        <div className="grid lg:grid-cols-2 gap-5">
          <DayPlanner
            currentDay={currentDay}
            plan={plan}
            openSlot={openSlot}
            clearDay={clearDay}
            setPlan={setPlan}
          />

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
