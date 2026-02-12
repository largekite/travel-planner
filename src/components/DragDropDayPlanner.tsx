import React, { useState } from 'react';
import { Clock, X } from 'lucide-react';
import { DayPlan, SelectedItem } from '../lib/types';
import PlaceDetails from './PlaceDetails';
import AffiliateButton from './AffiliateButton';
import RegenerateButton from './RegenerateButton';
import { getSlotIcon } from '../utils/slotIcons';
import { generateBookingLink, generateViatorLink } from '../utils/affiliateLinks';

type Props = {
  currentDay: number;
  plan: DayPlan[];
  setPlan: (plan: DayPlan[]) => void;
  openSlot: (slot: string) => void;
  onAutoFill?: () => void;
  loadingProgress?: number;
  city?: string;
  vibe?: string;
};

const SLOT_ORDER = [
  { key: 'hotel', label: 'Hotel', time: 'Check-in' },
  { key: 'breakfast', label: 'Breakfast', time: '8:00 AM' },
  { key: 'activity', label: 'Morning Activity', time: '10:00 AM' },
  { key: 'lunch', label: 'Lunch', time: '12:30 PM' },
  { key: 'activity2', label: 'Afternoon Activity', time: '2:30 PM' },
  { key: 'coffee', label: 'Coffee Break', time: '4:00 PM' },
  { key: 'dinner', label: 'Dinner', time: '7:00 PM' }
] as const;



export default function DragDropDayPlanner({ currentDay, plan, setPlan, openSlot, onAutoFill, loadingProgress, city, vibe }: Props) {
  const currentDayData = plan[currentDay - 1] || {};
  const [selectedPlace, setSelectedPlace] = useState<SelectedItem | null>(null);

  const items = SLOT_ORDER.map(slot => ({
    id: slot.key,
    slot: slot.key,
    label: slot.label,
    time: slot.time,
    item: currentDayData[slot.key as keyof DayPlan] as SelectedItem | undefined
  })).filter(({ item }) => item);

  const removeItem = (slot: string) => {
    const newPlan = [...plan];
    const newDayData = { ...currentDayData };
    delete (newDayData as any)[slot];
    newPlan[currentDay - 1] = newDayData;
    setPlan(newPlan);
  };

  const handleRegenerate = async (slot: string) => {
    // Get all current names to exclude
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
        // Update the slot with new suggestion
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
        <h2 className="font-semibold text-lg">Day {currentDay} Itinerary</h2>
        <div className="flex items-center gap-3">
          {onAutoFill && (
            <button
              onClick={onAutoFill}
              disabled={loadingProgress && loadingProgress > 0}
              className="px-3 py-1.5 rounded-lg border bg-white hover:bg-slate-50 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title="Automatically fill day with popular places"
            >
              {loadingProgress && loadingProgress > 0 ? 'Filling...' : 'Auto-fill'}
            </button>
          )}
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Scheduled timeline
          </div>
        </div>
      </div>

      <div className="relative pl-8">
        {/* Vertical timeline line */}
        {items.length > 0 && (
          <div className="absolute left-2 top-4 bottom-4 w-0.5 bg-gradient-to-b from-indigo-200 via-indigo-400 to-indigo-200"></div>
        )}

        <div className="space-y-4">
          {items.map((item, index) => {
            const isHotel = item.slot === 'hotel';
            const isActivity = item.slot === 'activity' || item.slot === 'activity2';

            return (
              <div key={item.id} className="relative flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                {/* Timeline dot */}
                <div className="absolute -left-7 w-4 h-4 rounded-full bg-indigo-500 border-2 border-white shadow-sm z-10"></div>

                {/* Icon */}
                <div className="flex-shrink-0 p-2 rounded-lg bg-indigo-50">
                  {getSlotIcon(item.slot, "w-5 h-5 text-indigo-600")}
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
                >
                  <div className="font-medium text-sm text-slate-700">
                    {item.label}
                  </div>
                  <div className="text-sm text-slate-900 font-medium">{item.item?.name}</div>
                  {item.item?.area && (
                    <div className="text-xs text-slate-500 mt-0.5">{item.item.area}</div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isHotel && item.item && city && (
                    <AffiliateButton
                      type="hotel"
                      href={generateBookingLink(city, item.item.name)}
                    />
                  )}
                  {isActivity && item.item && city && (
                    <AffiliateButton
                      type="activity"
                      href={generateViatorLink(city, item.item.name)}
                    />
                  )}
                  <RegenerateButton onRegenerate={() => handleRegenerate(item.slot)} />
                  <button
                    onClick={() => removeItem(item.slot)}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                    title="Remove"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add new slot buttons */}
          {SLOT_ORDER.filter(slot => !currentDayData[slot.key as keyof DayPlan]).map(slot => (
            <button
              key={slot.key}
              onClick={() => openSlot(slot.key)}
              className="w-full p-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4" />
              <span>+ Add {slot.label} ({slot.time})</span>
            </button>
          ))}
        </div>
      </div>

      {selectedPlace && (
        <PlaceDetails
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
        />
      )}
    </div>
  );
}