import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';

export interface RailStationProperties {
  OBJECTID: number;
  GRND_LEVEL: string;
  RAIL_TYPE: string;
  NAME: string | null;
  INC_CRC: string;
  FMEL_UPD_D: string;
  'SHAPE.AREA': number;
  'SHAPE.LEN': number;
}

export type RailStationGeoJson = FeatureCollection<Polygon | MultiPolygon, RailStationProperties>;
