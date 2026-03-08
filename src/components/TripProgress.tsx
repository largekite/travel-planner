import { CheckCircle2, Circle, MapPin, Utensils, Coffee, Hotel, Compass } from 'lucide-react';
import { DayPlan } from '../lib/types';

type Props = {
  plan: DayPlan[];
  currentDay: number;
  city: string;
  onDayClick: (day: number) => void;
};

const SLOT_KEYS = ['hotel', 'breakfast', 'activity', 'lunch', 'activity2', 'coffee', 'dinner'] as const;

function getDayCompletion(day: DayPlan): { filled: number; total: number } {
  const total = SLOT_KEYS.length;
  const filled = SLOT_KEYS.filter(k => day[k as keyof DayPlan]).length;
  return { filled, total };
}

export function calculateOverallCompletion(plan: DayPlan[]): number {
  const totalSlots = plan.length * SLOT_KEYS.length;
  if (totalSlots === 0) return 0;
  const filledSlots = plan.reduce((sum, day) => {
    return sum + SLOT_KEYS.filter(k => day[k as keyof DayPlan]).length;
  }, 0);
  return Math.round((filledSlots / totalSlots) * 100);
}

export default function TripProgress({ plan, currentDay, city, onDayClick }: Props) {
  if (!city) return null;

  const totalSlots = plan.length * SLOT_KEYS.length;
  const filledSlots = plan.reduce((sum, day) => {
    return sum + SLOT_KEYS.filter(k => day[k as keyof DayPlan]).length;
  }, 0);
  const overallPercent = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

  return (
    <div className="rounded-2xl bg-white/90 backdrop-blur border p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-indigo-500" />
          <span className="font-semibold text-sm">Trip Progress</span>
        </div>
        <span className="text-xs text-slate-500">{filledSlots}/{totalSlots} slots filled</span>
      </div>

      {/* Overall progress bar */}
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            overallPercent === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
          }`}
          style={{ width: `${overallPercent}%` }}
        />
      </div>

      {/* Per-day mini cards */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-2">
        {plan.map((day, i) => {
          const { filled, total } = getDayCompletion(day);
          const percent = Math.round((filled / total) * 100);
          const isCurrentDay = i + 1 === currentDay;
          const isComplete = filled === total;

          return (
            <button
              key={i}
              onClick={() => onDayClick(i + 1)}
              className={`relative p-2 rounded-xl border text-center transition-all ${
                isCurrentDay
                  ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-200'
                  : isComplete
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="text-xs font-medium text-slate-600">Day {i + 1}</div>
              <div className="flex items-center justify-center gap-1 mt-1">
                {isComplete ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-slate-300" />
                )}
                <span className={`text-xs font-medium ${isComplete ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {filled}/{total}
                </span>
              </div>
              {/* Mini progress bar */}
              <div className="w-full h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isComplete ? 'bg-emerald-400' : 'bg-indigo-400'}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
