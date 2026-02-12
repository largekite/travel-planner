// Utility functions for generating affiliate links

/**
 * Generate Booking.com affiliate link for hotel search
 * @param cityName - Destination city
 * @param hotelName - Optional specific hotel name
 * @param checkIn - Optional check-in date (YYYY-MM-DD)
 * @param checkOut - Optional check-out date (YYYY-MM-DD)
 * @returns Booking.com search URL with affiliate tracking
 */
export function generateBookingLink(
  cityName: string,
  hotelName?: string,
  checkIn?: string,
  checkOut?: string
): string {
  const baseUrl = 'https://www.booking.com/searchresults.html';
  const params = new URLSearchParams({
    ss: hotelName ? `${hotelName}, ${cityName}` : cityName,
    aid: process.env.BOOKING_AFFILIATE_ID || '1', // Placeholder affiliate ID
  });

  if (checkIn) params.set('checkin', checkIn);
  if (checkOut) params.set('checkout', checkOut);

  return `${baseUrl}?${params.toString()}`;
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
  const baseUrl = 'https://www.viator.com/searchResults/all';
  const params = new URLSearchParams({
    text: `${activityName} ${cityName}`,
    pid: process.env.VIATOR_PARTNER_ID || '1', // Placeholder partner ID
  });

  return `${baseUrl}?${params.toString()}`;
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
  const partnerId = process.env.GETYOURGUIDE_PARTNER_ID || '1'; // Placeholder
  return `https://www.getyourguide.com/s/?q=${encodeURIComponent(searchQuery)}&partner_id=${partnerId}`;
}
