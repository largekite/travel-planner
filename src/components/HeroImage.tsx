import { useState, useEffect } from 'react';

type Props = {
  city: string;
};

// In-memory cache shared across renders
const heroCache: Record<string, string> = {};

export default function HeroImage({ city }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(heroCache[city] ?? null);
  const [loading, setLoading] = useState(!heroCache[city]);

  useEffect(() => {
    if (!city) { setLoading(false); return; }
    if (heroCache[city]) { setImageUrl(heroCache[city]); setLoading(false); return; }

    setLoading(true);
    const title = city.replace(/ /g, '_');
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
      .then(r => r.json())
      .then(data => {
        const url = data.originalimage?.source ?? data.thumbnail?.source ?? null;
        if (url) { heroCache[city] = url; setImageUrl(url); }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [city]);

  if (!city || loading) return null;

  return (
    <div className="relative w-full h-64 rounded-2xl overflow-hidden shadow-xl mb-6">
      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt={`${city}`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-6 left-6 text-white">
            <h1 className="text-4xl font-bold mb-1">Your {city} Adventure</h1>
            <p className="text-sm opacity-80">Curated local recommendations</p>
          </div>
        </>
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-4xl font-bold mb-1">Your {city} Adventure</h1>
            <p className="text-sm opacity-80">Curated local recommendations</p>
          </div>
        </div>
      )}
    </div>
  );
}
