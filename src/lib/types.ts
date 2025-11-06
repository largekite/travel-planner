export const VIBES = ["romantic", "family", "adventurous"] as const;
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
};

export type DayPlan = {
  activity?: SelectedItem;
  breakfast?: SelectedItem;
  lunch?: SelectedItem;
  dinner?: SelectedItem;
  coffee?: SelectedItem;
  notes?: string;
};

export type SlotKey =
  | keyof Pick<
      DayPlan,
      "activity" | "breakfast" | "lunch" | "dinner" | "coffee"
    >
  | "hotel";

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
};

export type DirectionsSegment = {
  path: [number, number][];
  mins: number;
  mode: "walk" | "drive";
  from: string;
  to: string;
};
