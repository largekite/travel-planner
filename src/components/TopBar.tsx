import React from "react";
import { Heart, Users, Mountain, Star, Calendar, MapPin, DollarSign, ChevronLeft, ChevronRight } from "lucide-react";
import { VIBES, BUDGETS, Vibe, Budget } from "../lib/types";

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
  budget: Budget;
  setBudget: (b: Budget) => void;
  completionPercent?: number;
};

const VIBE_ICONS: Partial<Record<Vibe, React.ElementType>> = {
  romantic:    Heart,
  family:      Users,
  adventurous: Mountain,
  popular:     Star,
};

const BUDGET_LABELS: Record<Budget, string> = {
  budget: "$",
  moderate: "$$",
  luxury: "$$$",
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
  budget,
  setBudget,
  completionPercent,
}: Props) {
  return (
    <div className="rounded-2xl bg-white/80 backdrop-blur border p-4 shadow-sm space-y-3">
      {/* Row 1: Title + City indicator + vibe pills */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-lg font-semibold tracking-tight mr-auto flex items-center gap-2">
          Largekite{city ? ` — ${city}` : ' — Travel Planner'}
          {city && <MapPin className="w-4 h-4 text-indigo-500" />}
        </div>

        {/* Budget selector */}
        <div className="flex items-center gap-1 bg-slate-50 rounded-full px-1 py-0.5 border">
          <DollarSign className="w-3 h-3 text-slate-400 ml-1" />
          {BUDGETS.map((b) => (
            <button
              key={b}
              onClick={() => setBudget(b)}
              aria-pressed={budget === b}
              title={`${b.charAt(0).toUpperCase() + b.slice(1)} budget`}
              className={`px-2 py-1 rounded-full text-xs font-medium transition-all capitalize ${
                budget === b
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-white"
              }`}
            >
              {BUDGET_LABELS[b]}
            </button>
          ))}
        </div>

        {/* Vibe pills */}
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

      {/* Row 2: Days input + day tabs + completion */}
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

        {/* Day navigation with arrows for many days */}
        <div className="flex items-center gap-1">
          {daysCount > 7 && (
            <button
              onClick={() => setCurrentDay(Math.max(1, currentDay - 1))}
              disabled={currentDay <= 1}
              className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30"
              aria-label="Previous day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
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
          {daysCount > 7 && (
            <button
              onClick={() => setCurrentDay(Math.min(daysCount, currentDay + 1))}
              disabled={currentDay >= daysCount}
              className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30"
              aria-label="Next day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Completion indicator */}
        {typeof completionPercent === 'number' && city && (
          <div className="ml-auto flex items-center gap-2">
            <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <span className="text-xs text-slate-500">{completionPercent}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
