// src/components/HotelSection.tsx
import React, { useState } from "react";
import { Search, Crosshair, Hotel } from "lucide-react";
import { SelectedItem } from "../lib/types";

type Props = {
  city: string;
  hotel: SelectedItem | null;
  setHotel: (h: SelectedItem | null) => void;
  setCity: (city: string) => void;
  apiBase: string;
};

export default function HotelSection({
  city,
  hotel,
  setHotel,
  setCity,
  apiBase,
}: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SelectedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  async function fetchLocationSuggestions(query: string) {
    if (query.length < 3) return [];
    try {
      const response = await fetch(
        `${apiBase}/api/autocomplete?input=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      return data.predictions || [];
    } catch {
      return [];
    }
  }

  async function searchHotels(q: string) {
    if (!apiBase) {
      setError("API not configured");
      return;
    }
    if (q.trim().length < 3) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      area: q,
      city,
      slot: "hotel",
      limit: "6",
    });
    try {
      const r = await fetch(`${apiBase}/api/places?${params.toString()}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const items: SelectedItem[] = (data.items || data.results || []).map(
        (it: any) => ({
          name: it.name,
          url: it.url,
          area: it.area,
          lat: it.lat || it.geometry?.location?.lat,
          lng: it.lng || it.geometry?.location?.lng,
          desc: it.desc,
        })
      );
      setResults(items);
    } catch (e: any) {
      setError(e?.message || "search failed");
    } finally {
      setLoading(false);
    }
  }

  function handleUseMyLocation() {
    if (!("geolocation" in navigator)) {
      setError("Geolocation not available");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setHotel({
          name: "My location",
          area: city,
          lat: latitude,
          lng: longitude,
          desc: "Browser location",
        });
      },
      (err) => {
        setError(err?.message || "Failed to get location");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  return (
    <div className="rounded-2xl bg-white border p-4">
      <div className="font-semibold mb-2 flex items-center gap-2">
        <Hotel className="w-4 h-4" />
        Trip Location
      </div>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="flex items-center gap-2 border rounded-lg px-2 py-1 w-[320px] bg-white">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            value={query}
            onChange={async (e) => {
              const value = e.target.value;
              setQuery(value);
              
              // Only fetch location suggestions, don't auto-search hotels
              const suggestions = await fetchLocationSuggestions(value);
              setSuggestions(suggestions);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (searchTimeout) clearTimeout(searchTimeout);
                searchHotels(query);
              }
            }}
            placeholder="Search for hotels/areas or press Enter"
            className="outline-none w-full text-sm"
          />
        </div>
        <button
          onClick={handleUseMyLocation}
          className="px-3 py-2 rounded-lg border flex items-center gap-2 bg-white hover:bg-slate-50 text-sm"
          type="button"
        >
          <Crosshair className="w-4 h-4" /> Use my location
        </button>
      </div>
      {error && <div className="text-xs text-amber-700 mb-2">{error}</div>}
      {loading && <div className="text-xs text-slate-500">Searching…</div>}
      {suggestions.length > 0 && (
        <div className="border rounded-xl p-2 bg-blue-50 mb-2">
          <div className="text-xs text-blue-700 mb-1">Did you mean:</div>
          {suggestions.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => {
                setQuery(suggestion);
                setSuggestions([]);
                setCity(suggestion);
              }}
              className="block w-full text-left py-1 px-2 hover:bg-blue-100 rounded text-sm"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
      {results.length > 0 && (
        <div className="border rounded-xl p-2 bg-slate-50 max-h-48 overflow-auto">
          {results.map((h, i) => (
            <button
              key={i}
              onClick={() => {
                setHotel(h);
                setResults([]);
              }}
              className="w-full text-left py-2 px-2 hover:bg-white rounded-lg"
            >
              <div className="font-medium">{h.name}</div>
              <div className="text-xs text-slate-600">
                {[h.area, h.desc].filter(Boolean).join(" · ")}
              </div>
            </button>
          ))}
        </div>
      )}
      <div className="mt-2 text-sm">
        Selected:{" "}
        {hotel ? (
          <>
            <span className="font-medium">{hotel.name}</span>
            {hotel.area ? <span className="text-slate-500"> · {hotel.area}</span> : null}
            {hotel.lat && hotel.lng ? (
              <span className="text-slate-400">
                {" "}
                ({hotel.lat.toFixed(4)}, {hotel.lng.toFixed(4)})
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-slate-400">none</span>
        )}
      </div>
    </div>
  );
}