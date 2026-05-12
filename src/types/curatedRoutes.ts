import type { FeatureCollection, LineString, Point } from 'geojson';

export interface CuratedRoutesProperties {
  featureId: string;
  overlayId: string;
  overlayName: string;
  sourceType: 'google-my-maps';
  name: string;
  description: string | null;
  layerName: string | null;
  geometryKind: 'point' | 'line';
  styleUrl: string | null;
  styleId: string | null;
  iconHref: string | null;
  strokeColor: string | null;
  strokeWidth: number | null;
}

export type CuratedRoutesGeoJson = FeatureCollection<
  Point | LineString,
  CuratedRoutesProperties
>;
