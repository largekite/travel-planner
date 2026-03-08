import { SelectedItem, RouteOptimization, RouteLeg } from "./types";

// ─── Distance & Time ────────────────────────────────────────────────────────

export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function estimateTime(distance: number, mode: "walk" | "drive"): number {
  const speed = mode === "walk" ? 5 : 30; // km/h
  return (distance / speed) * 60;
}

// ─── Leg computation ────────────────────────────────────────────────────────

export function computeLegs(
  places: SelectedItem[],
  startPoint?: { lat: number; lng: number },
  mode: "walk" | "drive" = "walk"
): RouteLeg[] {
  const legs: RouteLeg[] = [];
  const valid = places.filter(p => p.lat != null && p.lng != null);
  if (valid.length < 2) return legs;

  // If there's a start point (hotel), first leg is from hotel to first stop
  let prevLat = startPoint ? startPoint.lat : valid[0].lat!;
  let prevLng = startPoint ? startPoint.lng : valid[0].lng!;
  const startIdx = startPoint ? 0 : 1;

  // Create a virtual "start" item for the hotel leg
  if (startPoint) {
    const dist = calculateDistance(prevLat, prevLng, valid[0].lat!, valid[0].lng!);
    legs.push({
      from: { name: "Hotel", lat: startPoint.lat, lng: startPoint.lng },
      to: valid[0],
      distance: Math.round(dist * 100) / 100,
      time: Math.round(estimateTime(dist, mode)),
    });
    prevLat = valid[0].lat!;
    prevLng = valid[0].lng!;
  }

  for (let i = startIdx; i < valid.length; i++) {
    if (i === 0) continue; // skip if no startPoint and first item
    const dist = calculateDistance(prevLat, prevLng, valid[i].lat!, valid[i].lng!);
    legs.push({
      from: valid[i - (startPoint && i === 0 ? 0 : 1)] || valid[0],
      to: valid[i],
      distance: Math.round(dist * 100) / 100,
      time: Math.round(estimateTime(dist, mode)),
    });
    prevLat = valid[i].lat!;
    prevLng = valid[i].lng!;
  }

  return legs;
}

// ─── Route total distance ───────────────────────────────────────────────────

function routeDistance(
  order: SelectedItem[],
  startPoint?: { lat: number; lng: number },
  returnToStart = false
): number {
  const valid = order.filter(p => p.lat != null && p.lng != null);
  if (valid.length < 1) return 0;

  let total = 0;
  let prevLat = startPoint ? startPoint.lat : valid[0].lat!;
  let prevLng = startPoint ? startPoint.lng : valid[0].lng!;
  const startIdx = startPoint ? 0 : 1;

  for (let i = startIdx; i < valid.length; i++) {
    total += calculateDistance(prevLat, prevLng, valid[i].lat!, valid[i].lng!);
    prevLat = valid[i].lat!;
    prevLng = valid[i].lng!;
  }

  if (returnToStart && startPoint && valid.length > 0) {
    const last = valid[valid.length - 1];
    total += calculateDistance(last.lat!, last.lng!, startPoint.lat, startPoint.lng);
  }

  return total;
}

// ─── Nearest Neighbor ───────────────────────────────────────────────────────

function nearestNeighbor(
  places: SelectedItem[],
  startPoint?: { lat: number; lng: number }
): SelectedItem[] {
  if (places.length <= 1) return [...places];

  const remaining = [...places];
  const result: SelectedItem[] = [];
  let current = startPoint || { lat: remaining[0].lat!, lng: remaining[0].lng! };

  if (!startPoint) {
    result.push(remaining.shift()!);
    current = { lat: result[0].lat!, lng: result[0].lng! };
  }

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      if (!remaining[i].lat || !remaining[i].lng) continue;
      const dist = calculateDistance(current.lat, current.lng, remaining[i].lat!, remaining[i].lng!);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    const chosen = remaining.splice(bestIdx, 1)[0];
    result.push(chosen);
    current = { lat: chosen.lat!, lng: chosen.lng! };
  }

  return result;
}

// ─── 2-opt Improvement ──────────────────────────────────────────────────────

function twoOptImprove(
  order: SelectedItem[],
  startPoint?: { lat: number; lng: number },
  returnToStart = false
): SelectedItem[] {
  if (order.length <= 3) return order;

  let best = [...order];
  let bestDist = routeDistance(best, startPoint, returnToStart);
  let improved = true;

  while (improved) {
    improved = false;
    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 2; j < best.length; j++) {
        // Reverse the segment between i+1 and j
        const candidate = [
          ...best.slice(0, i + 1),
          ...best.slice(i + 1, j + 1).reverse(),
          ...best.slice(j + 1),
        ];
        const candidateDist = routeDistance(candidate, startPoint, returnToStart);
        if (candidateDist < bestDist - 0.001) {
          best = candidate;
          bestDist = candidateDist;
          improved = true;
        }
      }
    }
  }

  return best;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function optimizeRoute(
  places: SelectedItem[],
  startPoint?: { lat: number; lng: number },
  mode: "walk" | "drive" = "walk",
  returnToStart = false
): RouteOptimization {
  const validPlaces = places.filter(p => p.lat != null && p.lng != null);

  if (validPlaces.length <= 2) {
    const dist = routeDistance(validPlaces, startPoint, returnToStart);
    return {
      originalOrder: places,
      optimizedOrder: validPlaces,
      totalTime: Math.round(estimateTime(dist, mode)),
      totalDistance: Math.round(dist * 100) / 100,
      legs: computeLegs(validPlaces, startPoint, mode),
    };
  }

  // Step 1: Nearest neighbor seed
  const nnOrder = nearestNeighbor(validPlaces, startPoint);

  // Step 2: 2-opt improvement
  const optimized = twoOptImprove(nnOrder, startPoint, returnToStart);

  const totalDist = routeDistance(optimized, startPoint, returnToStart);
  const totalTime = estimateTime(totalDist, mode);

  return {
    originalOrder: places,
    optimizedOrder: optimized,
    totalTime: Math.round(totalTime),
    totalDistance: Math.round(totalDist * 100) / 100,
    legs: computeLegs(optimized, startPoint, mode),
  };
}

export function calculateRouteTotals(
  places: SelectedItem[],
  startPoint?: { lat: number; lng: number },
  mode: "walk" | "drive" = "walk",
  returnToStart = false
): { totalTime: number; totalDistance: number; legs: RouteLeg[] } {
  const dist = routeDistance(places, startPoint, returnToStart);
  return {
    totalTime: Math.round(estimateTime(dist, mode)),
    totalDistance: Math.round(dist * 100) / 100,
    legs: computeLegs(places, startPoint, mode),
  };
}
