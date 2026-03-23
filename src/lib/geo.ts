// ============================================================
// GEO — haversine distance + distance-based sorting
// ============================================================

const EARTH_RADIUS_KM = 6371

/** Haversine distance in km between two lat/lng points. */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export type WithDistance<T> = T & { distanceKm: number }

/** Attach distanceKm to each item and sort closest first. */
export function sortByDistance<T extends { studio_lat: number | null; studio_lng: number | null }>(
  items: T[],
  userLat: number,
  userLng: number
): WithDistance<T>[] {
  return items
    .map((item) => ({
      ...item,
      distanceKm:
        item.studio_lat != null && item.studio_lng != null
          ? haversineKm(userLat, userLng, item.studio_lat, item.studio_lng)
          : Infinity,
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
}
