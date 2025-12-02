import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { GripVertical, X, Eye } from 'lucide-react';
import { DayPlan, SelectedItem } from '../lib/types';
import PlaceDetails from './PlaceDetails';

type Props = {
  currentDay: number;
  plan: DayPlan[];
  setPlan: (plan: DayPlan[]) => void;
  openSlot: (slot: string) => void;
};

const SLOT_ORDER = ['hotel', 'breakfast', 'activity', 'lunch', 'coffee', 'dinner'] as const;

// Suppress react-beautiful-dnd deprecation warnings
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args) => {
    if (args[0]?.includes?.('defaultProps')) return;
    originalError(...args);
  };
}

export default function DragDropDayPlanner({ currentDay, plan, setPlan, openSlot }: Props) {
  const currentDayData = plan[currentDay - 1] || {};
  const [selectedPlace, setSelectedPlace] = useState<SelectedItem | null>(null);
  
  const items = SLOT_ORDER.map(slot => ({
    id: slot,
    slot,
    item: currentDayData[slot] as SelectedItem | undefined
  })).filter(({ item }) => item);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);

    // Update plan with new order
    const newDayData = { ...currentDayData };
    SLOT_ORDER.forEach(slot => delete newDayData[slot]);
    
    newItems.forEach((item, index) => {
      if (SLOT_ORDER[index]) {
        (newDayData as any)[SLOT_ORDER[index]] = item.item;
      }
    });

    const newPlan = [...plan];
    newPlan[currentDay - 1] = newDayData;
    setPlan(newPlan);
  };

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
        <h2 className="font-semibold">Day {currentDay} Plan</h2>
        <div className="text-xs text-slate-500">Drag to reorder</div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="day-slots">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`flex items-center gap-3 p-3 rounded-lg border bg-white ${
                        snapshot.isDragging ? 'shadow-lg' : 'shadow-sm'
                      }`}
                    >
                      <div {...provided.dragHandleProps} className="cursor-move text-slate-400">
                        <GripVertical className="w-4 h-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium capitalize text-sm">{item.slot}</div>
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
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              
              {/* Add new slot buttons */}
              {SLOT_ORDER.filter(slot => !currentDayData[slot]).map(slot => (
                <button
                  key={slot}
                  onClick={() => openSlot(slot)}
                  className="w-full p-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                >
                  + Add {slot}
                </button>
              ))}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      
      {selectedPlace && (
        <PlaceDetails
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
        />
      )}
    </div>
  );
}