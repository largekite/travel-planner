import type { VercelRequest, VercelResponse } from "@vercel/node";

type YelpReview = {
  author: string;
  rating: number;
  text: string;
  isElite: boolean;
  timeCreated?: string;
};

async function fetchYelpMatch(
  name: string,
  lat: number | undefined,
  lng: number | undefined,
  city: string | undefined,
  yelpKey: string
): Promise<string | null> {
  // Try matching by name + coordinates first
  const params = new URLSearchParams({ term: name, limit: "1" });
  if (lat && lng) {
    params.set("latitude", String(lat));
    params.set("longitude", String(lng));
  } else if (city) {
    params.set("location", city);
  } else {
    return null;
  }

  try {
    const res = await fetch(
      `https://api.yelp.com/v3/businesses/search?${params}`,
      { headers: { Authorization: `Bearer ${yelpKey}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const biz = data.businesses?.[0];
    return biz?.id || null;
  } catch {
    return null;
  }
}

async function fetchYelpReviews(
  bizId: string,
  yelpKey: string
): Promise<{ reviews: YelpReview[]; rating?: number; reviewCount?: number; url?: string }> {
  try {
    // Fetch business details (for rating, review count, url) and reviews in parallel
    const [bizRes, reviewsRes] = await Promise.all([
      fetch(`https://api.yelp.com/v3/businesses/${bizId}`, {
        headers: { Authorization: `Bearer ${yelpKey}` },
      }),
      fetch(`https://api.yelp.com/v3/businesses/${bizId}/reviews?limit=5&sort_by=yelp_sort`, {
        headers: { Authorization: `Bearer ${yelpKey}` },
      }),
    ]);

    let rating: number | undefined;
    let reviewCount: number | undefined;
    let yelpUrl: string | undefined;

    if (bizRes.ok) {
      const bizData = await bizRes.json();
      rating = bizData.rating;
      reviewCount = bizData.review_count;
      yelpUrl = bizData.url;
    }

    if (!reviewsRes.ok) return { reviews: [], rating, reviewCount, url: yelpUrl };

    const data = await reviewsRes.json();
    const reviews: YelpReview[] = (data.reviews || []).map((r: any) => ({
      author: r.user?.name || "Anonymous",
      rating: r.rating,
      text: r.text,
      isElite: Array.isArray(r.user?.elite) ? r.user.elite.length > 0 : false,
      timeCreated: r.time_created,
    }));

    return { reviews, rating, reviewCount, url: yelpUrl };
  } catch {
    return { reviews: [] };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const googleKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!googleKey) {
    return res.status(500).json({ error: "GOOGLE_PLACES_API_KEY is not set" });
  }

  const placeId = req.query.placeId as string;
  if (!placeId) {
    return res.status(400).json({ error: "placeId is required" });
  }

  // Optional params for Yelp matching
  const placeName = req.query.name as string | undefined;
  const placeLat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
  const placeLng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
  const placeCity = req.query.city as string | undefined;
  const yelpKey = process.env.YELP_API_KEY;

  try {
    // Start Google fetch
    const googleUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    googleUrl.searchParams.set("place_id", placeId);
    googleUrl.searchParams.set("fields", "photos,reviews,opening_hours,formatted_phone_number,website");
    googleUrl.searchParams.set("key", googleKey);

    const googlePromise = fetch(googleUrl.toString()).then(r => r.json());

    // Start Yelp fetch in parallel (if we have a key and place name)
    const yelpPromise = (yelpKey && placeName)
      ? fetchYelpMatch(placeName, placeLat, placeLng, placeCity, yelpKey)
          .then(bizId => bizId ? fetchYelpReviews(bizId, yelpKey) : null)
      : Promise.resolve(null);

    const [googleData, yelpData] = await Promise.all([googlePromise, yelpPromise]);

    if (googleData.status !== "OK") {
      return res.status(404).json({ error: "Place not found" });
    }

    const result = googleData.result;

    // Process Google photos
    const photos = result.photos?.slice(0, 4).map((photo: any) => {
      return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${googleKey}`;
    }) || [];

    // Process Google reviews
    const reviews = result.reviews?.slice(0, 3).map((review: any) => ({
      author: review.author_name,
      rating: review.rating,
      text: review.text
    })) || [];

    // Process hours
    const hours = result.opening_hours?.weekday_text || [];

    return res.status(200).json({
      photos,
      reviews,
      hours,
      phone: result.formatted_phone_number,
      website: result.website,
      // Yelp data (null if no key or no match)
      yelp: yelpData ? {
        rating: yelpData.rating,
        reviewCount: yelpData.reviewCount,
        url: yelpData.url,
        reviews: yelpData.reviews,
      } : undefined,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
