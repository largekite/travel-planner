import React, { useEffect, useRef, useState, useMemo } from "react";
import { SelectedItem, DirectionsSegment } from "../lib/types";
import { Footprints, Car, Navigation, ExternalLink, Maximize2, Locate, Route, MapPin, Clock, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { SLOT_COLORS } from "../utils/slotColors";

// ─── Geo helpers ────────────────────────────────────────────────────────────

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(sa), Math.sqrt(1 - sa));
}

function etaMins(mode: "walk" | "drive", km: number) {
  return Math.round((km / (mode === "walk" ? 5 : 35)) * 60);
}

function formatDist(km: number) {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

// ─── Slot colors & labels ───────────────────────────────────────────────────

// SLOT_COLORS imported from shared utils

const SLOT_LABELS: Record<string, string> = {
  hotel: "Hotel",
  breakfast: "Breakfast",
  activity: "Morning",
  activity2: "Afternoon",
  lunch: "Lunch",
  coffee: "Coffee",
  dinner: "Dinner",
};

const SLOT_ORDER = ["hotel", "breakfast", "activity", "lunch", "activity2", "coffee", "dinner"];

// ─── SVG fallback helpers ───────────────────────────────────────────────────

function computeBounds(items: Array<{ lat?: number; lng?: number }>) {
  const valid = items.filter(i => i.lat != null && i.lng != null);
  if (valid.length === 0) return { minLat: 38.45, maxLat: 38.8, minLng: -90.75, maxLng: -90.05 };
  const lats = valid.map(i => i.lat!);
  const lngs = valid.map(i => i.lng!);
  const pad = 0.01;
  return {
    minLat: Math.min(...lats) - pad,
    maxLat: Math.max(...lats) + pad,
    minLng: Math.min(...lngs) - pad,
    maxLng: Math.max(...lngs) + pad,
  };
}

function project(lat: number | undefined, lng: number | undefined, bounds: ReturnType<typeof computeBounds>) {
  if (lat == null || lng == null) return { x: -999, y: -999, hidden: true };
  const nx = (lng - bounds.minLng) / (bounds.maxLng - bounds.minLng);
  const ny = 1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat);
  return { x: 6 + nx * 88, y: 6 + ny * 88, hidden: nx < -0.1 || nx > 1.1 || ny < -0.1 || ny > 1.1 };
}

// ─── Types ──────────────────────────────────────────────────────────────────

