// Slot-specific colors used across day planner, map, and other components
// Colors match Tailwind palette values for consistency

export const SLOT_COLORS: Record<string, string> = {
  hotel: "#f59e0b",     // amber-500
  breakfast: "#f97316", // orange-500
  activity: "#3b82f6",  // blue-500
  activity2: "#8b5cf6", // violet-500
  lunch: "#10b981",     // emerald-500
  coffee: "#6366f1",    // indigo-500
  dinner: "#e11d48",    // rose-600
};

// Tailwind class pairs: [bg, text] for use in badges/borders
export const SLOT_COLOR_CLASSES: Record<string, { bg: string; text: string; border: string; lightBg: string }> = {
  hotel:     { bg: "bg-amber-500",  text: "text-amber-700",  border: "border-amber-300",  lightBg: "bg-amber-50" },
  breakfast: { bg: "bg-orange-500", text: "text-orange-700", border: "border-orange-300", lightBg: "bg-orange-50" },
  activity:  { bg: "bg-blue-500",   text: "text-blue-700",   border: "border-blue-300",   lightBg: "bg-blue-50" },
  activity2: { bg: "bg-violet-500", text: "text-violet-700", border: "border-violet-300", lightBg: "bg-violet-50" },
  lunch:     { bg: "bg-emerald-500",text: "text-emerald-700",border: "border-emerald-300",lightBg: "bg-emerald-50" },
  coffee:    { bg: "bg-indigo-500", text: "text-indigo-700", border: "border-indigo-300", lightBg: "bg-indigo-50" },
  dinner:    { bg: "bg-rose-500",   text: "text-rose-700",   border: "border-rose-300",   lightBg: "bg-rose-50" },
};
