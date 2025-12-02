import React, { useState } from 'react';
import { Clock, X, Eye } from 'lucide-react';
import { DayPlan, SelectedItem } from '../lib/types';
import PlaceDetails from './PlaceDetails';

type Props = {
  currentDay: number;
  plan: DayPlan[];
  setPlan: (plan: DayPlan[]) => void;
  openSlot: (slot: string) => void;
};

const SLOT_ORDER = [
  { key: 'hotel', label: 'Hotel', time: 'Check-in' },
  { key: 'breakfast', label: 'Breakfast', time: '8:00 AM' },
  { key: 'activity', label: 'Morning Activity', time: '10:00 AM' },
  { key: 'lunch', label: 'Lunch', time: '12:30 PM' },
  { key: 'coffee', label: 'Afternoon Coffee', time: '3:00 PM' },
  { key: 'dinner', label: 'Dinner', time: '7:00 PM' }
] as const;



export default function DragDropDayPlanner({ currentDay, plan, setPlan, openSlot }: Props) {
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

  return (
    <div className="rounded-2xl bg-white/90 backdrop-blur border p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Day {currentDay} Itinerary</h2>
        <div className="text-xs text-slate-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Scheduled timeline
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border bg-white shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 min-w-[80px]">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">{item.time}</span>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{item.label}</div>
              <div className="text-sm text-slate-600 truncate">{item.item?.name}</div>
              {item.item?.area && (
                <div className="text-xs text-slate-500">{item.item.area}</div>
              )}
            </div>

            <div className="flex gap-1">
              {item.item?.placeId && (
                <button
                  onClick={() => setSelectedPlace(item.item!)}
                  className="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                  title="View details"
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => removeItem(item.slot)}
                className="p-1 text-slate-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        
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
      
      {selectedPlace && (
        <PlaceDetails
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
        />
      )}
    </div>
  );
}