import curatedRoutesGeoJsonUrl from '../../assets/curated-routes.geojson?url';
import type { CuratedRoutesGeoJson } from '../../types/curatedRoutes';

export async function loadCuratedRoutesGeoJson(): Promise<CuratedRoutesGeoJson> {
  const response = await fetch(curatedRoutesGeoJsonUrl, {
    headers: {
      Accept: 'application/geo+json,application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to load curated routes data: ${response.status}`);
  }

  return (await response.json()) as CuratedRoutesGeoJson;
}
