import type { FeatureCollection, LineString, MultiLineString, Point } from 'geojson';
import type { UnifiedRouteProperties } from './routes';

export interface CuratedRoutesProperties {
  featureId: string;
  routeId: string;
  overlayId: string;
  overlayName: string;
  sourceType: 'google-my-maps' | 'gpx' | 'data-gov-sg';
  routeType: UnifiedRouteProperties['routeType'];
  routeSource: UnifiedRouteProperties['routeSource'];
  routeName: string;
  routeGroup: string;
  routeLength: number | string | null;
  name: string;
  description: string | null;
  layerName: string | null;
  geometryKind: 'point' | 'line';
  styleUrl: string | null;
  styleId: string | null;
  iconHref: string | null;
  poiIconHref?: string | null;
  poiIconId?: string | null;
  strokeColor: string | null;
  strokeWidth: number | null;
  overlayLayerId?: string | null;
}

export type OverlayPoiProperties = CuratedRoutesProperties &
  Pick<UnifiedRouteProperties, 'routeType' | 'routeSource'>;

export function isOverlayPoiProperties(
  properties: CuratedRoutesProperties | undefined
): properties is OverlayPoiProperties {
  return Boolean(properties?.routeType && properties?.routeSource);
}

export type CuratedRoutesGeoJson = FeatureCollection<
  Point | LineString | MultiLineString,
  CuratedRoutesProperties
>;
