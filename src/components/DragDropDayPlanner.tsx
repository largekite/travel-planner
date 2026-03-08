import { useState } from 'react';
import { Clock, X, CalendarX, Copy, CheckCircle2 } from 'lucide-react';
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
  { key: 'hotel',     label: 'Hotel',               time: 'Check-in' },
  { key: 'breakfast', label: 'Breakfast',            time: '8:00 AM' },
  { key: 'activity',  label: 'Morning Activity',     time: '10:00 AM' },
  { key: 'lunch',     label: 'Lunch',                time: '12:30 PM' },
  { key: 'activity2', label: 'Afternoon Activity',   time: '2:30 PM' },
  { key: 'coffee',    label: 'Coffee Break',         time: '4:00 PM' },
  { key: 'dinner',    label: 'Dinner',               time: '7:00 PM' },
] as const;

export default function DragDropDayPlanner({ currentDay, plan, setPlan, openSlot, onAutoFill, loadingProgress, city, vibe, daysCount }: Props) {
  const currentDayData = plan[currentDay - 1] || {};
  const [selectedPlace, setSelectedPlace] = useState<SelectedItem | null>(null);
  const [showCopyMenu, setShowCopyMenu] = useState(false);

  const filledCount = SLOT_ORDER.filter(slot => currentDayData[slot.key as keyof DayPlan]).length;
  const completionPercent = Math.round((filledCount / SLOT_ORDER.length) * 100);

  const handleCopyToDay = (targetDay: number) => {
    const newPlan = [...plan];
    newPlan[targetDay - 1] = { ...currentDayData };
    setPlan(newPlan);
    setShowCopyMenu(false);
  };

  const items = SLOT_ORDER.map(slot => ({
    id: slot.key,
    slot: slot.key,
    label: slot.label,
    time: slot.time,
    item: currentDayData[slot.key as keyof DayPlan] as SelectedItem | undefined
  })).filter(({ item }) => item);

  const emptySlots = SLOT_ORDER.filter(slot => !currentDayData[slot.key as keyof DayPlan]);

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
        body: JSON.stringify({
          city: city || '',
          vibe: vibe || 'popular',
          slot,
          excludeNames,
        }),
      });

      const data = await response.json();
      if (data.suggestion) {
        const newPlan = [...plan];
        const newDayData = { ...currentDayData };
        (newDayData as any)[slot] = data.suggestion;
        newPlan[currentDay - 1] = newDayData;
        setPlan(newPlan);
      }
    } catch (error) {
      console.error('Regenerate failed:', error);
    }
  };

  return (
    <div className="rounded-2xl bg-white/90 backdrop-blur border p-5 shadow-lg">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-lg">Day {currentDay} Itinerary</h2>
          {/* Completion badge */}
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
            completionPercent === 100
              ? 'bg-emerald-100 text-emerald-700'
              : completionPercent > 0
              ? 'bg-amber-100 text-amber-700'
              : 'bg-slate-100 text-slate-500'
          }`}>
            {completionPercent === 100 && <CheckCircle2 className="w-3 h-3" />}
            {filledCount}/{SLOT_ORDER.length}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Copy day to another day */}
          {filledCount > 0 && daysCount && daysCount > 1 && (
            <div className="relative">
              <button
                onClick={() => setShowCopyMenu(!showCopyMenu)}
                className="px-2.5 py-1.5 rounded-lg border bg-white hover:bg-slate-50 text-sm flex items-center gap-1.5"
                title="Copy this day's plan to another day"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy day
              </button>
              {showCopyMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg py-1 z-20 min-w-[120px]">
                  {Array.from({ length: daysCount }, (_, i) => i + 1)
                    .filter(d => d !== currentDay)
                    .map(d => (
                      <button
                        key={d}
                        onClick={() => handleCopyToDay(d)}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50"
                      >
                        Day {d}
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}
          {onAutoFill && (
            <button
              onClick={onAutoFill}
              disabled={!!(loadingProgress && loadingProgress > 0)}
              className="px-3 py-1.5 rounded-lg border bg-white hover:bg-slate-50 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title="Automatically fill day with popular places"
            >
              {loadingProgress && loadingProgress > 0 ? 'Filling…' : 'Auto-fill'}
            </button>
          )}
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Timeline
          </div>
        </div>
      </div>

      <div className="relative pl-8">
        {/* Vertical timeline line */}
        {items.length > 0 && (
          <div className="absolute left-2 top-4 bottom-4 w-0.5 bg-gradient-to-b from-indigo-200 via-indigo-400 to-indigo-200" />
        )}

        <div className="space-y-4">
          {/* Empty state */}
          {items.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-8 text-slate-400">
              <CalendarX className="w-10 h-10 opacity-40" />
              <div className="text-center">
                <div className="text-sm font-medium text-slate-500">Your day is empty</div>
                <div className="text-xs mt-0.5">Click a slot below or use Auto-fill to get started</div>
              </div>
            </div>
          )}

          {items.map((item) => {
            const isHotel = item.slot === 'hotel';
            const isActivity = item.slot === 'activity' || item.slot === 'activity2';
            const isFood = item.slot === 'breakfast' || item.slot === 'lunch' || item.slot === 'dinner' || item.slot === 'coffee';

            return (
              <div key={item.id} className="relative flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                {/* Timeline dot */}
                <div className="absolute -left-7 w-4 h-4 rounded-full bg-indigo-500 border-2 border-white shadow-sm z-10" />

                {/* Photo / icon */}
                <div className="relative flex-shrink-0">
                  <PlacePhoto
                    src={item.item?.photo}
                    name={item.item?.name ?? item.label}
                    size={44}
                    rounded="lg"
                  />
                  {/* Slot-type badge overlaid on the photo */}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white shadow flex items-center justify-center">
                    {getSlotIcon(item.slot, "w-3 h-3 text-indigo-600")}
                  </div>
                </div>

                {/* Time */}
                <div className="flex items-center gap-2 text-slate-500 min-w-[80px]">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-medium">{item.time}</span>
                </div>

                {/* Content */}
                <div
                  className="flex-1 min-w-0 cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors"
                  onClick={() => item.item && setSelectedPlace(item.item)}
                  title="Click to view details"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.item && setSelectedPlace(item.item); } }}
                  aria-label={`View details for ${item.item?.name}`}
                >
                  <div className="font-medium text-sm text-slate-700">{item.label}</div>
                  <div className="text-sm text-slate-900 font-medium">{item.item?.name}</div>
                  {item.item?.area && (
                    <div className="text-xs text-slate-500 mt-0.5">{item.item.area}</div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isHotel && item.item && city && (
                    <AffiliateButton type="hotel" href={generateHotelsLink(city, item.item.name)} />
                  )}
                  {isActivity && item.item && city && (
                    <AffiliateButton type="activity" href={generateViatorLink(city, item.item.name)} />
                  )}
                  {isFood && item.item && city && (
                    <AffiliateButton type="activity" href={generateTripAdvisorLink(city, item.item.name)} label="TripAdvisor" />
                  )}
                  <RegenerateButton onRegenerate={() => handleRegenerate(item.slot)} />
                  <button
                    onClick={() => removeItem(item.slot)}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                    title={`Remove ${item.label}`}
                    aria-label={`Remove ${item.label}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add empty slot buttons */}
          {emptySlots.map(slot => (
            <button
              key={slot.key}
              onClick={() => openSlot(slot.key)}
              className="w-full p-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
              aria-label={`Add ${slot.label} at ${slot.time}`}
            >
              <Clock className="w-4 h-4" />
              <span>+ Add {slot.label} <span className="text-slate-400">({slot.time})</span></span>
            </button>
          ))}
        </div>
      </div>

      {selectedPlace && (
        <PlaceDetails place={selectedPlace} onClose={() => setSelectedPlace(null)} />
      )}
    </div>
  );
}
