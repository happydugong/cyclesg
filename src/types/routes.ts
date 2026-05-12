import type { FeatureCollection, LineString, MultiLineString } from 'geojson';

export interface UnifiedRouteProperties {
  routeId: string;
  routeType: 'pcn' | 'cycling-path' | 'curated-my-maps';
  routeSource: 'official-pcn' | 'cycling-path' | 'curated-my-maps';
  routeName: string;
  routeGroup: string;
  routeLength: number | null;
  description?: string | null;
  layerName?: string | null;
  overlayId?: string | null;
  overlayName?: string | null;
  overlayLayerId?: string | null;
}

export type UnifiedRouteGeoJson = FeatureCollection<
  LineString | MultiLineString,
  UnifiedRouteProperties
>;
