import React from "react";
import { X, Star, ExternalLink, MapPin, DollarSign, Check } from "lucide-react";
import { ApiSuggestion } from "../lib/types";
import PlacePhoto from "./PlacePhoto";

type Props = {
  places: ApiSuggestion[];
  onRemove: (index: number) => void;
  onChoose: (place: ApiSuggestion) => void;
  onClear: () => void;
};

export default function PlaceComparison({ places, onRemove, onChoose, onClear }: Props) {
  if (places.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClear} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden mx-4 mb-0 sm:mb-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="font-semibold text-sm">Compare Places ({places.length})</h3>
          <div className="flex items-center gap-2">
            <button onClick={onClear} className="text-xs text-slate-500 hover:text-slate-700">
              Clear all
            </button>
            <button onClick={onClear} className="p-1 rounded hover:bg-slate-100">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Comparison grid */}
        <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(80vh - 52px)' }}>
          <div className="inline-flex min-w-full">
            {places.map((place, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-64 border-r last:border-r-0 flex flex-col"
              >
                {/* Photo */}
                <div className="p-3 pb-0">
                  <PlacePhoto
                    src={place.photo}
                    name={place.name}
                    size={220}
                    rounded="lg"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                </div>

                {/* Info */}
                <div className="p-3 flex-1 space-y-2">
                  {/* Name + remove */}
                  <div className="flex items-start justify-between gap-1">
                    <div className="font-medium text-sm leading-tight">{place.name}</div>
                    <button
                      onClick={() => onRemove(index)}
                      className="flex-shrink-0 p-0.5 text-slate-300 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Area */}
                  {place.area && (
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="w-3 h-3" />
                      {place.area}
                    </div>
                  )}

                  {/* Rating */}
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-sm font-medium">
                      {place.ratings?.google?.toFixed(1) || "N/A"}
                    </span>
                    {typeof place.ratings?.googleReviews === 'number' && (
                      <span className="text-xs text-slate-400">
                        ({place.ratings.googleReviews.toLocaleString()})
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  {place.price && (
                    <div className="flex items-center gap-1 text-xs">
                      <DollarSign className="w-3 h-3 text-slate-400" />
                      <span className="text-slate-600">{place.price}</span>
                    </div>
                  )}

                  {/* Cuisine */}
                  {place.cuisine && (
                    <div className="text-xs text-slate-500">{place.cuisine}</div>
                  )}

                  {/* Description */}
                  {place.desc && (
                    <div className="text-xs text-slate-500 line-clamp-3">{place.desc}</div>
                  )}
                </div>

                {/* Actions */}
                <div className="p-3 pt-0 space-y-1.5">
                  <button
                    onClick={() => onChoose(place)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Choose this
                  </button>
                  {place.url && (
                    <a
                      href={place.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs text-slate-600 hover:bg-slate-50"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View details
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
