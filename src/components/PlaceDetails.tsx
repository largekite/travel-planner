import React, { useState, useEffect } from "react";
import { Star, Clock, Phone, ExternalLink, MapPin, Award, ArrowLeft, Plus, Loader2 } from "lucide-react";
import { ApiSuggestion } from "../lib/types";

type Props = {
  place: ApiSuggestion;
  onClose: () => void;
  onChoose?: (place: ApiSuggestion) => void;
  city?: string;
};

type YelpReview = {
  author: string;
  rating: number;
  text: string;
  isElite: boolean;
  timeCreated?: string;
};

type PlaceDetails = {
  photos?: string[];
  reviews?: Array<{
    author: string;
    rating: number;
    text: string;
  }>;
  hours?: string[];
  phone?: string;
  website?: string;
  yelp?: {
    rating?: number;
    reviewCount?: number;
    url?: string;
    reviews: YelpReview[];
  };
};

export default function PlaceDetails({ place, onClose, onChoose, city }: Props) {
  const [details, setDetails] = useState<PlaceDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Full place object:', place);
    console.log('Place placeId:', place.placeId);
    
    // Skip API call if no placeId
    if (!place.placeId) {
      setDetails({
        photos: [],
        reviews: [],
        hours: [],
        phone: undefined,
        website: place.url
      });
      setLoading(false);
      return;
    }

    async function fetchPlaceDetails() {
      try {
        const params = new URLSearchParams({ placeId: place.placeId! });
        if (place.name) params.set("name", place.name);
        if (place.lat) params.set("lat", String(place.lat));
        if (place.lng) params.set("lng", String(place.lng));
        if (city) params.set("city", city);
        const response = await fetch(`/api/place-details?${params}`);
        if (response.ok) {
          const data = await response.json();
          setDetails(data);
        } else {
          const errorText = await response.text();
          console.error('API error:', errorText);
          setDetails({
            photos: [],
            reviews: [],
            hours: [],
            phone: undefined,
            website: place.url
          });
        }
      } catch (error) {
        console.error('Fetch error:', error);
        setDetails({
          photos: [],
          reviews: [],
          hours: [],
          phone: undefined,
          website: place.url
        });
      } finally {
        setLoading(false);
      }
    }

    fetchPlaceDetails();
  }, [place]);

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-[min(600px,90vw)] max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 flex-shrink-0" title="Back to results">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold truncate">{place.name}</h2>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate">{place.area}</span>
              </div>
            </div>
            {onChoose && (
              <button
                onClick={() => onChoose(place)}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
                Add to Day
              </button>
            )}
          </div>
        </div>

        <div className="overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="p-8 flex flex-col items-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Loading photos & reviews...</span>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Photos — responsive: 1 col on mobile, 2 on wider */}
              {details?.photos && details.photos.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {details.photos.map((photo, i) => (
                    <img key={i} src={photo} alt="" className="rounded-lg w-full h-40 sm:h-32 object-cover" />
                  ))}
                </div>
              )}

              {/* Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span>{place.ratings?.google?.toFixed(1)} ({place.ratings?.googleReviews} reviews)</span>
                  </div>
                  {place.price && (
                    <div className="mb-2">Price: {place.price}</div>
                  )}
                </div>
                <div>
                  {details?.phone && (
                    <div className="flex items-center gap-2 mb-2">
                      <Phone className="w-4 h-4" />
                      <a href={`tel:${details.phone}`} className="text-blue-600">{details.phone}</a>
                    </div>
                  )}
                  {details?.website && (
                    <div className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4" />
                      <a href={details.website} target="_blank" rel="noopener" className="text-blue-600">Website</a>
                    </div>
                  )}
                </div>
              </div>

              {/* Hours */}
              {details?.hours && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">Hours</span>
                  </div>
                  <div className="text-sm space-y-1">
                    {details.hours.map((hour, i) => (
                      <div key={i}>{hour}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Google Reviews */}
              {details?.reviews && details.reviews.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    Google Reviews
                  </h3>
                  <div className="space-y-3">
                    {details.reviews.map((review, i) => (
                      <div key={i} className="border-l-2 border-slate-200 pl-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{review.author}</span>
                          <div className="flex">
                            {Array.from({ length: 5 }, (_, j) => (
                              <Star key={j} className={`w-3 h-3 ${j < review.rating ? 'text-yellow-500 fill-current' : 'text-slate-300'}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-slate-600">{review.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Yelp — What Locals Recommend */}
              {details?.yelp && details.yelp.reviews.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-red-600 text-white text-[10px] font-bold">Y</span>
                      What Locals Recommend
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      {details.yelp.rating && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                          {details.yelp.rating.toFixed(1)}
                        </span>
                      )}
                      {details.yelp.reviewCount && (
                        <span>({details.yelp.reviewCount.toLocaleString()} reviews)</span>
                      )}
                      {details.yelp.url && (
                        <a href={details.yelp.url} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-700">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {details.yelp.reviews.map((review, i) => (
                      <div key={i} className={`border-l-2 pl-3 ${review.isElite ? 'border-red-400 bg-red-50/50 rounded-r-lg py-2 pr-2' : 'border-slate-200'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{review.author}</span>
                          {review.isElite && (
                            <span className="inline-flex items-center gap-0.5 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              <Award className="w-2.5 h-2.5" />
                              Elite
                            </span>
                          )}
                          <div className="flex">
                            {Array.from({ length: 5 }, (_, j) => (
                              <Star key={j} className={`w-3 h-3 ${j < review.rating ? 'text-red-500 fill-current' : 'text-slate-300'}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-slate-600">{review.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}