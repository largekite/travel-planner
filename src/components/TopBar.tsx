import React from "react";
import { Wifi, Heart, Users, Mountain, Calendar } from "lucide-react";
import { VIBES, Vibe } from "../lib/types";
import AutocompleteInput from "./AutocompleteInput";
import LocationButton from "./LocationButton";

type Props = {
  apiOk: boolean | null;
  apiLatency: number | null;
  apiMsg: string | null;
  country: string;
  setCountry: (c: string) => void;
  city: string;
  setCity: (c: string) => void;
  vibe: Vibe;
  setVibe: (v: Vibe) => void;
  daysCount: number;
  setDaysCount: (n: number) => void;
  currentDay: number;
  setCurrentDay: (n: number) => void;
};

export default function TopBar({
  apiOk,
  apiLatency,
  apiMsg,
  country,
  setCountry,
  city,
  setCity,
  vibe,
  setVibe,
  daysCount,
  setDaysCount,
  currentDay,
  setCurrentDay,
}: Props) {
  return (
    <div className="rounded-2xl bg-white/80 backdrop-blur border p-4 flex flex-wrap items-center gap-3 shadow-sm">
      <div className="flex items-center gap-2 mr-auto">
        <div className="text-lg font-semibold tracking-tight">
          Largekite — {vibe} trip plan
        </div>
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs ${
            apiOk == null
              ? "bg-slate-50 text-slate-600"
              : apiOk
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-rose-50 text-rose-700 border-rose-200"
          }`}
        >
          <Wifi className="w-3.5 h-3.5" />
          {apiOk == null
            ? "API: unknown"
            : apiOk
            ? `API: ok${apiLatency != null ? ` · ${apiLatency}ms` : ""}`
            : `API: down (${apiMsg || "error"})`}
        </span>
      </div>

      <div className="flex gap-2">
        {[...new Set(VIBES)].map((v) => (
          <button
            key={v}
            onClick={() => setVibe(v)}
            aria-pressed={vibe === v}
            className={`px-3 py-1.5 rounded-full border text-sm transition-all ${
              vibe === v
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-slate-800"
            }`}
          >
            {v === "romantic" && <Heart className="inline w-4 h-4 mr-1" />}
            {v === "family" && <Users className="inline w-4 h-4 mr-1" />}
            {v === "adventurous" && <Mountain className="inline w-4 h-4 mr-1" />}
            {v}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Calendar className="w-4 h-4 text-slate-600" />
        <span className="text-slate-600">Days</span>
        <input
          type="number"
          min={1}
          max={14}
          value={daysCount}
          onChange={(e) =>
            setDaysCount(
              Math.max(1, Math.min(14, parseInt(e.target.value || "1")))
            )
          }
          className="w-20 border rounded-lg p-1 bg-white"
        />
      </div>
      <div className="flex flex-wrap gap-1 w-full sm:w-auto">
        {Array.from({ length: daysCount }, (_, i) => i + 1).map((d) => (
          <button
            key={d}
            onClick={() => setCurrentDay(d)}
            className={`px-3 py-1.5 rounded-lg border text-sm ${
              currentDay === d
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white"
            }`}
          >
            Day {d}
          </button>
        ))}
      </div>
    </div>
  );
}
