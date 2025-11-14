import React, { useMemo, useState } from "react";
import { X, Footprints, Car, ExternalLink, Map as MapIcon, List } from "lucide-react";
import { ApiSuggestion, SelectedItem } from "../lib/types";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useLoadScript,
  DirectionsService,
  DirectionsRenderer,
} from "@react-google-maps/api";

/** Mini haversine used for client-side distance sort */
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(la1) * Math.cos(la2);
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return R * c;
}

type Props = {
  open: boolean;
  onClose: () => void;
  slotKey: string;
  areaFilter: string;
  setAreaFilter: (s: string) => void;
  useNearFilter: boolean;
  setUseNearFilter: (b: boolean) => void;
  nearMode: "walk" | "drive";
  setNearMode: (m: "walk" | "drive") => void;
  nearMaxMins: number;
  setNearMaxMins: (n: number) => void;
  hotel: SelectedItem | null;
  items: ApiSuggestion[];
  loading: boolean;
  error: string | null;
  onChoose: (i: ApiSuggestion) => void;
  sortMode: "default" | "distance" | "rating";
  setSortMode: (m: "default" | "distance" | "rating") => void;
  lastFetchUrl?: string;
  lastResultCount?: number;
};

export default function SuggestionModal({
  open,
  onClose,
  slotKey,
  areaFilter,
  setAreaFilter,
  useNearFilter,
  setUseNearFilter,
  nearMode,
  setNearMode,
  nearMaxMins,
  setNearMaxMins,
  hotel,
  items,
  loading,
  error,
  onChoose,
  sortMode,
  setSortMode,
  lastFetchUrl,
  lastResultCount,
}: Props) {
  if (!open) return null;

  const [view, setView] = useState<"list" | "map">("list");

  // Actually sort the incoming items for display
  const sortedItems = useMemo(() => {
    if (sortMode === "default") return items;

    if (sortMode === "rating") {
      return [...items].sort((a, b) => {
        const ra = a.ratings?.google ?? 0;
        const rb = b.ratings?.google ?? 0;
        return rb - ra;
      });
    }

    if (sortMode === "distance" && hotel?.lat && hotel?.lng) {
      return [...items].sort((a, b) => {
        if (!a.lat || !a.lng || !b.lat || !b.lng) return 0;
        const da = haversineKm(hotel.lat!, hotel.lng!, a.lat, a.lng);
        const db = haversineKm(hotel.lat!, hotel.lng!, b.lat, b.lng);
        return da - db;
      });
    }

    return items;
  }, [items, sortMode, hotel?.lat, hotel?.lng]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-[min(900px,96vw)] max-h-[90vh] overflow-hidden flex flex-col">
        {/* header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
          <div className="font-semibold capitalize">Choose {slotKey}</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("list")}
              className={`px-2 py-1 rounded border text-xs flex items-center gap-1 ${
                view === "list" ? "bg-slate-800 text-white" : "bg-white text-slate-700"
              }`}
              type="button"
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button
              onClick={() => setView("map")}
              className={`px-2 py-1 rounded border text-xs flex items-center gap-1 ${
                view === "map" ? "bg-slate-800 text-white" : "bg-white text-slate-700"
              }`}
              type="button"
            >
              <MapIcon className="w-3.5 h-3.5" /> Map
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-slate-100"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* body */}
        <div className="p-4 flex-1 flex flex-col gap-4 overflow-hidden">
          {/* filters */}
          <div className="rounded-xl border p-3 bg-slate-50 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-600">Area / neighborhood</span>
                <input
                  value={areaFilter}
                  onChange={(e) => setAreaFilter(e.target.value)}
                  placeholder="e.g., Wildwood, Tower Grove"
                  className="border rounded-lg p-1 text-sm"
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useNearFilter}
                  onChange={(e) => setUseNearFilter(e.target.checked)}
                />
                Filter by near me
              </label>

              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => setNearMode("walk")}
                  className={`px-2 py-1 rounded border text-xs ${
                    nearMode === "walk"
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white"
                  }`}
                  type="button"
                >
                  <Footprints className="inline w-3.5 h-3.5 mr-1" />
                  Walk
                </button>
                <button
                  onClick={() => setNearMode("drive")}
                  className={`px-2 py-1 rounded border text-xs ${
                    nearMode === "drive"
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white"
                  }`}
                  type="button"
                >
                  <Car className="inline w-3.5 h-3.5 mr-1" />
                  Drive
                </button>
              </div>

              <div className="text-xs text-slate-600">
                Max minutes: {nearMaxMins}
              </div>
              <input
                type="range"
                min={5}
                max={30}
                value={nearMaxMins}
                onChange={(e) => setNearMaxMins(parseInt(e.target.value))}
              />

              {!hotel && useNearFilter && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                  Pick a hotel/center or use your current location to enable
                  near-me filter.
                </div>
              )}
            </div>

            {/* sort + debug */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Sort:</span>
              {(["default", "rating", "distance"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSortMode(mode)}
                  className={`px-2 py-1 rounded border ${
                    sortMode === mode
                      ? "bg-slate-800 text-white"
                      : "bg-white text-slate-700"
                  }`}
                  type="button"
                >
                  {mode}
                </button>
              ))}
            </div>
            {lastFetchUrl && (
              <div className="text-[10px] text-slate-400 break-all">
                last request: {lastFetchUrl}
              </div>
            )}
            {typeof lastResultCount === "number" && (
              <div className="text-[10px] text-slate-400">
                {lastResultCount} result(s)
              </div>
            )}
          </div>

          {/* content */}
          {view === "list" ? (
            <ListView
              items={sortedItems}
              loading={loading}
              error={error}
              onChoose={onChoose}
            />
          ) : (
            <MapView
              items={sortedItems}
              hotel={hotel}
              mode={nearMode === "walk" ? "WALKING" : "DRIVING"}
              onChoose={onChoose}
              slotKey={slotKey}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** Scrollable list view — shows link, meta, ratings, etc. */
function ListView({
  items,
  loading,
  error,
  onChoose,
}: {
  items: ApiSuggestion[];
  loading: boolean;
  error: string | null;
  onChoose: (i: ApiSuggestion) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto border rounded-lg bg-white/60 divide-y">
      {error && <div className="text-amber-700 text-sm p-3">{error}</div>}
      {loading && (
        <div className="text-sm text-slate-500 p-3">Loading suggestions…</div>
      )}
      {!loading && items.length === 0 && !error && (
        <div className="text-sm text-slate-500 p-3">
          No matches. Try removing area or near-me filter.
        </div>
      )}

      {items.map((it, idx) => (
        <div
          key={idx}
          className="py-3 px-3 flex items-start justify-between gap-3 hover:bg-slate-50"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {it.url ? (
                <a
                  href={it.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-blue-700 hover:underline truncate max-w-[360px]"
                  title={it.name}
                >
                  {idx + 1}. {it.name}
                </a>
              ) : (
                <div className="font-medium truncate max-w-[360px]">
                  {idx + 1}. {it.name}
                </div>
              )}
              {it.url && (
                <a
                  href={it.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-slate-700"
                  title="Open link"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            <div className="text-xs text-slate-500">
              {[it.cuisine, it.price, it.area].filter(Boolean).join(" · ")}
            </div>
            {it.desc && (
              <div className="text-xs text-slate-600 mt-0.5">{it.desc}</div>
            )}
            {it.meta && (
              <div className="text-[11px] text-slate-500 mt-0.5">{it.meta}</div>
            )}
            {(it.ratings?.google || it.ratings?.googleReviews) && (
              <div className="text-[11px] text-slate-500 mt-0.5 flex gap-2 flex-wrap">
                {it.ratings?.google && (
                  <span>Google {it.ratings.google.toFixed(1)}</span>
                )}
                {typeof it.ratings?.googleReviews === "number" && (
                  <span>{it.ratings.googleReviews.toLocaleString()} reviews</span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => onChoose(it)}
            className="px-3 py-1.5 rounded-lg border bg-indigo-50 hover:bg-indigo-100 text-sm whitespace-nowrap"
            type="button"
          >
            Use
          </button>
        </div>
      ))}
    </div>
  );
}

/** Google Map view inside the modal — shows current suggestions + hotel and lets you pick from the InfoWindow */
function MapView({
  items,
  hotel,
  mode,
  onChoose,
  slotKey,
}: {
  items: ApiSuggestion[];
  hotel: SelectedItem | null;
  mode: "WALKING" | "DRIVING";
  onChoose: (i: ApiSuggestion) => void;
  slotKey: string;
}) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || "",
    libraries: ["places"],
  });

  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directions, setDirections] =
    useState<google.maps.DirectionsResult | null>(null);
  const [directionsError, setDirectionsError] = useState<string | null>(null);

  const valid = items.filter((p) => p.lat != null && p.lng != null);
  const fallback = { lat: 38.627, lng: -90.1994 }; // STL-ish

  const center =
    hotel?.lat && hotel?.lng
      ? { lat: hotel.lat, lng: hotel.lng }
      : valid[0]
      ? { lat: valid[0].lat!, lng: valid[0].lng! }
      : fallback;

  // Fit bounds when loaded
  const fit = () => {
    if (!map) return;
    const b = new google.maps.LatLngBounds();
    let added = false;

    if (hotel?.lat && hotel?.lng) {
      b.extend(new google.maps.LatLng(hotel.lat, hotel.lng));
      added = true;
    }
    valid.forEach((p) => {
      b.extend(new google.maps.LatLng(p.lat!, p.lng!));
      added = true;
    });
    if (added) map.fitBounds(b, 48);
  };

  // recompute route whenever items change (2+ only)
  const origin = valid[0];
  const destination = valid[valid.length - 1];
  const waypoints =
    valid.length > 2
      ? valid.slice(1, -1).map((p) => ({
          location: { lat: p.lat!, lng: p.lng! },
          stopover: true,
        }))
      : [];

  const travelMode: google.maps.TravelMode =
    mode === "WALKING" ? google.maps.TravelMode.WALKING : google.maps.TravelMode.DRIVING;

  if (loadError)
    return (
      <div className="text-sm text-rose-700">
        Map failed to load: {String(loadError)}
      </div>
    );

  if (!apiKey) {
    return (
      <div className="text-sm text-amber-700">
        Missing <code>VITE_GOOGLE_MAPS_API_KEY</code>. Add it to your env to use the map view.
      </div>
    );
  }

  if (!isLoaded) {
    return <div className="text-sm text-slate-600">Loading map…</div>;
  }

  return (
    <div className="rounded-lg overflow-hidden border" style={{ height: 420 }}>
      <GoogleMap
        onLoad={(m) => {
          setMap(m);
          // fit after first load
          setTimeout(fit, 0);
        }}
        center={center}
        zoom={12}
        mapContainerStyle={{ width: "100%", height: "100%" }}
        options={{ disableDefaultUI: false, clickableIcons: true }}
      >
        {/* hotel */}
        {hotel?.lat && hotel?.lng && (
          <Marker
            position={{ lat: hotel.lat, lng: hotel.lng }}
            label={{ text: "H", color: "#000", fontSize: "12px", fontWeight: "700" }}
            icon={{
              path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              scale: 6,
              fillColor: "#f59e0b",
              fillOpacity: 1,
              strokeColor: "#b45309",
              strokeWeight: 1,
            }}
            title={hotel.name || "Hotel / Center"}
          />
        )}

        {/* suggestions */}
        {valid.map((p, idx) => (
          <Marker
            key={`${p.name}-${idx}`}
            position={{ lat: p.lat!, lng: p.lng! }}
            onClick={() => setActiveIdx(idx)}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 6,
              fillColor: `hsl(${230 + idx * 40} 80% 45%)`,
              fillOpacity: 1,
              strokeColor: "#1f2937",
              strokeWeight: 1,
            }}
            label={{
              text: String(idx + 1),
              color: "#111827",
              fontSize: "12px",
              fontWeight: "700",
            }}
            title={p.name}
          />
        ))}

        {/* InfoWindow with Use + link + meta */}
        {activeIdx != null && valid[activeIdx] && (
          <InfoWindow
            position={{ lat: valid[activeIdx]!.lat!, lng: valid[activeIdx]!.lng! }}
            onCloseClick={() => setActiveIdx(null)}
          >
            <div className="text-sm max-w-[260px]">
              <div className="font-medium">{valid[activeIdx]!.name}</div>
              {valid[activeIdx]!.area && (
                <div className="text-xs text-slate-600">{valid[activeIdx]!.area}</div>
              )}
              {valid[activeIdx]!.meta && (
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {valid[activeIdx]!.meta}
                </div>
              )}
              {(valid[activeIdx]!.ratings?.google ||
                valid[activeIdx]!.ratings?.googleReviews) && (
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {valid[activeIdx]!.ratings?.google
                    ? `Google ${valid[activeIdx]!.ratings!.google!.toFixed(1)}`
                    : null}
                  {typeof valid[activeIdx]!.ratings?.googleReviews === "number"
                    ? ` · ${valid[activeIdx]!.ratings!.googleReviews!.toLocaleString()} reviews`
                    : ""}
                </div>
              )}
              {valid[activeIdx]!.url && (
                <div className="mt-1">
                  <a
                    className="text-xs text-blue-700 underline"
                    href={valid[activeIdx]!.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open link
                  </a>
                </div>
              )}
              <div className="mt-2">
                <button
                  className="px-3 py-1.5 rounded-lg border bg-indigo-50 hover:bg-indigo-100 text-sm"
                  onClick={() => onChoose(items[activeIdx])}
                >
                  Use
                </button>
              </div>
            </div>
          </InfoWindow>
        )}

        {/* Optional: directions across the suggestions (in order) */}
        {valid.length >= 2 && (
          <>
            <DirectionsService
              options={{
                origin: { lat: valid[0].lat!, lng: valid[0].lng! },
                destination: {
                  lat: valid[valid.length - 1].lat!,
                  lng: valid[valid.length - 1].lng!,
                },
                travelMode:
                  mode === "WALKING"
                    ? google.maps.TravelMode.WALKING
                    : google.maps.TravelMode.DRIVING,
                waypoints:
                  valid.length > 2
                    ? valid.slice(1, -1).map((p) => ({
                        location: { lat: p.lat!, lng: p.lng! },
                        stopover: true,
                      }))
                    : [],
                optimizeWaypoints: false,
              }}
              callback={(res) => {
                if (!res) return;
                if (res.status === "OK") {
                  setDirections(res);
                  setDirectionsError(null);
                  // refit bounds when we have directions
                  if (map) {
                    const b = new google.maps.LatLngBounds();
                    res.routes[0].overview_path.forEach((pt) => b.extend(pt));
                    map.fitBounds(b, 48);
                  }
                } else {
                  setDirections(null);
                  setDirectionsError(res.status);
                }
              }}
            />
            {directions && <DirectionsRenderer options={{ directions }} />}
          </>
        )}
      </GoogleMap>

      {directionsError && (
        <div className="text-xs text-amber-700 bg-amber-50 px-3 py-1 border-t">
          Directions error: {directionsError}. Try switching walk/drive or changing stops.
        </div>
      )}
    </div>
  );
}
