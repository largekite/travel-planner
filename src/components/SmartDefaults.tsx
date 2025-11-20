import React from 'react';
import { MapPin, Clock, Users, Heart, Mountain } from 'lucide-react';
import { VIBES, Vibe } from '../lib/types';

const POPULAR_CITIES = ["St. Louis", "Chicago", "New York", "San Francisco", "Los Angeles", "Miami"];

const VIBE_PRESETS: Record<Vibe, { icon: any; slots: string[]; description: string; color: string }> = {
  romantic: { 
    icon: Heart, 
    slots: ["dinner", "coffee"], 
    description: "Perfect for couples",
    color: "rose"
  },
  family: { 
    icon: Users, 
    slots: ["breakfast", "activity", "lunch"], 
    description: "Kid-friendly activities",
    color: "blue"
  },
  adventurous: { 
    icon: Mountain, 
    slots: ["activity", "lunch", "activity"], 
    description: "Outdoor experiences",
    color: "green"
  }
};

type Props = {
  onCitySelect: (city: string) => void;
  onVibeSelect: (vibe: Vibe) => void;
  onQuickFill: (preset: any) => void;
};

export default function SmartDefaults({ onCitySelect, onVibeSelect, onQuickFill }: Props) {
  return (
    <div className="space-y-4">
      {/* Popular Cities */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4 text-slate-600" />
          <span className="text-sm font-medium text-slate-700">Popular Destinations</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {POPULAR_CITIES.map(city => (
            <button
              key={city}
              onClick={() => onCitySelect(city)}
              className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
            >
              {city}
            </button>
          ))}
        </div>
      </div>


    </div>
  );
}