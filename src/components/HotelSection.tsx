// src/components/HotelSection.tsx
import { useState } from "react";
import { Search, Crosshair, Hotel } from "lucide-react";
import { SelectedItem } from "../lib/types";

type Props = {
  city: string;
  hotel: SelectedItem | null;
  setHotel: (h: SelectedItem | null) => void;
  setCity: (city: string) => void;
  apiBase: string;
  onSampleItinerary?: () => void;
};

export default function HotelSection({
  city,
  hotel,
  setHotel,
  setCity,
  apiBase,
  onSampleItinerary,
}: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SelectedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

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
        Hotel / Base
      </div>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="flex items-center gap-2 border rounded-lg px-2 py-1 bg-white flex-1 min-w-[220px] max-w-xs">
          <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <input
            value={query}
            onChange={async (e) => {
              const value = e.target.value;
              setQuery(value);
              const suggestions = await fetchLocationSuggestions(value);
              setSuggestions(suggestions);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') searchHotels(query);
            }}
            placeholder="Search for a hotel or area…"
            className="outline-none w-full text-sm"
            aria-label="Search hotels or areas"
          />
        </div>
        <button
          onClick={() => searchHotels(query)}
          disabled={loading || query.trim().length < 3}
          className="px-3 py-2 rounded-lg border bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          type="button"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
        <button
          onClick={handleUseMyLocation}
          className="px-3 py-2 rounded-lg border flex items-center gap-2 bg-white hover:bg-slate-50 text-sm"
          type="button"
        >
          <Crosshair className="w-4 h-4" /> Use my location
        </button>
        {onSampleItinerary && (
          <button
            onClick={onSampleItinerary}
            className="px-3 py-2 rounded-lg border flex items-center gap-2 bg-white hover:bg-slate-50 text-sm"
            type="button"
          >
            Sample Itinerary
          </button>
        )}
      </div>
      {error && <div className="text-xs text-amber-700 mb-2">{error}</div>}
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
                setQuery(h.name);
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
      {hotel && (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <span className="text-slate-500">Selected:</span>
          <span className="font-medium">{hotel.name}</span>
          {hotel.area && <span className="text-slate-400">· {hotel.area}</span>}
          <button
            onClick={() => { setHotel(null); setQuery(""); }}
            className="ml-auto text-xs text-slate-400 hover:text-rose-500 transition-colors"
            aria-label="Clear selected hotel"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
