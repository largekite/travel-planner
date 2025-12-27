import React, { useEffect, useRef, useState } from "react";
import { SelectedItem, DirectionsSegment } from "../lib/types";

const STL_BOUNDS = {
  minLat: 38.45,
  maxLat: 38.8,
  minLng: -90.75,
  maxLng: -90.05,
};

function project(lat?: number, lng?: number) {
  if (lat == null || lng == null) return { x: -999, y: -999, hidden: true };
  const { minLat, maxLat, minLng, maxLng } = STL_BOUNDS;
  const nx = (lng - minLng) / (maxLng - minLng);
  const ny = 1 - (lat - minLat) / (maxLat - minLat);
  return {
    x: 6 + nx * 88,
    y: 6 + ny * 88,
    hidden: nx < 0 || nx > 1 || ny < 0 || ny > 1,
  };
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(sa), Math.sqrt(1 - sa));
  return R * c;
}

function etaMins(mode: "walk" | "drive", km: number) {
  const speedKmh = mode === "walk" ? 5 : 35;
  return Math.round((km / speedKmh) * 60);
}

type Props = {
  currentDay: number;
  city: string;
  hotel: SelectedItem | null;
  chosenItems: SelectedItem[];
  dirSegs: DirectionsSegment[] | null;
  dirErr: string | null;
  onItemClick?: (item: SelectedItem) => void;
};

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
  const [mapReady, setMapReady] = useState(false);
  const [usedGoogle, setUsedGoogle] = useState(false);
  const [cityCoords, setCityCoords] = useState({ lat: 38.627, lng: -90.199 });

  // Try to load Google Maps JS if a key is provided.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!key) {
      console.warn("MapPanel: no VITE_GOOGLE_MAPS_API_KEY found – using SVG fallback.");
      return;
    }

    // If Google Maps JS is already loaded, just mark as ready.
    if ((window as any).google && (window as any).google.maps && (window as any).google.maps.Map) {
      setMapReady(true);
      return;
    }

    // Check if script is already being loaded
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) {
      (window as any).initGoogleMaps = () => setMapReady(true);
      const checkLoaded = () => {
        if ((window as any).google && (window as any).google.maps && (window as any).google.maps.Map) {
          setMapReady(true);
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      checkLoaded();
      return;
    }

    (window as any).initGoogleMaps = () => setMapReady(true);
    
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      console.error('Failed to load Google Maps script');
    };
    document.head.appendChild(script);
  }, []);

  // Geocode city to get coordinates
  useEffect(() => {
    if (!mapReady || !city) return;
    
    const g = (window as any).google;
    if (!g?.maps?.Geocoder) return;
    
    const geocoder = new g.maps.Geocoder();
    geocoder.geocode({ address: city }, (results: any, status: any) => {
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location;
        setCityCoords({ lat: location.lat(), lng: location.lng() });
      }
    });
  }, [mapReady, city]);

  // Initialize map once
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const g = (window as any).google;
    if (!g?.maps?.Map) return;

    const map = new g.maps.Map(mapRef.current, {
      zoom: 12,
      center: cityCoords,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      zoomControl: true,
      mapTypeControlOptions: {
        style: g.maps.MapTypeControlStyle.HORIZONTAL_BAR,
        position: g.maps.ControlPosition.TOP_CENTER,
      },
      fullscreenControlOptions: {
        position: g.maps.ControlPosition.RIGHT_TOP,
      },
    });

    // Add traffic layer
    const trafficLayer = new g.maps.TrafficLayer();
    trafficLayer.setMap(map);

    mapInstanceRef.current = map;
    setUsedGoogle(true);
  }, [mapReady]);

  // Update map center and markers when data changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    const g = (window as any).google;

    // Clear existing markers
    // (In a real app, you'd track markers to clear them)
    
    const center = hotel?.lat && hotel.lng
      ? { lat: hotel.lat, lng: hotel.lng }
      : chosenItems[0]?.lat && chosenItems[0]?.lng
      ? { lat: chosenItems[0].lat!, lng: chosenItems[0].lng! }
      : cityCoords;

    map.setCenter(center);

    // Add markers for chosen places
    chosenItems.forEach((p) => {
      if (!p.lat || !p.lng) return;
      new g.maps.Marker({
        position: { lat: p.lat, lng: p.lng },
        map,
        title: p.name,
      });
    });

    // Special marker for hotel
    if (hotel?.lat && hotel.lng) {
      new g.maps.Marker({
        position: { lat: hotel.lat, lng: hotel.lng },
        map,
        title: "Hotel/Center",
        icon: {
          path: g.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 5,
          fillColor: "#f59e0b",
          fillOpacity: 0.9,
          strokeWeight: 1,
        },
      });
    }
  }, [cityCoords, hotel?.lat, hotel?.lng, JSON.stringify(chosenItems.map(c => c.name))]);

  // Fallback straight segments when no real directions are available.
  const straightSegments = React.useMemo(() => {
    const segs: {
      a: SelectedItem;
      b: SelectedItem;
      km: number;
      mode: "walk" | "drive";
      mins: number;
    }[] = [];
    for (let i = 0; i < chosenItems.length - 1; i++) {
      const A = chosenItems[i]!;
      const B = chosenItems[i + 1]!;
      if (!A.lat || !A.lng || !B.lat || !B.lng) continue;
      const km = haversineKm(
        { lat: A.lat, lng: A.lng },
        { lat: B.lat, lng: B.lng }
      );
      const mode: "walk" | "drive" = km > 1.2 ? "drive" : "walk";
      const mins = etaMins(mode, km);
      segs.push({ a: A, b: B, km, mode, mins });
    }
    return segs;
  }, [JSON.stringify(chosenItems.map((c) => c.name))]);

  return (
    <div className="bg-white/90 backdrop-blur rounded-2xl border p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">Map - Day {currentDay}</div>
        <div className="text-[11px] text-slate-400">
          {usedGoogle ? "Google Maps" : "SVG fallback (no Google key set)"}
        </div>
      </div>

      <div ref={mapRef} className="w-full h-[400px] rounded-xl border" style={{ display: usedGoogle ? 'block' : 'none' }} />
      {!usedGoogle && (
        <svg
          viewBox="0 0 100 100"
          className="w-full aspect-square rounded-xl border bg-slate-50"
        >
          {/* grid */}
          {[...Array(8)].map((_, i) => (
            <line
              key={`h-${i}`}
              x1={6}
              x2={94}
              y1={6 + i * 11}
              y2={6 + i * 11}
              stroke="#e5e7eb"
              strokeWidth={0.4}
            />
          ))}
          {[...Array(8)].map((_, i) => (
            <line
              key={`v-${i}`}
              y1={6}
              y2={94}
              x1={6 + i * 11}
              x2={6 + i * 11}
              stroke="#e5e7eb"
              strokeWidth={0.4}
            />
          ))}

          {/* directions segments (if any) */}
          {dirSegs &&
            dirSegs.map((seg, idx) => {
              const pts = seg.path.map(([lat, lng]) => project(lat, lng));
              const vis = pts.filter((p) => !p.hidden);
              if (!vis.length) return null;
              const d =
                "M " +
                vis
                  .map((p, i) => `${i === 0 ? "" : "L "}${p.x} ${p.y}`)
                  .join(" ");
              return (
                <g key={idx}>
                  <path
                    d={d}
                    fill="none"
                    stroke={seg.mode === "walk" ? "#16a34a" : "#2563eb"}
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              );
            })}

          {/* fallback straight segments */}
          {!dirSegs &&
            straightSegments.map((seg, idx) => {
              const a = project(seg.a.lat, seg.a.lng);
              const b = project(seg.b.lat, seg.b.lng);
              const color = seg.mode === "walk" ? "#16a34a" : "#2563eb";
              return (
                <g key={idx}>
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={color}
                    strokeWidth={1.2}
                  />
                </g>
              );
            })}

          {/* pins */}
          {chosenItems.map((p, idx) => {
            const { x, y, hidden } = project(p.lat, p.lng);
            if (hidden) return null;
            const hue = 220 + idx * 40;
            return (
              <g key={`${p.name}-${idx}`}>
                <circle cx={x} cy={y} r={2.8} fill={`hsl(${hue}, 80%, 45%)`} />
                <text x={x + 3.8} y={y + 1.6} fontSize={3} fill="#334155">
                  {p.name}
                </text>
              </g>
            );
          })}

          {/* hotel pin */}
          {hotel && hotel.lat && hotel.lng && (() => {
            const { x, y, hidden } = project(hotel.lat, hotel.lng);
            if (hidden) return null;
            return (
              <g>
                <rect x={x - 2} y={y - 2} width={4} height={4} fill="#f59e0b" />
                <text x={x + 3.8} y={y + 1.6} fontSize={3} fill="#92400e">
                  Hotel/Center
                </text>
              </g>
            );
          })()}
        </svg>
      )}

      <div className="mt-2 text-xs text-slate-600">
        {chosenItems.length === 0 && !hotel ? (
          <div>No places selected yet.</div>
        ) : (
          <ul className="list-disc pl-5">
            {(() => {
              const seen = new Set<string>();
              const allItems = hotel ? [hotel, ...chosenItems] : chosenItems;
              
              return allItems.map((p, i) => {
                if (!p || !p.name || seen.has(p.name)) return null;
                seen.add(p.name);
                return (
                  <li 
                    key={i}
                    onClick={() => onItemClick?.(p)}
                    className="cursor-pointer hover:text-indigo-600 hover:underline"
                  >
                    {p.name}{" "}
                    {p.area ? <span className="text-slate-500">· {p.area}</span> : null}
                  </li>
                );
              }).filter(Boolean);
            })()}
          </ul>
        )}
      </div>
      {dirErr && (
        <div className="mt-2 text-xs text-amber-700">
          Directions error: {dirErr}. Falling back to straight-line estimates.
        </div>
      )}
    </div>
  );
}
