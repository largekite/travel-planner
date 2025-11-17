import React from 'react';
import { MapPin, Clock, Users, Heart, Mountain } from 'lucide-react';

const POPULAR_CITIES = ["St. Louis", "Chicago", "New York", "San Francisco", "Los Angeles", "Miami"];

const VIBE_PRESETS = {
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
  onVibeSelect: (vibe: keyof typeof VIBE_PRESETS) => void;
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

      {/* Vibe Presets */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-slate-600" />
          <span className="text-sm font-medium text-slate-700">Quick Start Templates</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {Object.entries(VIBE_PRESETS).map(([vibe, preset]) => {
            const Icon = preset.icon;
            return (
              <button
                key={vibe}
                onClick={() => {
                  onVibeSelect(vibe as keyof typeof VIBE_PRESETS);
                  onQuickFill(preset);
                }}
                className={`p-3 rounded-lg border-2 border-${preset.color}-200 bg-${preset.color}-50 hover:bg-${preset.color}-100 transition-colors text-left`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 text-${preset.color}-600`} />
                  <span className="font-medium capitalize">{vibe}</span>
                </div>
                <p className="text-xs text-slate-600">{preset.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}