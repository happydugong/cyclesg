import type { FeatureCollection, LineString, MultiLineString } from 'geojson';

export interface UnifiedRouteProperties {
  routeId: string;
  routeType: 'pcn' | 'cycling-path';
  routeName: string;
  routeGroup: string;
  routeLength: number | null;
}

export type UnifiedRouteGeoJson = FeatureCollection<
  LineString | MultiLineString,
  UnifiedRouteProperties
>;
