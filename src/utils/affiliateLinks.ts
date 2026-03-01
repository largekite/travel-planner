// Utility functions for generating affiliate links

/**
 * Generate Hotels.com affiliate link for hotel search
 * @param cityName - Destination city
 * @param hotelName - Optional specific hotel name
 * @returns Hotels.com search URL with affiliate tracking
 */
export function generateHotelsLink(
  cityName: string,
  hotelName?: string
): string {
  const query = hotelName ? `${hotelName} ${cityName}` : cityName;
  const params = new URLSearchParams({
    q: query,
    affiliateId: import.meta.env.VITE_HOTELS_AFFILIATE_ID || '',
  });
  if (!import.meta.env.VITE_HOTELS_AFFILIATE_ID) params.delete('affiliateId');

  return `https://www.hotels.com/search.do?${params.toString()}`;
}

/**
 * Generate TripAdvisor affiliate link for restaurant/attraction search
 * @param cityName - Destination city
 * @param placeName - Restaurant or attraction name
 * @returns TripAdvisor search URL with affiliate tracking
 */
export function generateTripAdvisorLink(
  cityName: string,
  placeName: string
): string {
  const params = new URLSearchParams({
    q: `${placeName} ${cityName}`,
  });
  const partnerId = import.meta.env.VITE_TRIPADVISOR_PARTNER_ID;
  if (partnerId) params.set('m', partnerId);

  return `https://www.tripadvisor.com/Search?${params.toString()}`;
}

/**
 * Generate Viator affiliate link for activity/tour search
 * @param cityName - Destination city
 * @param activityName - Activity or attraction name
 * @returns Viator search URL with affiliate tracking
 */
export function generateViatorLink(
  cityName: string,
  activityName: string
): string {
  const params = new URLSearchParams({ text: `${activityName} ${cityName}` });
  const partnerId = import.meta.env.VITE_VIATOR_PARTNER_ID;
  if (partnerId) params.set('pid', partnerId);

  return `https://www.viator.com/searchResults/all?${params.toString()}`;
}

/**
 * Generate GetYourGuide affiliate link for activity search
 * @param cityName - Destination city
 * @param activityName - Activity or attraction name
 * @returns GetYourGuide search URL with affiliate tracking
 */
export function generateGetYourGuideLink(
  cityName: string,
  activityName: string
): string {
  const searchQuery = `${activityName} ${cityName}`.replace(/\s+/g, '-');
  const partnerId = import.meta.env.VITE_GETYOURGUIDE_PARTNER_ID || '1'; // Placeholder
  return `https://www.getyourguide.com/s/?q=${encodeURIComponent(searchQuery)}&partner_id=${partnerId}`;
}
