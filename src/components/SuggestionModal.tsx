// src/components/SuggestionModal.tsx
import React from "react";
import { X, Footprints, Car } from "lucide-react";
import { ApiSuggestion } from "../lib/api";
import { SelectedItem } from "../lib/types";

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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-[min(900px,96vw)] max-h-[86vh] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
          <div className="font-semibold">Choose {slotKey}</div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-auto p-4 space-y-4">
          {/* filters */}
          <div className="rounded-xl border p-3 bg-slate-50 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-600">Area / neighborhood</span>
                <input
                  value={areaFilter}
                  onChange={(e) => setAreaFilter(e.target.value)}
                  placeholder="e.g., Tower Grove, Central West End"
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
                      ? "bg-emerald-600 text-white"
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
                      ? "bg-indigo-600 text-white"
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
                  Pick a hotel/center or use current location to enable near-me.
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Sort:</span>
              <button
                onClick={() => setSortMode("default")}
                className={
                  sortMode === "default"
                    ? "px-2 py-1 bg-slate-800 text-white rounded"
                    : "px-2 py-1 rounded border"
                }
                type="button"
              >
                default
              </button>
              <button
                onClick={() => setSortMode("rating")}
                className={
                  sortMode === "rating"
                    ? "px-2 py-1 bg-slate-800 text-white rounded"
                    : "px-2 py-1 rounded border"
                }
                type="button"
              >
                rating
              </button>
              <button
                onClick={() => setSortMode("distance")}
                className={
                  sortMode === "distance"
                    ? "px-2 py-1 bg-slate-800 text-white rounded"
                    : "px-2 py-1 rounded border"
                }
                type="button"
              >
                distance
              </button>
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

          {/* results */}
          {error && <div className="text-amber-700 text-sm">{error}</div>}
          {loading && (
            <div className="text-sm text-slate-500">Loading suggestions…</div>
          )}
          {!loading && items.length === 0 && !error && (
            <div className="text-sm text-slate-500">
              No matches. Try removing area or near-me filter.
            </div>
          )}
          <div className="divide-y">
            {items.map((it, idx) => (
              <div
                key={idx}
                className="py-3 flex items-start justify-between gap-3"
              >
                <div>
                  {it.url ? (
                    <a
                      href={it.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-blue-700 hover:underline"
                    >
                      {idx + 1}. {it.name}
                    </a>
                  ) : (
                    <div className="font-medium">
                      {idx + 1}. {it.name}
                    </div>
                  )}
                  <div className="text-xs text-slate-500">
                    {[it.cuisine, it.price, it.area].filter(Boolean).join(" · ")}
                  </div>
                  {it.desc && (
                    <div className="text-xs text-slate-600 mt-0.5">
                      {it.desc}
                    </div>
                  )}
                  {it.meta && (
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {it.meta}
                    </div>
                  )}
                  {it.ratings?.google && (
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Google {it.ratings.google.toFixed(1)} ·{" "}
                      {(it.ratings.googleReviews || 0).toLocaleString()} reviews
                    </div>
                  )}
                </div>
                <div>
                  <button
                    onClick={() => onChoose(it)}
                    className="px-3 py-1.5 rounded-lg border bg-indigo-50 hover:bg-indigo-100 text-sm"
                    type="button"
                  >
                    Use
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
