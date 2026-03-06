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
  const destination = hotelName ? `${hotelName}, ${cityName}` : cityName;
  const hotelsUrl = `https://www.hotels.com/Hotel-Search?destination=${encodeURIComponent(destination)}`;

  const cjPid = import.meta.env.VITE_CJ_PID;
  const cjAid = import.meta.env.VITE_CJ_HOTELS_AID;
  if (cjPid && cjAid) {
    const domain = import.meta.env.VITE_CJ_DOMAIN || 'www.dpbolvw.net';
    return `https://${domain}/click-${cjPid}-${cjAid}?url=${encodeURIComponent(hotelsUrl)}`;
  }

  return hotelsUrl;
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
