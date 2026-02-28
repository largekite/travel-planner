import React from "react";
import { Heart, Users, Mountain, Star, Calendar } from "lucide-react";
import { VIBES, Vibe } from "../lib/types";

type Props = {
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

const VIBE_ICONS: Partial<Record<Vibe, React.ElementType>> = {
  romantic:    Heart,
  family:      Users,
  adventurous: Mountain,
  popular:     Star,
};

export default function TopBar({
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
    <div className="rounded-2xl bg-white/80 backdrop-blur border p-4 shadow-sm space-y-3">
      {/* Row 1: Title + vibe pills */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-lg font-semibold tracking-tight mr-auto">
          Largekite{city ? ` — ${city}` : ' — Travel Planner'}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[...new Set(VIBES)].map((v) => {
            const Icon = VIBE_ICONS[v];
            return (
              <button
                key={v}
                onClick={() => setVibe(v)}
                aria-pressed={vibe === v}
                className={`px-3 py-1.5 rounded-full border text-sm transition-all capitalize flex items-center gap-1 ${
                  vibe === v
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {v}
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 2: Days input + day tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span className="text-slate-600 whitespace-nowrap">Days:</span>
          <input
            type="number"
            min={1}
            value={daysCount}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '') return;
              const numValue = parseInt(value);
              if (numValue >= 1) setDaysCount(numValue);
            }}
            onBlur={(e) => {
              if (e.target.value === '') setDaysCount(1);
            }}
            className="w-16 border rounded-lg p-1 bg-white text-center"
            aria-label="Number of days"
          />
        </div>

        <div className="flex flex-wrap gap-1">
          {Array.from({ length: daysCount }, (_, i) => i + 1).map((d) => (
            <button
              key={d}
              onClick={() => setCurrentDay(d)}
              aria-pressed={currentDay === d}
              className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                currentDay === d
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Day {d}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
