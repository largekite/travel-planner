// Icon mapping for itinerary slot types
import { Bed, Coffee, Compass, UtensilsCrossed, Cake, LucideIcon } from 'lucide-react';

export const SLOT_ICONS: Record<string, LucideIcon> = {
  hotel: Bed,
  breakfast: Cake,
  lunch: UtensilsCrossed,
  dinner: UtensilsCrossed,
  coffee: Coffee,
  activity: Compass,
  activity2: Compass,
} as const;

/**
 * Get the appropriate icon component for a given slot type
 * @param slot - Slot key (hotel, breakfast, activity, etc.)
 * @param className - Optional CSS classes for the icon
 * @returns JSX element with the appropriate icon
 */
export function getSlotIcon(slot: string, className = "w-5 h-5") {
  const Icon = SLOT_ICONS[slot] || Compass;
  return <Icon className={className} />;
}
