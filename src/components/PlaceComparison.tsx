import React from "react";
import { X, Star, ExternalLink, MapPin, DollarSign, Check, ChevronUp, ChevronDown } from "lucide-react";
import { ApiSuggestion } from "../lib/types";
import PlacePhoto from "./PlacePhoto";

type Props = {
  places: ApiSuggestion[];
  onRemove: (index: number) => void;
  onChoose: (place: ApiSuggestion) => void;
  onClear: () => void;
};

export default function PlaceComparison({ places, onRemove, onChoose, onClear }: Props) {
  const [expanded, setExpanded] = React.useState(false);

  if (places.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-3xl mx-4 mb-0">
        {/* Collapsed bar — always visible */}
        <div
          className="bg-white border border-b-0 rounded-t-xl shadow-lg px-4 py-2.5 flex items-center gap-3 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-sm font-semibold text-slate-700">
              Compare ({places.length})
            </span>
            <div className="flex gap-1.5 overflow-hidden">
              {places.map((p, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 rounded-full px-2 py-0.5 text-xs font-medium truncate max-w-[120px]"
                >
                  {p.name}
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemove(i); }}
                    className="text-indigo-400 hover:text-indigo-700 flex-shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </div>

        {/* Expanded comparison panel */}
        {expanded && (
          <div className="bg-white border border-t-0 shadow-lg overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[50vh]">
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
        )}
      </div>
    </div>
  );
}
