import pcnGeoJsonUrl from '../../assets/pcn.geojson?url';
import type { PcnGeoJson } from '../../types/pcn';

export async function loadPcnGeoJson(): Promise<PcnGeoJson> {
  const response = await fetch(pcnGeoJsonUrl, {
    headers: {
      Accept: 'application/geo+json,application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to load PCN data: ${response.status}`);
  }

  return (await response.json()) as PcnGeoJson;
}
