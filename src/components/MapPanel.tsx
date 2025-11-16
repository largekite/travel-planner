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
  hotel: SelectedItem | null;
  chosenItems: SelectedItem[];
  dirSegs: DirectionsSegment[] | null;
  dirErr: string | null;
};

export default function MapPanel({
  currentDay,
  hotel,
  chosenItems,
  dirSegs,
  dirErr,
}: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [usedGoogle, setUsedGoogle] = useState(false);

  // try to load google maps if key provided
  useEffect(() => {
    const key =
      (typeof window !== "undefined" &&
        (window as any).__GOOGLE_MAPS_KEY) ||
      (typeof import.meta !== "undefined" &&
        (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY);
    if (!key) return; // no key, fallback to SVG

    if (typeof window !== "undefined" && !(window as any).google) {
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${key}`;
      s.async = true;
      s.onload = () => setMapReady(true);
      document.head.appendChild(s);
    } else {
      setMapReady(true);
    }
  }, []);

  // init map if ready
  useEffect(() => {
    if (!mapReady) return;
    if (!mapRef.current) return;
    const g = (window as any).google;
    if (!g || !g.maps) return;

    const center = hotel?.lat
      ? { lat: hotel.lat, lng: hotel.lng }
      : chosenItems[0]?.lat
      ? { lat: chosenItems[0].lat!, lng: chosenItems[0].lng! }
      : { lat: 38.627, lng: -90.199 }; // St. Louis center
    const map = new g.maps.Map(mapRef.current, {
      zoom: 12,
      center,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    // add markers
    chosenItems.forEach((p) => {
      if (!p.lat || !p.lng) return;
      new g.maps.Marker({
        position: { lat: p.lat, lng: p.lng },
        map,
        title: p.name,
      });
    });
    if (hotel?.lat && hotel?.lng) {
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
    setUsedGoogle(true);
  }, [mapReady, hotel?.lat, hotel?.lng, JSON.stringify(chosenItems.map((c) => c.name))]);

  // fallback straight segments
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
      const mode = km > 1.2 ? "drive" : "walk";
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
          {usedGoogle
            ? "Google Maps"
            : "SVG fallback (no Google key set)"}
        </div>
      </div>
      {usedGoogle ? (
        <div ref={mapRef} className="w-full h-[320px] rounded-xl border" />
      ) : (
        <svg
          viewBox="0 0 100 100"
          className="w-full aspect-square rounded-xl border bg-slate-50"
        >
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
        {chosenItems.length === 0 ? (
          <div>No places selected yet.</div>
        ) : (
          <ul className="list-disc pl-5">
            {chosenItems.map((p, i) => (
              <li key={i}>
                {p.name} {p.area ? <span className="text-slate-500">· {p.area}</span> : null}
              </li>
            ))}
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
