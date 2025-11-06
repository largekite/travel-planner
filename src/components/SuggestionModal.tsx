import React from "react";
import { X, Footprints, Car, Filter } from "lucide-react";
import { ApiSuggestion, SlotKey, SelectedItem } from "../lib/types";

function SuggestionCard({
  item,
  index,
  onChoose,
}: {
  item: ApiSuggestion;
  index: number;
  onChoose: (item: ApiSuggestion) => void;
}) {
  return (
    <div className="rounded-xl border bg-white/80 hover:bg-indigo-50/30 transition-all p-3 flex justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-400 w-5 shrink-0">{index}.</div>
          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-slate-900 hover:text-indigo-700 truncate"
            >
              {item.name}
            </a>
          ) : (
            <div className="font-medium text-slate-900 truncate">
              {item.name}
            </div>
          )}
        </div>
        <div className="text-[11px] text-slate-500 mt-1">
          {[item.cuisine, item.price, item.area].filter(Boolean).join(" · ")}
        </div>
        {item.desc && (
          <div className="text-[11px] text-slate-600 mt-1 line-clamp-2">
            {item.desc}
          </div>
        )}
        {item.meta && (
          <div className="text-[10px] text-indigo-700 mt-1 bg-indigo-50 inline-block rounded-full px-2 py-0.5">
            {item.meta}
          </div>
        )}
      </div>
      <div>
        <button
          onClick={() => onChoose(item)}
          className="px-3 py-1.5 rounded-lg border bg-indigo-50 hover:bg-indigo-100 text-xs"
        >
          Use
        </button>
      </div>
    </div>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  slotKey: SlotKey;
  areaFilter: string;
  setAreaFilter: (v: string) => void;
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
  onChoose: (it: ApiSuggestion) => void;
  sortMode: "default" | "distance" | "rating";
  setSortMode: (v: "default" | "distance" | "rating") => void;
  lastFetchUrl: string;
  lastResultCount: number;
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
      <div className="relative bg-white rounded-2xl shadow-xl w-[min(920px,96vw)] max-h-[86vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50/60 backdrop-blur">
          <div className="font-semibold">
            Choose{" "}
            {slotKey === "hotel"
              ? "Hotel / Area"
              : slotKey.charAt(0).toUpperCase() + slotKey.slice(1)}
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 grow">
          <div className="mb-4 rounded-xl border p-3 bg-slate-50/60">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-600">Area/Neighborhood</span>
                <input
                  value={areaFilter}
                  onChange={(e) => setAreaFilter(e.target.value)}
                  placeholder="e.g., Tower Grove"
                  className="border rounded-lg p-1 bg-white"
                />
              </div>
              {slotKey !== "hotel" && (
                <>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={useNearFilter}
                      onChange={(e) => setUseNearFilter(e.target.checked)}
                    />
                    <span>Filter by near me</span>
                  </label>
                  <div className="flex items-center gap-2 text-sm">
                    <button
                      onClick={() => setNearMode("walk")}
                      className={`px-2 py-1 rounded border text-xs ${
                        nearMode === "walk"
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white"
                      }`}
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
                    onChange={(e) =>
                      setNearMaxMins(parseInt(e.target.value || "15"))
                    }
                  />
                  {!hotel && useNearFilter && (
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                      Pick a hotel/center to enable near-me filtering.
                    </div>
                  )}
                </>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Filter className="w-4 h-4 text-slate-500" />
                <select
                  value={sortMode}
                  onChange={(e) =>
                    setSortMode(e.target.value as typeof sortMode)
                  }
                  className="border rounded-lg p-1 bg-white text-xs"
                >
                  <option value="default">Sort: Default</option>
                  <option value="distance">Sort: Distance</option>
                  <option value="rating">Sort: Rating</option>
                </select>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 mb-2">
            <div>
              Last request URL:{" "}
              <span className="break-all">
                {lastFetchUrl || "(none yet)"}
              </span>
            </div>
            <div>Items returned: {lastResultCount}</div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {items.map((it, idx) => (
              <SuggestionCard
                key={`${it.name}-${idx}`}
                item={it}
                index={idx + 1}
                onChoose={onChoose}
              />
            ))}
            {!loading && items.length === 0 && (
              <div className="py-8 text-center text-sm text-slate-400">
                {error ? error : "No matches."}
              </div>
            )}
            {loading && (
              <div className="py-4 text-center text-sm text-slate-400">
                Loading…
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
