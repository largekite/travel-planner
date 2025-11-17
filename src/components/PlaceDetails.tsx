import React, { useState, useEffect } from "react";
import { Star, Clock, Phone, ExternalLink, MapPin } from "lucide-react";
import { ApiSuggestion } from "../lib/types";

type Props = {
  place: ApiSuggestion;
  onClose: () => void;
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
};

export default function PlaceDetails({ place, onClose }: Props) {
  const [details, setDetails] = useState<PlaceDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call for place details
    const timer = setTimeout(() => {
      setDetails({
        photos: [
          `https://picsum.photos/400/300?random=${Math.floor(Math.random() * 1000)}`,
          `https://picsum.photos/400/300?random=${Math.floor(Math.random() * 1000)}`
        ],
        reviews: [
          { author: "John D.", rating: 4.5, text: "Great atmosphere and service!" },
          { author: "Sarah M.", rating: 5, text: "Perfect for a romantic dinner." }
        ],
        hours: ["Mon-Thu: 11am-10pm", "Fri-Sat: 11am-11pm", "Sun: 12pm-9pm"],
        phone: "(314) 555-0123",
        website: "https://example.com"
      });
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [place]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-[min(600px,90vw)] max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold">{place.name}</h2>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="w-4 h-4" />
                {place.area}
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              ×
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="p-4 text-center">Loading details...</div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Photos */}
              {details?.photos && (
                <div className="grid grid-cols-2 gap-2">
                  {details.photos.map((photo, i) => (
                    <img key={i} src={photo} alt="" className="rounded-lg w-full h-32 object-cover" />
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

              {/* Reviews */}
              {details?.reviews && (
                <div>
                  <h3 className="font-medium mb-2">Recent Reviews</h3>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}