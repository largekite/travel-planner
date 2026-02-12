// Hero image component with city destination photo
import { useState, useEffect } from 'react';
import { detectApiBase } from '../lib/api';

type Props = {
  city: string;
};

export default function HeroImage({ city }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [photographer, setPhotographer] = useState<string | null>(null);

  useEffect(() => {
    if (!city) {
      setLoading(false);
      return;
    }

    async function fetchImage() {
      try {
        const apiBase = detectApiBase();
        const response = await fetch(`${apiBase}/api/unsplash?city=${encodeURIComponent(city)}`);
        const data = await response.json();
        setImageUrl(data.imageUrl);
        setPhotographer(data.photographer);
      } catch (error) {
        console.error('Failed to fetch hero image:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchImage();
  }, [city]);

  if (!city || loading) return null;

  return (
    <div className="relative w-full h-64 rounded-2xl overflow-hidden shadow-xl mb-6">
      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt={`${city} destination`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
          <div className="absolute bottom-6 left-6 text-white">
            <h1 className="text-4xl font-bold mb-2">Your {city} Adventure</h1>
            <p className="text-sm opacity-90">Powered by AI-curated recommendations</p>
          </div>
          {photographer && (
            <div className="absolute bottom-2 right-2 text-white text-xs opacity-70">
              Photo by {photographer}
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-4xl font-bold mb-2">Your {city} Adventure</h1>
            <p className="text-sm opacity-90">Powered by AI-curated recommendations</p>
          </div>
        </div>
      )}
    </div>
  );
}
