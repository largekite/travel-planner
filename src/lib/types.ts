export const VIBES = ["popular", "romantic", "family", "adventurous"] as const;
export type Vibe = (typeof VIBES)[number];

export type SelectedItem = {
  name: string;
  url?: string;
  area?: string;
  cuisine?: string;
  price?: string;
  lat?: number;
  lng?: number;
  desc?: string;
  meta?: string;
  placeId?: string;
};

export type DayPlan = {
  hotel?: SelectedItem;
  activity?: SelectedItem;
  activity2?: SelectedItem;
  breakfast?: SelectedItem;
  lunch?: SelectedItem;
  dinner?: SelectedItem;
  coffee?: SelectedItem;
  notes?: string;
};

export type SlotKey = keyof Pick<
  DayPlan,
  "hotel" | "activity" | "activity2" | "breakfast" | "lunch" | "dinner" | "coffee"
>;

export type ApiSuggestion = {
  name: string;
  url?: string;
  area?: string;
  cuisine?: string;
  price?: string;
  lat?: number;
  lng?: number;
  desc?: string;
  meta?: string;
  ratings?: {
    combined?: number;
    yelp?: number;
    google?: number;
    yelpReviews?: number;
    googleReviews?: number;
  };
  photos?: string[];
  hours?: string[];
  phone?: string;
  website?: string;
  placeId?: string;
};

export type DirectionsSegment = {
  path: [number, number][];
  mins: number;
  mode: "walk" | "drive";
  from: string;
  to: string;
};

export type RouteOptimization = {
  originalOrder: SelectedItem[];
  optimizedOrder: SelectedItem[];
  totalTime: number;
  totalDistance: number;
};
