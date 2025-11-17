import React from "react";
import { X, Star, ExternalLink } from "lucide-react";
import { ApiSuggestion } from "../lib/types";

type Props = {
  places: ApiSuggestion[];
  onRemove: (index: number) => void;
  onChoose: (place: ApiSuggestion) => void;
  onClear: () => void;
};

export default function PlaceComparison({ places, onRemove, onChoose, onClear }: Props) {
  if (places.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-xl shadow-lg border p-4 w-80 max-h-96 overflow-y-auto z-40">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium">Compare Places ({places.length})</h3>
        <button onClick={onClear} className="text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="space-y-3">
        {places.map((place, index) => (
          <div key={index} className="border rounded-lg p-3">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{place.name}</div>
                <div className="text-xs text-slate-500">{place.area}</div>
              </div>
              <button
                onClick={() => onRemove(index)}
                className="text-slate-400 hover:text-slate-600 ml-2"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500" />
                <span>{place.ratings?.google?.toFixed(1) || "N/A"}</span>
              </div>
              <div>{place.price || "N/A"}</div>
            </div>
            
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => onChoose(place)}
                className="flex-1 px-2 py-1 bg-indigo-50 hover:bg-indigo-100 rounded text-xs"
              >
                Choose
              </button>
              {place.url && (
                <a
                  href={place.url}
                  target="_blank"
                  rel="noopener"
                  className="px-2 py-1 border rounded text-xs hover:bg-slate-50"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}