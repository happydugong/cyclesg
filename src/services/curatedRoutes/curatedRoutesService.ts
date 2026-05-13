import type { CuratedRoutesGeoJson } from '../../types/curatedRoutes';

const geoJsonAssetUrls = import.meta.glob('../../assets/*.geojson', {
  query: '?url',
  import: 'default',
  eager: true
}) as Record<string, string>;

function resolveGeoJsonAssetUrl(assetPath: string) {
  const relativeAssetPath = assetPath.replace(/^src\//, '../../');
  const url = geoJsonAssetUrls[relativeAssetPath];

  if (!url) {
    throw new Error(`Unsupported curated routes asset path: ${assetPath}`);
  }

  return url;
}

export async function loadCuratedRoutesGeoJson(
  assetPath = 'src/assets/curated-routes.geojson'
): Promise<CuratedRoutesGeoJson> {
  const response = await fetch(resolveGeoJsonAssetUrl(assetPath), {
    headers: {
      Accept: 'application/geo+json,application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to load curated routes data: ${response.status}`);
  }

  return (await response.json()) as CuratedRoutesGeoJson;
}
