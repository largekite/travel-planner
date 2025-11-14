import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  DirectionsService,
  DirectionsRenderer,
  useLoadScript,
} from "@react-google-maps/api";

export type MapPlace = {
  name: string;
  lat?: number;
  lng?: number;
  area?: string;
  url?: string;
};

type Props = {
  hotel: MapPlace | null;
  places: MapPlace[];                 // ordered sequence for Day: [breakfast, activity, lunch, coffee, dinner]
  height?: string;                    // e.g., "420px"
  mode: "WALKING" | "DRIVING";        // from your “walk/drive” toggle
  showRoute?: boolean;                // toggle to compute directions
};

const STL_FALLBACK_CENTER = { lat: 38.627, lng: -90.1994 }; // St. Louis downtown-ish
const containerStyle: google.maps.MapOptions = {
  // These are map options; container style is set via wrapper <div>.
  disableDefaultUI: false,
  clickableIcons: true,
};

export default function InteractiveMap({
  hotel,
  places,
  height = "420px",
  mode,
  showRoute = true,
}: Props) {
  const apiKey = import.meta.env.GOOGLE_PLACES_API_KEY as string | undefined;

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || "",
    libraries: ["places"], // keep it lean; add "geometry" if needed
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [directions, setDirections] =
    useState<google.maps.DirectionsResult | null>(null);
  const [directionsError, setDirectionsError] = useState<string | null>(null);

  const center = useMemo(() => {
    // Prefer hotel center if available; otherwise first place; otherwise fallback
    if (hotel?.lat && hotel?.lng) return { lat: hotel.lat, lng: hotel.lng };
    const first = places.find((p) => p.lat && p.lng);
    if (first) return { lat: first.lat!, lng: first.lng! };
    return STL_FALLBACK_CENTER;
  }, [hotel?.lat, hotel?.lng, places.map(p=>p.name).join("|")]);

  const orderedStops = useMemo(
    () => places.filter((p) => p.lat != null && p.lng != null),
    [places]
  );

  const travelMode: google.maps.TravelMode =
    mode === "WALKING" ? google.maps.TravelMode.WALKING : google.maps.TravelMode.DRIVING;

  useEffect(() => {
    // Recompute directions whenever stops or mode change
    if (!isLoaded) return;
    if (!showRoute) { setDirections(null); setDirectionsError(null); return; }
    if (orderedStops.length < 2) { setDirections(null); setDirectionsError(null); return; }
    // DirectionsService is rendered below; result handled in onDirectionsCallback
  }, [isLoaded, orderedStops.length, mode, showRoute]);

  // Fit bounds once map is ready or data changes
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    const b = new google.maps.LatLngBounds();
    let added = false;

    if (hotel?.lat && hotel?.lng) {
      b.extend(new google.maps.LatLng(hotel.lat, hotel.lng));
      added = true;
    }
    orderedStops.forEach((p) => {
      if (p.lat && p.lng) {
        b.extend(new google.maps.LatLng(p.lat, p.lng));
        added = true;
      }
    });
    if (added) mapRef.current.fitBounds(b, 48);
  }, [isLoaded, hotel?.lat, hotel?.lng, orderedStops.map(p=>p.name).join("|")]);

  if (loadError) {
    return <div className="text-sm text-rose-700">Map failed to load: {String(loadError)}</div>;
  }
  if (!isLoaded) {
    return <div className="text-sm text-slate-600">Loading map…</div>;
  }

  // Build DirectionsRequest inputs when we have 2+ stops
  const origin = orderedStops[0];
  const destination = orderedStops[orderedStops.length - 1];
  const waypoints =
    orderedStops.length > 2
      ? orderedStops.slice(1, -1).map((p) => ({
          location: { lat: p.lat!, lng: p.lng! },
          stopover: true,
        }))
      : [];

  const markerHue = (idx: number) => 230 + idx * 40; // colorful pins

  return (
    <div style={{ height }} className="rounded-xl overflow-hidden border">
      <GoogleMap
        onLoad={(m) => (mapRef.current = m)}
        center={center}
        zoom={12}
        mapContainerStyle={{ height: "100%", width: "100%" }}
        options={containerStyle}
      >
        {/* Hotel / Center */}
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

        {/* Day stops */}
        {orderedStops.map((p, idx) => (
          <Marker
            key={`${p.name}-${idx}`}
            position={{ lat: p.lat!, lng: p.lng! }}
            onClick={() => setActiveIdx(idx)}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 6,
              fillColor: `hsl(${markerHue(idx)} 80% 45%)`,
              fillOpacity: 1,
              strokeColor: "#1f2937",
              strokeWeight: 1,
            }}
            title={p.name}
            label={{
              text: String(idx + 1),
              color: "#111827",
              fontSize: "12px",
              fontWeight: "700",
            }}
          />
        ))}

        {/* InfoWindow for active place */}
        {activeIdx != null && orderedStops[activeIdx] && (
          <InfoWindow
            position={{
              lat: orderedStops[activeIdx]!.lat!,
              lng: orderedStops[activeIdx]!.lng!,
            }}
            onCloseClick={() => setActiveIdx(null)}
          >
            <div className="text-sm">
              <div className="font-medium">{orderedStops[activeIdx]!.name}</div>
              {orderedStops[activeIdx]!.area && (
                <div className="text-xs text-slate-600">{orderedStops[activeIdx]!.area}</div>
              )}
              {orderedStops[activeIdx]!.url && (
                <a
                  href={orderedStops[activeIdx]!.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-700 underline"
                >
                  Open link
                </a>
              )}
            </div>
          </InfoWindow>
        )}

        {/* Directions calculation + rendering */}
        {showRoute && orderedStops.length >= 2 && (
          <>
            <DirectionsService
              options={{
                origin: { lat: origin.lat!, lng: origin.lng! },
                destination: { lat: destination.lat!, lng: destination.lng! },
                travelMode,
                waypoints,
                optimizeWaypoints: false, // keep user’s sequence
              }}
              callback={(res) => {
                if (!res) return;
                if (res.status === "OK") {
                  setDirections(res);
                  setDirectionsError(null);
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

      {/* error footer if directions fail */}
      {directionsError && (
        <div className="text-xs text-amber-700 bg-amber-50 px-3 py-1 border-t">
          Directions error: {directionsError}. Try switching walk/drive or changing stops.
        </div>
      )}
    </div>
  );
}