type Props = {
  currentDay: number;
  city: string;
  hotel: SelectedItem | null;
  chosenItems: SelectedItem[];
  dirSegs: DirectionsSegment[] | null;
  dirErr: string | null;
  onItemClick?: (item: SelectedItem) => void;
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function MapPanel({
  currentDay,
  city,
  hotel,
  chosenItems,
  dirSegs,
  dirErr,
  onItemClick,
}: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [usedGoogle, setUsedGoogle] = useState(false);
  const [cityCoords, setCityCoords] = useState({ lat: 38.627, lng: -90.199 });
  const [travelMode, setTravelMode] = useState<"walk" | "drive">("walk");
  const [highlightedIdx, setHighlightedIdx] = useState<number | null>(null);
  const [showFullRoute, setShowFullRoute] = useState(true);
  const [showStopList, setShowStopList] = useState(false);

  // Build the ordered list of all places (hotel first, then day items)
  const allPlaces = useMemo(() => {
    const items: Array<SelectedItem & { slotKey: string }> = [];
    if (hotel) items.push({ ...hotel, slotKey: "hotel" });

    // Map chosenItems to slot keys based on their position
    const slotKeys = ["breakfast", "activity", "lunch", "activity2", "coffee", "dinner"];
    // chosenItems comes from SLOT_SEQUENCE filtering, so we need to figure out the slot
    // Actually, we'll infer from the order chosenItems appear
    const daySlots = SLOT_ORDER.filter(k => k !== "hotel");
    let slotIdx = 0;
    chosenItems.forEach(item => {
      if (item.name === hotel?.name) return; // skip hotel duplicate
      const key = daySlots[slotIdx] || "activity";
      items.push({ ...item, slotKey: key });
      slotIdx++;
    });
    return items;
  }, [hotel, chosenItems]);

  // Compute segments between consecutive places
  const segments = useMemo(() => {
    const segs: Array<{
      from: SelectedItem & { slotKey: string };
      to: SelectedItem & { slotKey: string };
      km: number;
      mins: number;
    }> = [];
    for (let i = 0; i < allPlaces.length - 1; i++) {
      const a = allPlaces[i];
      const b = allPlaces[i + 1];
      if (!a.lat || !a.lng || !b.lat || !b.lng) continue;
      const km = haversineKm({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng });
      segs.push({ from: a, to: b, km, mins: etaMins(travelMode, km) });
    }
    return segs;
  }, [allPlaces, travelMode]);

  const totalDistance = segments.reduce((s, seg) => s + seg.km, 0);
  const totalTime = segments.reduce((s, seg) => s + seg.mins, 0);

  // ─── Google Maps initialization ─────────────────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!key) return;

    if ((window as any).google?.maps?.Map) { setMapReady(true); return; }

    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) {
      const check = () => {
        if ((window as any).google?.maps?.Map) setMapReady(true);
        else setTimeout(check, 100);
      };
      check();
      return;
    }

    (window as any).initGoogleMaps = () => setMapReady(true);
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  // Geocode city
  useEffect(() => {
    if (!mapReady || !city) return;
    const g = (window as any).google;
    if (!g?.maps?.Geocoder) return;
    new g.maps.Geocoder().geocode({ address: city }, (results: any, status: any) => {
      if (status === "OK" && results[0]) {
        const loc = results[0].geometry.location;
        setCityCoords({ lat: loc.lat(), lng: loc.lng() });
      }
    });
  }, [mapReady, city]);

  // Create map
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const g = (window as any).google;
    if (!g?.maps?.Map) return;

    const map = new g.maps.Map(mapRef.current, {
      zoom: 13,
      center: cityCoords,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      zoomControl: true,
      styles: [
        { featureType: "poi.business", stylers: [{ visibility: "off" }] },
        { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
      ],
    });

    mapInstanceRef.current = map;
    setUsedGoogle(true);
  }, [mapReady]);

  // Update markers and route lines
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const g = (window as any).google;
    if (!g) return;

    // Clear old markers and polylines
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];
    if (infoWindowRef.current) infoWindowRef.current.close();

    const bounds = new g.maps.LatLngBounds();
    let hasBounds = false;

    // Create info window (shared)
    const infoWindow = new g.maps.InfoWindow();
    infoWindowRef.current = infoWindow;

    // Add markers for each place
    allPlaces.forEach((place, idx) => {
      if (!place.lat || !place.lng) return;
      const pos = { lat: place.lat, lng: place.lng };
      bounds.extend(pos);
      hasBounds = true;

      const color = SLOT_COLORS[place.slotKey] || "#4F46E5";
      const isHotel = place.slotKey === "hotel";
      const label = isHotel ? "H" : String(idx);

      const marker = new g.maps.Marker({
        position: pos,
        map,
        title: place.name,
        label: { text: label, color: "#fff", fontSize: "11px", fontWeight: "700" },
        icon: {
          path: isHotel ? g.maps.SymbolPath.BACKWARD_CLOSED_ARROW : g.maps.SymbolPath.CIRCLE,
          scale: isHotel ? 7 : 8,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
          labelOrigin: isHotel ? new g.maps.Point(0, -3) : new g.maps.Point(0, 0),
        },
        zIndex: isHotel ? 100 : 50 - idx,
      });

      marker.addListener("click", () => {
        const slotLabel = SLOT_LABELS[place.slotKey] || place.slotKey;
        const seg = segments.find(s => s.to.name === place.name);
        const distInfo = seg ? `<div style="font-size:11px;color:#666;margin-top:4px;">${formatDist(seg.km)} from ${seg.from.name} (~${seg.mins} min ${travelMode})</div>` : "";

        infoWindow.setContent(`
          <div style="min-width:180px;font-family:system-ui,sans-serif;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${color};font-weight:700;margin-bottom:2px;">${slotLabel}</div>
            <div style="font-size:14px;font-weight:600;">${place.name}</div>
            ${place.area ? `<div style="font-size:12px;color:#64748b;">${place.area}</div>` : ""}
            ${place.desc ? `<div style="font-size:11px;color:#94a3b8;margin-top:4px;">${place.desc}</div>` : ""}
            ${distInfo}
            ${place.url ? `<a href="${place.url}" target="_blank" style="font-size:11px;color:#4F46E5;text-decoration:none;display:inline-block;margin-top:6px;">Open in Google Maps &rarr;</a>` : ""}
          </div>
        `);
        infoWindow.open(map, marker);
        onItemClick?.(place);
      });

      // Highlight effect
      if (highlightedIdx === idx) {
        marker.setAnimation(g.maps.Animation.BOUNCE);
        setTimeout(() => marker.setAnimation(null), 1400);
      }

      markersRef.current.push(marker);
    });

    // Draw route polylines between stops
    if (showFullRoute && allPlaces.length >= 2) {
      for (let i = 0; i < allPlaces.length - 1; i++) {
        const a = allPlaces[i];
        const b = allPlaces[i + 1];
        if (!a.lat || !a.lng || !b.lat || !b.lng) continue;

        const seg = segments[i];
        const isWalk = !seg || seg.km < 1.2;

        const polyline = new g.maps.Polyline({
          path: [{ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng }],
          geodesic: true,
          strokeColor: isWalk ? "#16a34a" : "#2563eb",
          strokeOpacity: 0.7,
          strokeWeight: 3,
          icons: isWalk ? [{
            icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 },
            offset: "0",
            repeat: "12px",
          }] : [],
          map,
        });
        polylinesRef.current.push(polyline);

        // Distance label at midpoint
        if (seg) {
          const midLat = (a.lat + b.lat) / 2;
          const midLng = (a.lng + b.lng) / 2;
          const labelMarker = new g.maps.Marker({
            position: { lat: midLat, lng: midLng },
            map,
            icon: {
              path: g.maps.SymbolPath.CIRCLE,
              scale: 0,
            },
            label: {
              text: `${seg.mins}min`,
              color: isWalk ? "#16a34a" : "#2563eb",
              fontSize: "10px",
              fontWeight: "600",
              className: "map-distance-label",
            },
          });
          markersRef.current.push(labelMarker);
        }
      }
    }

    // Fit bounds
    if (hasBounds) {
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    } else {
      map.setCenter(cityCoords);
      map.setZoom(13);
    }
  }, [allPlaces, segments, travelMode, showFullRoute, highlightedIdx, cityCoords]);

  // Open Google Maps directions link
  const googleMapsDirectionsUrl = useMemo(() => {
    const validPlaces = allPlaces.filter(p => p.lat && p.lng);
    if (validPlaces.length < 2) return null;
    const origin = `${validPlaces[0].lat},${validPlaces[0].lng}`;
    const dest = `${validPlaces[validPlaces.length - 1].lat},${validPlaces[validPlaces.length - 1].lng}`;
    const waypoints = validPlaces.slice(1, -1).map(p => `${p.lat},${p.lng}`).join("|");
    const mode = travelMode === "walk" ? "walking" : "driving";
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}${waypoints ? `&waypoints=${waypoints}` : ""}&travelmode=${mode}`;
  }, [allPlaces, travelMode]);

  // SVG bounds for fallback
  const svgBounds = useMemo(() => {
    const items = hotel ? [hotel, ...chosenItems] : chosenItems;
    return computeBounds(items);
  }, [hotel, chosenItems]);

  return (
    <div className="bg-white/90 backdrop-blur rounded-2xl border shadow-sm overflow-hidden">
      {/* Map header with controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-indigo-500" />
          <span className="font-semibold text-sm">Day {currentDay} Map</span>
          {allPlaces.length > 0 && (
            <span className="text-xs text-slate-400">
              {allPlaces.length} stop{allPlaces.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Walk/Drive toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setTravelMode("walk")}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                travelMode === "walk" ? "bg-white shadow-sm text-emerald-700" : "text-slate-500 hover:text-slate-700"
              }`}
              title="Walking estimates"
            >
              <Footprints className="w-3 h-3" />
              Walk
            </button>
            <button
              onClick={() => setTravelMode("drive")}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                travelMode === "drive" ? "bg-white shadow-sm text-blue-700" : "text-slate-500 hover:text-slate-700"
              }`}
              title="Driving estimates"
            >
              <Car className="w-3 h-3" />
              Drive
            </button>
          </div>

          {/* Route toggle */}
          <button
            onClick={() => setShowFullRoute(!showFullRoute)}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              showFullRoute ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"
            }`}
            title={showFullRoute ? "Hide route lines" : "Show route lines"}
          >
            <Route className="w-3.5 h-3.5" />
          </button>

          {/* Google Maps link */}
          {googleMapsDirectionsUrl && (
            <a
              href={googleMapsDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-700 transition-colors"
              title="Open full directions in Google Maps"
            >
              <Navigation className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Total route summary */}
      {segments.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 border-b text-xs">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Route className="w-3 h-3" />
            <span className="font-medium">Total:</span>
            <span>{formatDist(totalDistance)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600">
            <Clock className="w-3 h-3" />
            <span>{totalTime} min {travelMode === "walk" ? "walking" : "driving"}</span>
          </div>
          {travelMode === "walk" && totalDistance > 5 && (
            <span className="text-amber-600 font-medium">Consider driving for this route</span>
          )}
        </div>
      )}

      {/* Google Maps container */}
      <div ref={mapRef} className="w-full h-[420px]" style={{ display: usedGoogle ? "block" : "none" }} />

      {/* SVG Fallback */}
      {!usedGoogle && (
        <svg viewBox="0 0 100 100" className="w-full aspect-square bg-slate-50">
          {/* Grid */}
          {[...Array(10)].map((_, i) => (
            <React.Fragment key={i}>
              <line x1={6} x2={94} y1={6 + i * 8.8} y2={6 + i * 8.8} stroke="#e5e7eb" strokeWidth={0.3} />
              <line y1={6} y2={94} x1={6 + i * 8.8} x2={6 + i * 8.8} stroke="#e5e7eb" strokeWidth={0.3} />
            </React.Fragment>
          ))}

          {/* Route lines */}
          {showFullRoute && allPlaces.map((place, idx) => {
            if (idx === 0) return null;
            const prev = allPlaces[idx - 1];
            if (!prev.lat || !prev.lng || !place.lat || !place.lng) return null;
            const a = project(prev.lat, prev.lng, svgBounds);
            const b = project(place.lat, place.lng, svgBounds);
            if (a.hidden && b.hidden) return null;
            const seg = segments[idx - 1];
            const color = seg && seg.km > 1.2 ? "#2563eb" : "#16a34a";
            return (
              <g key={`line-${idx}`}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={1.2} strokeDasharray={seg && seg.km < 1.2 ? "2,2" : "none"} />
                {seg && (
                  <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 2} fontSize={2.5} fill={color} textAnchor="middle" fontWeight="600">
                    {seg.mins}min
                  </text>
                )}
              </g>
            );
          })}

          {/* Pins */}
          {allPlaces.map((place, idx) => {
            const { x, y, hidden } = project(place.lat, place.lng, svgBounds);
            if (hidden) return null;
            const color = SLOT_COLORS[place.slotKey] || "#4F46E5";
            const isHighlighted = highlightedIdx === idx;
            return (
              <g
                key={`pin-${idx}`}
                onClick={() => place && onItemClick?.(place)}
                style={{ cursor: "pointer" }}
              >
                <circle cx={x} cy={y} r={isHighlighted ? 3.5 : 2.8} fill={color} stroke="#fff" strokeWidth={0.6} />
                <text x={x} y={y + 1} fontSize={2.2} fill="#fff" textAnchor="middle" fontWeight="700">
                  {place.slotKey === "hotel" ? "H" : idx}
                </text>
                <text x={x + 4} y={y + 1} fontSize={2.5} fill="#334155" fontWeight="500">
                  {place.name}
                </text>
              </g>
            );
          })}
        </svg>
      )}

      {/* Compact stop list — collapsible */}
      {allPlaces.length > 0 && (
        <div className="border-t">
          <button
            onClick={() => setShowStopList(!showStopList)}
            className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              {/* Mini color dots */}
              <div className="flex items-center -space-x-1">
                {allPlaces.slice(0, 7).map((place, idx) => (
                  <div
                    key={idx}
                    className="w-3 h-3 rounded-full border border-white"
                    style={{ backgroundColor: SLOT_COLORS[place.slotKey] || "#4F46E5" }}
                  />
                ))}
              </div>
              <span className="text-xs text-slate-500">
                {allPlaces.length} stop{allPlaces.length !== 1 ? "s" : ""}
              </span>
            </div>
            {showStopList
              ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            }
          </button>

          {showStopList && (
            <div className="divide-y divide-slate-100 max-h-[240px] overflow-y-auto">
              {allPlaces.map((place, idx) => {
                const seg = idx > 0 ? segments[idx - 1] : null;
                const color = SLOT_COLORS[place.slotKey] || "#4F46E5";
                const slotLabel = SLOT_LABELS[place.slotKey] || place.slotKey;

                return (
                  <React.Fragment key={`${place.name}-${idx}`}>
                    {seg && (
                      <div className="flex items-center gap-1.5 px-4 py-0.5 text-[10px] text-slate-300">
                        <div className="flex-1 border-t border-dashed border-slate-200" />
                        {seg.km < 1.2 ? <Footprints className="w-2 h-2" /> : <Car className="w-2 h-2" />}
                        <span>{formatDist(seg.km)} ~{seg.mins}m</span>
                        <div className="flex-1 border-t border-dashed border-slate-200" />
                      </div>
                    )}
                    <div
                      className={`flex items-center gap-2 px-4 py-1.5 cursor-pointer transition-colors ${
                        highlightedIdx === idx ? "bg-indigo-50" : "hover:bg-slate-50"
                      }`}
                      onClick={() => onItemClick?.(place)}
                      onMouseEnter={() => setHighlightedIdx(idx)}
                      onMouseLeave={() => setHighlightedIdx(null)}
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                        style={{ backgroundColor: color }}
                      >
                        {place.slotKey === "hotel" ? "H" : idx}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-slate-800 truncate">{place.name}</div>
                      </div>
                      <span className="text-[10px] text-slate-400 flex-shrink-0">{slotLabel}</span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Map footer info */}
      {dirErr && (
        <div className="px-4 py-2 text-xs text-amber-700 bg-amber-50 border-t">
          Directions unavailable: falling back to straight-line estimates.
        </div>
      )}

      {!usedGoogle && (
        <div className="px-4 py-2 text-[10px] text-slate-400 bg-slate-50 border-t text-center">
          SVG fallback — set VITE_GOOGLE_MAPS_API_KEY for interactive Google Maps
        </div>
      )}
    </div>
  );
}
