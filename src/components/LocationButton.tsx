import React, { useState } from "react";
import { MapPin, Loader2 } from "lucide-react";

type Props = {
  onLocationFound: (lat: number, lng: number) => void;
  className?: string;
};

export default function LocationButton({ onLocationFound, className = "" }: Props) {
  const [loading, setLoading] = useState(false);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onLocationFound(position.coords.latitude, position.coords.longitude);
        setLoading(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Unable to get your location. Please try again.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <button
      onClick={getCurrentLocation}
      disabled={loading}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-white hover:bg-slate-50 disabled:opacity-50 ${className}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <MapPin className="w-4 h-4" />
      )}
      {loading ? "Getting location..." : "Use current location"}
    </button>
  );
}