import React, { useEffect, useState } from "react";
import { Search, Crosshair, Hotel } from "lucide-react";
import { SelectedItem, ApiSuggestion } from "../lib/types";

type Props = {
  city: string;
  hotel: SelectedItem | null;
  setHotel: (h: SelectedItem | null) => void;
  apiBase: string;
};

export default function HotelSection({
  city,
  hotel,
  setHotel,
  apiBase,
}: Props) {
  const [hotelQuery, setHotelQuery] = useState("");
  const [hotelSugs, setHotelSugs] = useState<ApiSuggestion[]>([]);
  const [hotelLoading, setHotelLoading] = useState(false);
  const [hotelError, setHotelError] = useState<string | null>(null);

  // inline search
  useEffect(() => {
    if (!apiBase) return;
    const q = hotelQuery.trim();
    if (q.length < 2) {
      setHotelSugs([]);
      setHotelLoading(false);
      setHotelError(null);
      return;
    }
    const abort = new AbortController();
    const params = new URLSearchParams({
      q: `hotel search ${q} in ${city}`,
      city,
      slot: "hotel",
      limit: "8",
    });
    setHotelLoading(true);
    fetch(`${apiBase}/api/places?${params.toString()}`, {
      signal: abort.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        setHotelSugs(data.items || []);
      })
      .catch((err) => {
        if ((err as any).name !== "AbortError") {
          setHotelError(String(err?.message || err));
        }
      })
      .finally(() => setHotelLoading(false));
    return () => abort.abort();
  }, [apiBase, hotelQuery, city]);

  function useMyLocation() {
    if (typeof window === "undefined") {
      setHotelError("Location not available.");
      return;
    }
    if (!("geolocation" in navigator)) {
      setHotelError("Your browser doesn’t support geolocation.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setHotel({
          name: "My location",
          area: "current location",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          desc: "Browser-provided location",
        });
        setHotelError(null);
      },
      (err) => {
        setHotelError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was blocked."
            : err.message || "Failed to get location."
        );
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  return (
    <div className="rounded-2xl bg-white/90 backdrop-blur border p-4 shadow-sm">
      <div className="font-semibold mb-2">Hotel / Area</div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex items-center gap-2 text-sm">
            <span className="text-slate-600">Search</span>
            <div className="flex items-center gap-2 border rounded-lg px-2 py-1 w-[320px] bg-white">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                value={hotelQuery}
                onChange={(e) => setHotelQuery(e.target.value)}
                placeholder="e.g., Marriott, Union Station"
                className="outline-none w-full"
              />
            </div>
          </div>
          <button
            onClick={useMyLocation}
            className="px-3 py-2 rounded-lg border flex items-center gap-2 bg-white hover:bg-slate-50"
          >
            <Crosshair className="w-4 h-4" /> Use my location
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {apiBase ? null : "API not configured"}
          </div>
        </div>
        {(hotelLoading || hotelError || hotelSugs.length > 0) && (
          <div className="border rounded-xl p-2 bg-slate-50 max-h-56 overflow-auto">
            <div className="text-xs text-slate-500 mb-1">
              {hotelLoading
                ? "Searching…"
                : hotelError
                ? hotelError
                : "Matches"}
            </div>
            {hotelSugs.map((h, i) => (
              <button
                key={i}
                onClick={() => {
                  setHotel({
                    name: h.name,
                    url: h.url,
                    area: h.area,
                    lat: h.lat,
                    lng: h.lng,
                    desc: h.desc,
                  });
                  setHotelQuery(h.name);
                }}
                className="w-full text-left py-2 px-2 hover:bg-white rounded-lg"
              >
                <div className="font-medium">{h.name}</div>
                <div className="text-xs text-slate-600">
                  {[h.area, h.desc].filter(Boolean).join(" · ")}
                </div>
              </button>
            ))}
            {!hotelLoading && !hotelError && hotelSugs.length === 0 && (
              <div className="text-xs text-slate-500 py-2 px-2">
                No matches yet.
              </div>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {hotel?.name ? (
            <div className="text-sm">
              Selected: <span className="font-medium">{hotel.name}</span>
              {hotel.area ? (
                <span className="text-slate-500"> · {hotel.area}</span>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-slate-500">None selected</div>
          )}
          {hotel?.lat && hotel?.lng ? (
            <div className="text-xs text-slate-500">
              ({hotel.lat.toFixed(4)}, {hotel.lng.toFixed(4)})
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
