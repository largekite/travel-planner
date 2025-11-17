import { SelectedItem, RouteOptimization } from "./types";

// Simple distance calculation using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Estimate travel time based on distance and mode
function estimateTime(distance: number, mode: "walk" | "drive"): number {
  // Rough estimates: walking 5km/h, driving 30km/h in city
  const speed = mode === "walk" ? 5 : 30;
  return (distance / speed) * 60; // minutes
}

// Simple nearest neighbor optimization
export function optimizeRoute(
  places: SelectedItem[], 
  startPoint?: { lat: number; lng: number },
  mode: "walk" | "drive" = "walk"
): RouteOptimization {
  if (places.length <= 2) {
    return {
      originalOrder: places,
      optimizedOrder: places,
      totalTime: 0,
      totalDistance: 0
    };
  }

  const validPlaces = places.filter(p => p.lat && p.lng);
  if (validPlaces.length <= 2) {
    return {
      originalOrder: places,
      optimizedOrder: places,
      totalTime: 0,
      totalDistance: 0
    };
  }

  let current = startPoint || { lat: validPlaces[0].lat!, lng: validPlaces[0].lng! };
  let remaining = [...validPlaces];
  let optimized: SelectedItem[] = [];
  let totalDistance = 0;
  let totalTime = 0;

  // If we have a start point different from first place, find nearest first
  if (startPoint) {
    let nearestIdx = 0;
    let nearestDist = calculateDistance(current.lat, current.lng, remaining[0].lat!, remaining[0].lng!);
    
    for (let i = 1; i < remaining.length; i++) {
      const dist = calculateDistance(current.lat, current.lng, remaining[i].lat!, remaining[i].lng!);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }
    
    optimized.push(remaining[nearestIdx]);
    current = { lat: remaining[nearestIdx].lat!, lng: remaining[nearestIdx].lng! };
    remaining.splice(nearestIdx, 1);
    totalDistance += nearestDist;
    totalTime += estimateTime(nearestDist, mode);
  } else {
    // Start with first place
    optimized.push(remaining[0]);
    current = { lat: remaining[0].lat!, lng: remaining[0].lng! };
    remaining.splice(0, 1);
  }

  // Nearest neighbor for remaining places
  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = calculateDistance(current.lat, current.lng, remaining[0].lat!, remaining[0].lng!);
    
    for (let i = 1; i < remaining.length; i++) {
      const dist = calculateDistance(current.lat, current.lng, remaining[i].lat!, remaining[i].lng!);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }
    
    optimized.push(remaining[nearestIdx]);
    current = { lat: remaining[nearestIdx].lat!, lng: remaining[nearestIdx].lng! };
    remaining.splice(nearestIdx, 1);
    totalDistance += nearestDist;
    totalTime += estimateTime(nearestDist, mode);
  }

  return {
    originalOrder: places,
    optimizedOrder: optimized,
    totalTime: Math.round(totalTime),
    totalDistance: Math.round(totalDistance * 100) / 100
  };
}