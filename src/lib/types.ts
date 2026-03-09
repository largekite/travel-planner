export const VIBES = ["popular", "romantic", "family", "adventurous"] as const;
export type Vibe = (typeof VIBES)[number];

export const BUDGETS = ["budget", "moderate", "luxury"] as const;
export type Budget = (typeof BUDGETS)[number];

// Vibe-specific keyword priorities for enhanced search
export const VIBE_PRIORITIES = {
  adventurous: ['outdoor', 'hiking', 'adventure', 'active', 'sports', 'nature'],
  family: ['family-friendly', 'kid', 'children', 'park', 'educational', 'fun'],
  romantic: ['romantic', 'intimate', 'cozy', 'wine', 'sunset', 'couples'],
  popular: ['popular', 'must-visit', 'famous', 'iconic', 'landmark', 'trending'],
} as const;

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
  /** First available photo URL, shown as thumbnail in the planner */
  photo?: string;
  /** Google rating (e.g. 4.5) */
  googleRating?: number;
  /** Total Google review count */
  googleReviews?: number;
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
  priceLevel?: number; // Google Places price_level (0-4)
  budgetLevel?: Budget; // Computed budget category
};

export type DirectionsSegment = {
  path: [number, number][];
  mins: number;
  mode: "walk" | "drive";
  from: string;
  to: string;
};

export type RouteLeg = {
  from: SelectedItem;
  to: SelectedItem;
  distance: number; // km
  time: number; // minutes
};

export type RouteOptimization = {
  originalOrder: SelectedItem[];
  optimizedOrder: SelectedItem[];
  totalTime: number;
  totalDistance: number;
  legs?: RouteLeg[];
};
