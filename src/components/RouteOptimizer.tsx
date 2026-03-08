import { useState, useMemo } from "react";
import {
  Route,
  Footprints,
  Car,
  ArrowRight,
  ArrowDown,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Hotel,
  Clock,
  MapPin,
} from "lucide-react";
import { SelectedItem, RouteLeg } from "../lib/types";
import { optimizeRoute, calculateRouteTotals } from "../lib/routeOptimizer";

type Props = {
  chosenItems: SelectedItem[];
  hotel: SelectedItem | null;
  onApply: (optimizedOrder: SelectedItem[]) => void;
  onToast?: (msg: string) => void;
};

function formatDist(km: number) {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

function LegRow({ leg, mode }: { leg: RouteLeg; mode: "walk" | "drive" }) {
  const isWalk = leg.distance < 1.2;
  return (
    <div className="flex items-center gap-2 px-3 py-1 text-[10px] text-slate-400">
      <div className="flex-1 border-t border-dashed border-slate-200" />
      <div className="flex items-center gap-1">
        {isWalk ? <Footprints className="w-2.5 h-2.5" /> : <Car className="w-2.5 h-2.5" />}
        <span>{formatDist(leg.distance)}</span>
        <span>~{leg.time} min</span>
      </div>
      <div className="flex-1 border-t border-dashed border-slate-200" />
    </div>
  );
}

function PlaceRow({
  item,
  index,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  showReorder,
}: {
  item: SelectedItem;
  index: number;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  showReorder?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      {showReorder && (
        <div className="flex flex-col gap-0.5">
          <button
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      )}
      <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-800 truncate">{item.name}</div>
        {item.area && <div className="text-[10px] text-slate-500 truncate">{item.area}</div>}
      </div>
    </div>
  );
}

export default function RouteOptimizer({ chosenItems, hotel, onApply, onToast }: Props) {
  const [mode, setMode] = useState<"walk" | "drive">("walk");
  const [returnToHotel, setReturnToHotel] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [manualOrder, setManualOrder] = useState<SelectedItem[] | null>(null);
  const [activeTab, setActiveTab] = useState<"optimized" | "manual">("optimized");

  // Dedupe and filter items (exclude hotel)
  const uniqueItems = useMemo(() => {
    const items: SelectedItem[] = [];
    const seen = new Set<string>();
    for (const item of chosenItems) {
      if (!item?.name || seen.has(item.name) || item.name === hotel?.name) continue;
      seen.add(item.name);
      items.push(item);
    }
    return items;
  }, [chosenItems, hotel?.name]);

  const startPoint = hotel?.lat && hotel?.lng ? { lat: hotel.lat, lng: hotel.lng } : undefined;

  // Current route totals
  const currentTotals = useMemo(
    () => calculateRouteTotals(uniqueItems, startPoint, mode, returnToHotel),
    [uniqueItems, startPoint, mode, returnToHotel]
  );

  // Optimized route
  const optimization = useMemo(
    () => optimizeRoute(uniqueItems, startPoint, mode, returnToHotel),
    [uniqueItems, startPoint, mode, returnToHotel]
  );

  // Manual reorder totals
  const manualTotals = useMemo(() => {
    if (!manualOrder) return null;
    return calculateRouteTotals(manualOrder, startPoint, mode, returnToHotel);
  }, [manualOrder, startPoint, mode, returnToHotel]);

  const savedMinutes = Math.max(0, currentTotals.totalTime - optimization.totalTime);
  const savedDistance = Math.max(0, currentTotals.totalDistance - optimization.totalDistance);

  const activeOrder = activeTab === "manual" && manualOrder ? manualOrder : optimization.optimizedOrder;
  const activeTotals = activeTab === "manual" && manualTotals ? manualTotals : { totalTime: optimization.totalTime, totalDistance: optimization.totalDistance, legs: optimization.legs || [] };

  // Manual reorder handlers
  const moveItem = (fromIdx: number, toIdx: number) => {
    const order = [...(manualOrder || optimization.optimizedOrder)];
    const [item] = order.splice(fromIdx, 1);
    order.splice(toIdx, 0, item);
    setManualOrder(order);
    setActiveTab("manual");
  };

  if (uniqueItems.length < 2) return null;

  return (
    <div className="rounded-2xl bg-white/90 backdrop-blur border shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <Route className="w-4 h-4 text-indigo-500" />
          <div>
            <div className="font-semibold text-sm">Route Optimizer</div>
            <div className="text-xs text-slate-500">
              {expanded ? "Rearrange stops to minimize travel" : `${uniqueItems.length} stops · ${currentTotals.totalTime} min ${mode === "walk" ? "walking" : "driving"}`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!expanded && savedMinutes > 0 && (
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Save ~{savedMinutes} min
            </span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t">
          {/* Controls bar */}
          <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-slate-50 border-b">
            {/* Walk/Drive */}
            <div className="flex items-center bg-white rounded-lg p-0.5 border">
              <button
                onClick={() => setMode("walk")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  mode === "walk" ? "bg-emerald-100 text-emerald-700 shadow-sm" : "text-slate-500"
                }`}
              >
                <Footprints className="w-3 h-3" />
                Walk
              </button>
              <button
                onClick={() => setMode("drive")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  mode === "drive" ? "bg-blue-100 text-blue-700 shadow-sm" : "text-slate-500"
                }`}
              >
                <Car className="w-3 h-3" />
                Drive
              </button>
            </div>

            {/* Return to hotel toggle */}
            {hotel && (
              <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                <div
                  onClick={() => setReturnToHotel(!returnToHotel)}
                  className={`w-8 h-4 rounded-full transition-colors flex items-center px-0.5 ${returnToHotel ? "bg-indigo-600" : "bg-slate-200"}`}
                >
                  <div className={`w-3 h-3 bg-white rounded-full shadow transition-transform ${returnToHotel ? "translate-x-4" : "translate-x-0"}`} />
                </div>
                <div className="flex items-center gap-1 text-slate-600">
                  <Hotel className="w-3 h-3" />
                  Return to hotel
                </div>
              </label>
            )}

            {/* Tab switch */}
            <div className="ml-auto flex items-center bg-white rounded-lg p-0.5 border">
              <button
                onClick={() => setActiveTab("optimized")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  activeTab === "optimized" ? "bg-indigo-100 text-indigo-700 shadow-sm" : "text-slate-500"
                }`}
              >
                Auto
              </button>
              <button
                onClick={() => {
                  if (!manualOrder) setManualOrder([...optimization.optimizedOrder]);
                  setActiveTab("manual");
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  activeTab === "manual" ? "bg-indigo-100 text-indigo-700 shadow-sm" : "text-slate-500"
                }`}
              >
                Manual
              </button>
            </div>
          </div>

          {/* Comparison stats */}
          <div className="grid grid-cols-2 gap-px bg-slate-100">
            {/* Current route */}
            <div className="bg-white px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1">Current Route</div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-sm font-semibold text-slate-700">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {currentTotals.totalTime} min
                </div>
                <div className="flex items-center gap-1 text-sm text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {formatDist(currentTotals.totalDistance)}
                </div>
              </div>
            </div>

            {/* Optimized route */}
            <div className="bg-white px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider text-emerald-600 font-medium mb-1 flex items-center gap-1">
                {activeTab === "optimized" ? "Optimized" : "Manual"} Route
                {savedMinutes > 0 && activeTab === "optimized" && (
                  <span className="text-emerald-600">(-{savedMinutes} min)</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-sm font-semibold text-emerald-700">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  {activeTotals.totalTime} min
                </div>
                <div className="flex items-center gap-1 text-sm text-emerald-600">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  {formatDist(activeTotals.totalDistance)}
                </div>
              </div>
            </div>
          </div>

          {/* Route breakdown */}
          <div className="max-h-[320px] overflow-y-auto">
            {/* Hotel start */}
            {hotel && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50">
                <div className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                  H
                </div>
                <div className="text-sm font-medium text-amber-800">{hotel.name}</div>
                <span className="text-[10px] text-amber-600 ml-auto">Start</span>
              </div>
            )}

            {/* Stops with legs */}
            {activeOrder.map((item, i) => (
              <div key={`${item.name}-${i}`}>
                {activeTotals.legs && activeTotals.legs[hotel ? i : i > 0 ? i - 1 : -1] && (
                  <LegRow
                    leg={activeTotals.legs[hotel ? i : i > 0 ? i - 1 : -1]}
                    mode={mode}
                  />
                )}
                <PlaceRow
                  item={item}
                  index={i}
                  showReorder={activeTab === "manual"}
                  canMoveUp={i > 0}
                  canMoveDown={i < activeOrder.length - 1}
                  onMoveUp={() => moveItem(i, i - 1)}
                  onMoveDown={() => moveItem(i, i + 1)}
                />
              </div>
            ))}

            {/* Return to hotel */}
            {returnToHotel && hotel && (
              <>
                <div className="flex items-center gap-2 px-3 py-1 text-[10px] text-slate-400">
                  <div className="flex-1 border-t border-dashed border-slate-200" />
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Return</span>
                  <div className="flex-1 border-t border-dashed border-slate-200" />
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50">
                  <div className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                    H
                  </div>
                  <div className="text-sm font-medium text-amber-800">{hotel.name}</div>
                  <span className="text-[10px] text-amber-600 ml-auto">End</span>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 px-4 py-3 border-t bg-slate-50">
            {activeTab === "manual" && (
              <button
                onClick={() => {
                  setManualOrder(null);
                  setActiveTab("optimized");
                }}
                className="px-3 py-2 rounded-lg border bg-white hover:bg-slate-50 text-xs font-medium text-slate-600 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3 h-3" />
                Reset to auto
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={() => {
                onApply(activeOrder);
                onToast?.(`Route ${activeTab === "optimized" ? "optimized" : "reordered"}! Ctrl+Z to undo.`);
              }}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium flex items-center gap-2"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Apply {activeTab === "optimized" ? "Optimized" : "Manual"} Route
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
