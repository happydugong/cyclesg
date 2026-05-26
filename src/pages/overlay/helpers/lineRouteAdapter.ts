// Shared helper for official line-based overlays that only differ by raw field names
// before being normalized into the app's unified route GeoJSON format.
import type { FeatureCollection, LineString, MultiLineString } from 'geojson';
import type { UnifiedRouteGeoJson } from '../../../types/routes';

interface OfficialRouteFieldMapping<TProperties> {
  getRouteId: (properties: TProperties) => string;
  routeType: 'pcn' | 'cycling-path';
  routeSource: 'official-pcn' | 'cycling-path';
  getRouteName: (properties: TProperties) => string;
  getRouteGroup: (properties: TProperties) => string;
  getRouteLength: (properties: TProperties) => number | null;
}

export function buildOfficialLineRouteGeoJson<TProperties>(
  data: FeatureCollection<LineString | MultiLineString, TProperties> | null,
  overlaySourceId: string,
  fieldMapping: OfficialRouteFieldMapping<TProperties>
): UnifiedRouteGeoJson | null {
  if (!data) {
    return null;
  }

  return {
    type: 'FeatureCollection',
    features: data.features.map((feature) => ({
      ...feature,
      properties: {
        routeId: fieldMapping.getRouteId(feature.properties),
        routeType: fieldMapping.routeType,
        routeSource: fieldMapping.routeSource,
        routeName: fieldMapping.getRouteName(feature.properties),
        routeGroup: fieldMapping.getRouteGroup(feature.properties),
        routeLength: fieldMapping.getRouteLength(feature.properties),
        overlayLayerId: overlaySourceId
      }
    }))
  };
}
