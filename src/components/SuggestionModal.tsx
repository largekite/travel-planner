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
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-[min(900px,96vw)] max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
          <div className="font-semibold capitalize">Choose {slotKey}</div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Filters */}
          <div className="rounded-xl border p-3 bg-slate-50 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Area input */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-600">Area / neighborhood</span>
                <input
                  value={areaFilter}
                  onChange={(e) => setAreaFilter(e.target.value)}
                  placeholder="e.g., Tower Grove, Wildwood"
                  className="border rounded-lg p-1 text-sm"
                />
              </div>

              {/* Near-me filter */}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useNearFilter}
                  onChange={(e) => setUseNearFilter(e.target.checked)}
                />
                Filter by near me
              </label>

              {/* Mode buttons */}
              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => setNearMode("walk")}
                  className={`px-2 py-1 rounded border text-xs ${
                    nearMode === "walk"
                      ? "bg-emerald-600 text-white border-emerald-600"
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
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white"
                  }`}
                  type="button"
                >
                  <Car className="inline w-3.5 h-3.5 mr-1" />
                  Drive
                </button>
              </div>

              {/* Max minutes slider */}
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

              {/* Warning */}
              {!hotel && useNearFilter && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                  Pick a hotel/center or use your current location to enable
                  near-me filter.
                </div>
              )}
            </div>

            {/* Sort buttons */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Sort:</span>
              {(["default", "rating", "distance"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSortMode(mode)}
                  className={`px-2 py-1 rounded border ${
                    sortMode === mode
                      ? "bg-slate-800 text-white"
                      : "bg-white text-slate-700"
                  }`}
                  type="button"
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Debug info (optional) */}
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

          {/* Results list (scrollable) */}
          <div className="flex-1 overflow-y-auto border rounded-lg divide-y bg-white/60">
            {error && (
              <div className="text-amber-700 text-sm p-3">{error}</div>
            )}
            {loading && (
              <div className="text-sm text-slate-500 p-3">
                Loading suggestions…
              </div>
            )}
            {!loading && items.length === 0 && !error && (
              <div className="text-sm text-slate-500 p-3">
                No matches. Try removing area or near-me filter.
              </div>
            )}

            {items.map((it, idx) => (
              <div
                key={idx}
                className="py-3 px-3 flex items-start justify-between gap-3 hover:bg-slate-50"
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
                    {[it.cuisine, it.price, it.area]
                      .filter(Boolean)
                      .join(" · ")}
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

                <button
                  onClick={() => onChoose(it)}
                  className="px-3 py-1.5 rounded-lg border bg-indigo-50 hover:bg-indigo-100 text-sm whitespace-nowrap"
                  type="button"
                >
                  Use
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
