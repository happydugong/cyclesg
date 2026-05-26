import railStationGeoJsonUrl from '../../assets/rail-stations.geojson?url';
import type { RailStationGeoJson } from '../../types/railStation';

export async function loadRailStationGeoJson(): Promise<RailStationGeoJson> {
  const response = await fetch(railStationGeoJsonUrl, {
    headers: {
      Accept: 'application/geo+json,application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to load rail station data: ${response.status}`);
  }

  return (await response.json()) as RailStationGeoJson;
}
