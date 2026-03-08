import { useState } from 'react';
import { X, Plus, Copy, Sparkles, ArrowLeftRight } from 'lucide-react';
import PlacePhoto from './PlacePhoto';
import { DayPlan, SelectedItem } from '../lib/types';
import PlaceDetails from './PlaceDetails';
import AffiliateButton from './AffiliateButton';
import RegenerateButton from './RegenerateButton';
import { getSlotIcon } from '../utils/slotIcons';
import { generateHotelsLink, generateViatorLink, generateTripAdvisorLink } from '../utils/affiliateLinks';

type Props = {
  currentDay: number;
  plan: DayPlan[];
  setPlan: (plan: DayPlan[]) => void;
  openSlot: (slot: string) => void;
  onAutoFill?: () => void;
  loadingProgress?: number;
  city?: string;
  vibe?: string;
  daysCount?: number;
};

const SLOT_ORDER = [
  { key: 'hotel',     label: 'Hotel',              time: 'Check-in' },
  { key: 'breakfast', label: 'Breakfast',           time: '8 AM' },
  { key: 'activity',  label: 'Morning Activity',    time: '10 AM' },
  { key: 'lunch',     label: 'Lunch',               time: '12:30 PM' },
  { key: 'activity2', label: 'Afternoon Activity',  time: '2:30 PM' },
  { key: 'coffee',    label: 'Coffee Break',        time: '4 PM' },
  { key: 'dinner',    label: 'Dinner',              time: '7 PM' },
] as const;

export default function DragDropDayPlanner({ currentDay, plan, setPlan, openSlot, onAutoFill, loadingProgress, city, vibe, daysCount }: Props) {
  const currentDayData = plan[currentDay - 1] || {};
  const [selectedPlace, setSelectedPlace] = useState<SelectedItem | null>(null);
  const [showCopyMenu, setShowCopyMenu] = useState(false);

  const filledCount = SLOT_ORDER.filter(slot => currentDayData[slot.key as keyof DayPlan]).length;

  const handleCopyToDay = (targetDay: number) => {
    const newPlan = [...plan];
    newPlan[targetDay - 1] = { ...currentDayData };
    setPlan(newPlan);
    setShowCopyMenu(false);
  };

  const removeItem = (slot: string) => {
    const newPlan = [...plan];
    const newDayData = { ...currentDayData };
    delete (newDayData as any)[slot];
    newPlan[currentDay - 1] = newDayData;
    setPlan(newPlan);
  };

  const handleRegenerate = async (slot: string) => {
    const excludeNames = Object.values(currentDayData)
      .filter((item): item is SelectedItem =>
        item != null && typeof item === 'object' && 'name' in item
      )
      .map(item => item.name);

    try {
      const response = await fetch('/api/regenerate-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: city || '', vibe: vibe || 'popular', slot, excludeNames }),
      });
      const data = await response.json();
      if (data.suggestion) {
        const newPlan = [...plan];
        (newPlan[currentDay - 1] as any) = { ...currentDayData, [slot]: data.suggestion };
        setPlan(newPlan);
      }
    } catch (error) {
      console.error('Regenerate failed:', error);
    }
  };

  return (
    <div className="rounded-2xl bg-white/90 backdrop-blur border shadow-sm overflow-visible">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-sm">Day {currentDay}</h2>
          <span className="text-xs text-slate-400">{filledCount}/{SLOT_ORDER.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {filledCount > 0 && daysCount && daysCount > 1 && (
            <div className="relative">
              <button
                onClick={() => setShowCopyMenu(!showCopyMenu)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                title="Copy to another day"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              {showCopyMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowCopyMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg py-1 z-40 min-w-[100px]">
                    {Array.from({ length: daysCount }, (_, i) => i + 1)
                      .filter(d => d !== currentDay)
                      .map(d => (
                        <button
                          key={d}
                          onClick={() => handleCopyToDay(d)}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50"
                        >
                          Day {d}
                        </button>
                      ))}
                  </div>
                </>
              )}
            </div>
          )}
          {onAutoFill && (
            <button
              onClick={onAutoFill}
              disabled={!!(loadingProgress && loadingProgress > 0)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-50"
            >
              <Sparkles className="w-3 h-3" />
              {loadingProgress && loadingProgress > 0 ? 'Filling...' : 'Auto-fill'}
            </button>
          )}
        </div>
      </div>

      {/* Slots */}
      <div className="divide-y">
        {SLOT_ORDER.map((slot) => {
          const item = currentDayData[slot.key as keyof DayPlan] as SelectedItem | undefined;
          const isHotel = slot.key === 'hotel';
          const isActivity = slot.key === 'activity' || slot.key === 'activity2';
          const isFood = ['breakfast', 'lunch', 'dinner', 'coffee'].includes(slot.key);

          if (!item) {
            // Empty slot — compact add button
            return (
              <button
                key={slot.key}
                onClick={() => openSlot(slot.key)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg border-2 border-dashed border-slate-200 group-hover:border-indigo-300 flex items-center justify-center">
                  <Plus className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-slate-400 group-hover:text-indigo-600">{slot.label}</span>
                </div>
                <span className="text-[10px] text-slate-300">{slot.time}</span>
              </button>
            );
          }

          // Filled slot
          return (
            <div
              key={slot.key}
              className="group flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors"
            >
              {/* Photo */}
              <div className="relative flex-shrink-0">
                <PlacePhoto src={item.photo} name={item.name ?? slot.label} size={36} rounded="lg" />
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white shadow flex items-center justify-center">
                  {getSlotIcon(slot.key, "w-2.5 h-2.5 text-indigo-600")}
                </div>
              </div>

              {/* Time */}
              <span className="text-[10px] text-slate-400 w-12 flex-shrink-0">{slot.time}</span>

              {/* Content */}
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => setSelectedPlace(item)}
              >
                <div className="text-sm font-medium text-slate-800 truncate">{item.name}</div>
                {item.area && <div className="text-[10px] text-slate-400 truncate">{item.area}</div>}
              </div>

              {/* Actions — always visible */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => openSlot(slot.key)}
                  className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                  title={`Change ${slot.label}`}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => removeItem(slot.key)}
                  className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                  title={`Remove ${slot.label}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedPlace && (
        <PlaceDetails place={selectedPlace} onClose={() => setSelectedPlace(null)} />
      )}
    </div>
  );
}
