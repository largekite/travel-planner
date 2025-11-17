import React, { useState, useEffect } from "react";
import TopBar from "./components/TopBar";
import HotelSection from "./components/HotelSection";
import DayPlanner from "./components/DayPlanner";
import InteractiveMap from "./components/InteractiveMap";
import SuggestionModal from "./components/SuggestionModal";
import { Vibe, DayPlan, SelectedItem, SlotKey, ApiSuggestion } from "./lib/types";
import { detectApiBase, fetchPlaces } from "./lib/api";

export default function App() {
  const API_BASE = detectApiBase();
  const [country, setCountry] = useState("USA");
  const [city, setCity] = useState("St. Louis");
  const [vibe, setVibe] = useState<Vibe>("romantic");
  const [daysCount, setDaysCount] = useState(3);
  const [currentDay, setCurrentDay] = useState(1);
  const [plan, setPlan] = useState<DayPlan[]>(() => Array.from({ length: 3 }, () => ({})));
  const [hotel, setHotel] = useState<SelectedItem | null>(null);
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [slotKey, setSlotKey] = useState<SlotKey>("activity");
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [apiLatency, setApiLatency] = useState<number | null>(null);
  const [apiMsg, setApiMsg] = useState<string | null>(null);
  const [liveItems, setLiveItems] = useState<ApiSuggestion[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [areaFilter, setAreaFilter] = useState("");
  const [useNearFilter, setUseNearFilter] = useState(false);
  const [nearMode, setNearMode] = useState<"walk" | "drive">("walk");
  const [nearMaxMins, setNearMaxMins] = useState(15);
  const [sortMode, setSortMode] = useState<"default" | "distance" | "rating">("default");

  // API status check
  useEffect(() => {
    if (!API_BASE) {
      setApiOk(null);
      setApiMsg("API base not configured");
      return;
    }
    const ping = async () => {
      const start = performance.now();
      try {
        const r = await fetch(`${API_BASE}/api/places?city=test&slot=activity&limit=1`);
        const latency = Math.round(performance.now() - start);
        setApiLatency(latency);
        setApiOk(r.ok);
        setApiMsg(r.ok ? "OK" : `HTTP ${r.status}`);
      } catch (e: any) {
        setApiOk(false);
        setApiLatency(null);
        setApiMsg(String(e?.message || "error"));
      }
    };
    ping();
  }, [API_BASE]);

  function openSlot(slot: SlotKey) {
    setSlotKey(slot);
    setSlotModalOpen(true);
    fetchSuggestions(slot);
  }

  async function fetchSuggestions(slot: SlotKey) {
    if (!API_BASE) return;
    setLiveLoading(true);
    setLiveError(null);
    
    const params = new URLSearchParams({
      city,
      vibe,
      slot,
      limit: "10",
      near: String(useNearFilter),
      mode: nearMode,
      maxMins: String(nearMaxMins),
      lat: hotel?.lat ? String(hotel.lat) : "",
      lng: hotel?.lng ? String(hotel.lng) : "",
      area: areaFilter || "",
    });

    try {
      const { items } = await fetchPlaces(API_BASE, params);
      setLiveItems(items);
    } catch (err: any) {
      setLiveError(String(err?.message || err));
      setLiveItems([]);
    } finally {
      setLiveLoading(false);
    }
  }

  // Refetch when filters change
  useEffect(() => {
    if (slotModalOpen) {
      fetchSuggestions(slotKey);
    }
  }, [useNearFilter, nearMode, nearMaxMins, areaFilter, hotel?.lat, hotel?.lng]);

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

    if (slotKey === "hotel") {
      setHotel(sel);
      setSlotModalOpen(false);
      return;
    }

    setPlan((prev) => {
      const next = prev.map((d) => ({ ...d }));
      const idx = currentDay - 1;
      (next[idx] as any)[slotKey] = sel;
      return next;
    });

    setSlotModalOpen(false);
  }

  function clearDay(dayIndex1Based: number) {
    setPlan((prev) => {
      const next = prev.map((d) => ({ ...d }));
      next[dayIndex1Based - 1] = {};
      return next;
    });
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
          
          <div className="bg-white/90 backdrop-blur rounded-2xl border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Map - Day {currentDay}</div>
            </div>
            <InteractiveMap
              hotel={hotel ? { name: hotel.name, lat: hotel.lat, lng: hotel.lng, area: hotel.area, url: hotel.url } : null}
              places={[]}
              mode="WALKING"
              showRoute={true}
            />
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
        />
      </div>
    </div>
  );
}