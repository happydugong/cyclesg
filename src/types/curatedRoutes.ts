import type { FeatureCollection, LineString, Point } from 'geojson';
import type { UnifiedRouteProperties } from './routes';

export interface CuratedRoutesProperties {
  featureId: string;
  overlayId: string;
  overlayName: string;
  sourceType: 'google-my-maps' | 'gpx' | 'data-gov-sg';
  name: string;
  description: string | null;
  layerName: string | null;
  geometryKind: 'point' | 'line';
  styleUrl: string | null;
  styleId: string | null;
  iconHref: string | null;
  poiIconHref?: string | null;
  poiIconId?: string | null;
  routeLength?: number | string | null;
  strokeColor: string | null;
  strokeWidth: number | null;
  routeType?: UnifiedRouteProperties['routeType'];
  routeSource?: UnifiedRouteProperties['routeSource'];
}

export type OverlayPoiProperties = CuratedRoutesProperties &
  Pick<UnifiedRouteProperties, 'routeType' | 'routeSource'>;

export function isOverlayPoiProperties(
  properties: CuratedRoutesProperties | undefined
): properties is OverlayPoiProperties {
  return Boolean(properties?.routeType && properties?.routeSource);
}

export type CuratedRoutesGeoJson = FeatureCollection<
  Point | LineString,
  CuratedRoutesProperties
>;
