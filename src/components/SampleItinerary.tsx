import React, { useState } from 'react';
import { Calendar, Download, Share2, X, MapPin, Clock } from 'lucide-react';
import { DayPlan, Vibe, ApiSuggestion } from '../lib/types';
import { fetchAllPlaces, detectApiBase } from '../lib/api';

type Props = {
  city: string;
  vibe: Vibe;
  daysCount: number;
  onClose: () => void;
  onApplyPlan: (plan: DayPlan[]) => void;
};

type SampleDay = {
  day: number;
  hotel?: ApiSuggestion;
  breakfast?: ApiSuggestion;
  activity?: ApiSuggestion;
  lunch?: ApiSuggestion;
  coffee?: ApiSuggestion;
  dinner?: ApiSuggestion;
  notes: string;
};

export default function SampleItinerary({ city, vibe, daysCount, onClose, onApplyPlan }: Props) {
  const [samplePlan, setSamplePlan] = useState<SampleDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const API_BASE = detectApiBase();

  const generateSamplePlan = async () => {
    if (!API_BASE) {
      setError('API not available');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const slots = ['hotel', 'breakfast', 'activity', 'lunch', 'coffee', 'dinner'] as const;
      const plan: SampleDay[] = [];
      
      for (let day = 1; day <= daysCount; day++) {
        const dayData: SampleDay = {
          day,
          notes: getNotesForDay(day, vibe, city)
        };
        
        // Fetch real suggestions for each slot
        for (const slot of slots) {
          try {
            const params = new URLSearchParams({
              city,
              vibe,
              slot,
              limit: '5' // Get more options for variety
            });
            
            const result = await fetchAllPlaces(API_BASE, params, 1);
            if (result.items.length > 0) {
              // Use different items for variety across days and slots
              const index = ((day - 1) * 6 + slots.indexOf(slot)) % result.items.length;
              dayData[slot] = result.items[index];
            }
          } catch (err) {
            console.error(`Failed to fetch ${slot} for day ${day}:`, err);
          }
        }
        
        plan.push(dayData);
      }
      
      setSamplePlan(plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate itinerary');
    } finally {
      setLoading(false);
    }
  };

  const getNotesForDay = (day: number, vibe: Vibe, city: string): string => {
    const vibeNotes = {
      popular: [
        `Discover the best of ${city} with top-rated attractions and dining`,
        `Experience ${city}'s most recommended spots and local favorites`,
        `Enjoy ${city}'s highlights with highly-rated places and activities`
      ],
      romantic: [
        `Perfect romantic day in ${city} - start slow and enjoy intimate moments`,
        `Focus on scenic spots and cozy atmospheres around ${city}`,
        `End with a romantic dinner and evening stroll through ${city}`
      ],
      family: [
        `Family-friendly day in ${city} with something for everyone`,
        `Kid-friendly spots in ${city} with easy accessibility`,
        `Mix of education and entertainment for all ages in ${city}`
      ],
      adventurous: [
        `Action-packed day exploring the best of ${city}`,
        `Off-the-beaten-path discoveries and local favorites in ${city}`,
        `High-energy activities and unique ${city} experiences`
      ]
    };
    
    const notes = vibeNotes[vibe];
    return notes[(day - 1) % notes.length];
  };

  const applyToPlanner = () => {
    const plan: DayPlan[] = samplePlan.map(day => ({
      hotel: day.hotel ? {
        name: day.hotel.name,
        url: day.hotel.url,
        area: day.hotel.area,
        lat: day.hotel.lat,
        lng: day.hotel.lng,
        desc: day.hotel.desc,
        placeId: day.hotel.placeId
      } : undefined,
      breakfast: day.breakfast ? {
        name: day.breakfast.name,
        url: day.breakfast.url,
        area: day.breakfast.area,
        cuisine: day.breakfast.cuisine,
        price: day.breakfast.price,
        lat: day.breakfast.lat,
        lng: day.breakfast.lng,
        desc: day.breakfast.desc,
        placeId: day.breakfast.placeId
      } : undefined,
      activity: day.activity ? {
        name: day.activity.name,
        url: day.activity.url,
        area: day.activity.area,
        lat: day.activity.lat,
        lng: day.activity.lng,
        desc: day.activity.desc,
        placeId: day.activity.placeId
      } : undefined,
      lunch: day.lunch ? {
        name: day.lunch.name,
        url: day.lunch.url,
        area: day.lunch.area,
        cuisine: day.lunch.cuisine,
        price: day.lunch.price,
        lat: day.lunch.lat,
        lng: day.lunch.lng,
        desc: day.lunch.desc,
        placeId: day.lunch.placeId
      } : undefined,
      coffee: day.coffee ? {
        name: day.coffee.name,
        url: day.coffee.url,
        area: day.coffee.area,
        cuisine: day.coffee.cuisine,
        price: day.coffee.price,
        lat: day.coffee.lat,
        lng: day.coffee.lng,
        desc: day.coffee.desc,
        placeId: day.coffee.placeId
      } : undefined,
      dinner: day.dinner ? {
        name: day.dinner.name,
        url: day.dinner.url,
        area: day.dinner.area,
        cuisine: day.dinner.cuisine,
        price: day.dinner.price,
        lat: day.dinner.lat,
        lng: day.dinner.lng,
        desc: day.dinner.desc,
        placeId: day.dinner.placeId
      } : undefined,
      notes: day.notes
    }));
    
    onApplyPlan(plan);
  };

  const exportToCSV = () => {
    const headers = ['Day', 'Hotel', 'Breakfast', 'Activity', 'Lunch', 'Coffee', 'Dinner', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...samplePlan.map(day => [
        day.day,
        `"${day.hotel?.name || 'TBD'}"`,
        `"${day.breakfast?.name || 'TBD'}"`,
        `"${day.activity?.name || 'TBD'}"`,
        `"${day.lunch?.name || 'TBD'}"`,
        `"${day.coffee?.name || 'TBD'}"`,
        `"${day.dinner?.name || 'TBD'}"`,
        `"${day.notes}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${city}-${vibe}-itinerary.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const shareItinerary = async () => {
    const text = samplePlan.map(day => 
      `Day ${day.day}:\n🏨 ${day.hotel?.name || 'TBD'}\n🍳 ${day.breakfast?.name || 'TBD'}\n🎯 ${day.activity?.name || 'TBD'}\n🍽️ ${day.lunch?.name || 'TBD'}\n☕ ${day.coffee?.name || 'TBD'}\n🍷 ${day.dinner?.name || 'TBD'}\n📝 ${day.notes}\n`
    ).join('\n');

    if (navigator.share) {
      await navigator.share({
        title: `${vibe} trip to ${city}`,
        text: `${daysCount}-day ${vibe} itinerary for ${city}:\n\n${text}`
      });
    } else {
      navigator.clipboard.writeText(text);
      alert('Itinerary copied to clipboard!');
    }
  };

  React.useEffect(() => {
    generateSamplePlan();
  }, [city, vibe, daysCount]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-[min(900px,95vw)] max-h-[95vh] overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Sample {daysCount}-Day Itinerary
              </h2>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="w-4 h-4" />
                {city} • {vibe} vibe
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto" style={{maxHeight: 'calc(95vh - 180px)'}}>
          <div className="p-4">
          {loading ? (
            <div className="text-center py-8">Generating your perfect itinerary with real places...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">{error}</div>
          ) : (
            <div className="space-y-6">
              {samplePlan.map((day) => (
                <div key={day.day} className="border rounded-lg p-4 bg-slate-50">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Day {day.day}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div><strong>🏨 Hotel:</strong> {day.hotel?.name || 'TBD'}</div>
                    <div><strong>🍳 Breakfast:</strong> {day.breakfast?.name || 'TBD'}</div>
                    <div><strong>🎯 Activity:</strong> {day.activity?.name || 'TBD'}</div>
                    <div><strong>🍽️ Lunch:</strong> {day.lunch?.name || 'TBD'}</div>
                    <div><strong>☕ Coffee:</strong> {day.coffee?.name || 'TBD'}</div>
                    <div><strong>🍷 Dinner:</strong> {day.dinner?.name || 'TBD'}</div>
                  </div>
                  <div className="mt-3 text-sm text-slate-600 italic">
                    {day.notes}
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>

        <div className="p-4 border-t bg-slate-50 flex gap-3">
          <button
            onClick={applyToPlanner}
            disabled={loading || samplePlan.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            Apply to Planner
          </button>
          <button
            onClick={exportToCSV}
            disabled={loading || samplePlan.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={shareItinerary}
            disabled={loading || samplePlan.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}