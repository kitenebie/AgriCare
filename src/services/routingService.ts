export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface DrivingRoute {
  coordinates: [number, number][];
  distanceKm: number;
  durationMinutes: number;
}

/** Fetch a road-following driving route from OSRM. */
export async function getDrivingRoute(
  origin: Coordinate,
  destination: Coordinate
): Promise<DrivingRoute | null> {
  const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;

  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`
    );
    if (!response.ok) return null;

    const data = await response.json();
    const route = data.routes?.[0];
    if (!route || !Array.isArray(route.geometry?.coordinates)) return null;

    return {
      coordinates: route.geometry.coordinates as [number, number][],
      distanceKm: route.distance / 1000,
      durationMinutes: route.duration / 60,
    };
  } catch (error) {
    console.warn('Unable to load driving route:', error);
    return null;
  }
}

export const formatDrivingDistance = (distanceKm: number) =>
  `${distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} km`;

export const formatDrivingDuration = (durationMinutes: number) => {
  const roundedMinutes = Math.max(1, Math.round(durationMinutes));
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;

  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
};
