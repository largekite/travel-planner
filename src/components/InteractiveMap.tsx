import React, { useState, useMemo } from "react";
import { GoogleMap, Marker, InfoWindow, useLoadScript } from "@react-google-maps/api";

export type MapPlace = {
  name: string;
  lat?: number;
  lng?: number;
  area?: string;
  url?: string;
};

type Props = {
  hotel: MapPlace | null;
  places: MapPlace[];
  height?: string;
  mode: "WALKING" | "DRIVING";
  showRoute?: boolean;
};

const STL_FALLBACK_CENTER = { lat: 38.627, lng: -90.1994 };

export default function InteractiveMap({
  hotel,
  places,
  height = "420px",
  mode,
  showRoute = true,
}: Props) {
  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY as string | undefined;
  const [mapError, setMapError] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  if (!apiKey) {
    return (
      <div style={{ height }} className="rounded-xl overflow-hidden border bg-slate-100 flex items-center justify-center">
        <div className="text-center text-slate-600">
          <div className="text-lg font-medium">Map Unavailable</div>
          <div className="text-sm">Google Maps API key not configured</div>
        </div>
      </div>
    );
  }

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries: ["places"],
  });

  const orderedStops = useMemo(
    () => places.filter((p) => p.lat != null && p.lng != null),
    [places]
  );

  if (loadError || mapError) {
    return (
      <div style={{ height }} className="rounded-xl overflow-hidden border bg-slate-100 flex items-center justify-center">
        <div className="text-center text-slate-600">
          <div className="text-lg font-medium">Map Error</div>
          <div className="text-sm">{loadError?.message || mapError}</div>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={{ height }} className="rounded-xl overflow-hidden border bg-slate-100 flex items-center justify-center">
        <div className="text-center text-slate-600">
          <div className="text-lg font-medium">Loading Map...</div>
        </div>
      </div>
    );
  }

  const center = hotel?.lat && hotel?.lng 
    ? { lat: hotel.lat, lng: hotel.lng }
    : orderedStops[0]
    ? { lat: orderedStops[0].lat!, lng: orderedStops[0].lng! }
    : STL_FALLBACK_CENTER;

  return (
    <div style={{ height }} className="rounded-xl overflow-hidden border">
      <GoogleMap
        center={center}
        zoom={12}
        mapContainerStyle={{ height: "100%", width: "100%" }}
        options={{ disableDefaultUI: false }}
        onError={(error) => setMapError(String(error))}
      >
        {/* Hotel marker */}
        {hotel?.lat && hotel?.lng && (
          <Marker
            position={{ lat: hotel.lat, lng: hotel.lng }}
            title={hotel.name || "Hotel / Center"}
            icon={{
              path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              scale: 6,
              fillColor: "#f59e0b",
              fillOpacity: 1,
              strokeColor: "#b45309",
              strokeWeight: 1,
            }}
          />
        )}

        {/* Place markers */}
        {orderedStops.map((place, idx) => (
          <Marker
            key={`${place.name}-${idx}`}
            position={{ lat: place.lat!, lng: place.lng! }}
            title={place.name}
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
          />
        ))}

        {/* Info window */}
        {activeIdx !== null && orderedStops[activeIdx] && (
          <InfoWindow
            position={{
              lat: orderedStops[activeIdx].lat!,
              lng: orderedStops[activeIdx].lng!,
            }}
            onCloseClick={() => setActiveIdx(null)}
          >
            <div className="text-sm">
              <div className="font-medium">{orderedStops[activeIdx].name}</div>
              {orderedStops[activeIdx].area && (
                <div className="text-xs text-slate-600">{orderedStops[activeIdx].area}</div>
              )}
              {orderedStops[activeIdx].url && (
                <a
                  href={orderedStops[activeIdx].url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-700 underline"
                >
                  Open in Google Maps
                </a>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}