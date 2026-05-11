import cyclingPathGeoJsonUrl from '../../assets/cycling-paths.geojson?url';
import type { CyclingPathGeoJson } from '../../types/cyclingPath';

export async function loadCyclingPathGeoJson(): Promise<CyclingPathGeoJson> {
  const response = await fetch(cyclingPathGeoJsonUrl, {
    headers: {
      Accept: 'application/geo+json,application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to load cycling path data: ${response.status}`);
  }

  return (await response.json()) as CyclingPathGeoJson;
}
