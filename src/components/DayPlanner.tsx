import React from "react";
import { Trash2 } from "lucide-react";
import { DayPlan, SelectedItem } from "../lib/types";

type Props = {
  currentDay: number;
  plan: DayPlan[];
  openSlot: (slot: any) => void;
  clearDay: (day: number) => void;
  setPlan: (plan: DayPlan[]) => void;
};

function SlotButton({
  label,
  value,
  onClick,
}: {
  label: string;
  value?: SelectedItem;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 rounded-lg border hover:border-indigo-300 hover:bg-indigo-50/40 transition-all"
    >
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="font-medium text-slate-800 truncate flex items-center gap-2 text-sm mt-1">
        {value?.name || "Choose"}
      </div>
      {value?.meta && (
        <div className="mt-1 text-[10px] text-indigo-700 bg-indigo-50 inline-block rounded-full px-2 py-0.5">
          {value.meta}
        </div>
      )}
    </button>
  );
}

export default function DayPlanner({
  currentDay,
  plan,
  openSlot,
  clearDay,
  setPlan,
}: Props) {
  const cur = plan[currentDay - 1] || {};
  return (
    <div className="bg-white/90 backdrop-blur rounded-2xl border p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">Day {currentDay}</div>
        <button
          onClick={() => clearDay(currentDay)}
          className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SlotButton
          label="Activity"
          value={cur.activity}
          onClick={() => openSlot("activity")}
        />
        <SlotButton
          label="Breakfast"
          value={cur.breakfast}
          onClick={() => openSlot("breakfast")}
        />
        <SlotButton
          label="Lunch"
          value={cur.lunch}
          onClick={() => openSlot("lunch")}
        />
        <SlotButton
          label="Dinner"
          value={cur.dinner}
          onClick={() => openSlot("dinner")}
        />
        <SlotButton
          label="Coffee"
          value={cur.coffee}
          onClick={() => openSlot("coffee")}
        />
      </div>
      <textarea
        value={cur.notes || ""}
        onChange={(e) => {
          const next = [...plan];
          next[currentDay - 1] = {
            ...next[currentDay - 1],
            notes: e.target.value,
          };
          setPlan(next);
        }}
        placeholder="Notes will appear here after API generates them. You can edit."
        className="mt-3 w-full border rounded-lg p-2 text-sm bg-white min-h-[90px]"
      />
    </div>
  );
}
