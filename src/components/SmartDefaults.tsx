import { useEffect, useState, type ElementType } from 'react';
import { Zap, Heart, Users, Mountain, Star } from 'lucide-react';
import { VIBES, Vibe } from '../lib/types';

// ─── City cards with Wikipedia photos ─────────────────────────────────────────

const POPULAR_CITIES = [
  "New York City", "Chicago", "Los Angeles", "San Francisco", "Miami", "St. Louis",
];

// Wikipedia page titles for accurate lookups
const WIKI_TITLES: Record<string, string> = {
  "New York City": "New_York_City",
  "Chicago": "Chicago",
  "Los Angeles": "Los_Angeles",
  "San Francisco": "San_Francisco",
  "Miami": "Miami",
  "St. Louis": "St._Louis",
};

// Simple in-memory cache so switching back/forth doesn't re-fetch
const photoCache: Record<string, string> = {};

function CityCard({ city, onSelect }: { city: string; onSelect: () => void }) {
  const [photo, setPhoto] = useState<string | null>(photoCache[city] ?? null);

  useEffect(() => {
    if (photoCache[city]) return;
    const title = WIKI_TITLES[city] ?? city.replace(/ /g, '_');
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
      .then(r => r.json())
      .then(data => {
        const url = data.thumbnail?.source ?? data.originalimage?.source;
        if (url) {
          photoCache[city] = url;
          setPhoto(url);
        }
      })
      .catch(() => {/* silently skip */});
  }, [city]);

  // Deterministic gradient fallback
  const gradients = [
    'from-indigo-500 to-purple-600',
    'from-rose-500 to-orange-500',
    'from-emerald-500 to-cyan-500',
    'from-amber-500 to-red-500',
    'from-sky-500 to-indigo-600',
    'from-violet-500 to-pink-500',
  ];
  const fallbackGradient = gradients[
    city.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % gradients.length
  ];

  return (
    <button
      onClick={onSelect}
      className="relative overflow-hidden rounded-xl aspect-video group focus:outline-none focus:ring-2 focus:ring-indigo-400"
    >
      {/* Background: photo or gradient */}
      {photo ? (
        <img
          src={photo}
          alt={city}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${fallbackGradient}`} />
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent
                      group-hover:from-black/80 transition-all duration-200" />

      {/* City name */}
      <div className="absolute bottom-0 inset-x-0 p-2.5">
        <div className="text-white text-sm font-semibold drop-shadow leading-tight">{city}</div>
      </div>
    </button>
  );
}

// ─── Vibe presets ─────────────────────────────────────────────────────────────

const VIBE_PRESETS: Record<Vibe, { icon: ElementType; description: string; color: string }> = {
  popular:     { icon: Star,     description: 'Must-see landmarks',    color: 'indigo' },
  romantic:    { icon: Heart,    description: 'Perfect for couples',   color: 'rose'   },
  family:      { icon: Users,    description: 'Kid-friendly fun',      color: 'blue'   },
  adventurous: { icon: Mountain, description: 'Outdoor experiences',   color: 'green'  },
};

const COLOR_CLASSES: Record<string, string> = {
  indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100',
  rose:   'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100',
  blue:   'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
  green:  'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
};

// ─── Component ───────────────────────────────────────────────────────────────

type Props = {
  onCitySelect: (city: string) => void;
  onVibeSelect: (vibe: Vibe) => void;
  onQuickFill: (preset?: any) => void;
};

export default function SmartDefaults({ onCitySelect, onVibeSelect, onQuickFill }: Props) {
  return (
    <div className="space-y-5">
      {/* Popular destinations — photo grid */}
      <div>
        <div className="text-sm font-medium text-slate-600 mb-2">Popular Destinations</div>
        <div className="grid grid-cols-3 gap-2">
          {POPULAR_CITIES.map(city => (
            <CityCard
              key={city}
              city={city}
              onSelect={() => onCitySelect(city === "New York City" ? "New York" : city)}
            />
          ))}
        </div>
      </div>

      {/* Vibe presets */}
      <div>
        <div className="text-sm font-medium text-slate-600 mb-2">Trip Vibe</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {VIBES.map(v => {
            const preset = VIBE_PRESETS[v];
            const Icon = preset.icon as ElementType;
            return (
              <button
                key={v}
                onClick={() => onVibeSelect(v)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${COLOR_CLASSES[preset.color]}`}
              >
                <Icon className="w-4 h-4" />
                <span className="capitalize">{v}</span>
                <span className="text-[10px] opacity-70 font-normal">{preset.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick fill CTA */}
      <button
        onClick={() => onQuickFill()}
        className="w-full py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
      >
        <Zap className="w-4 h-4" />
        Auto-fill a full day for me
      </button>
    </div>
  );
}
