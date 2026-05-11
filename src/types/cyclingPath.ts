import type { FeatureCollection, LineString, MultiLineString } from 'geojson';

export interface CyclingPathProperties {
  OBJECTID_1: number;
  CYL_PATH: string | null;
  AGENCY_MAINT: string | null;
  INC_CRC: string;
  FMEL_UPD_D: string;
  'SHAPE_1.LEN': number | null;
}

export type CyclingPathGeoJson = FeatureCollection<
  LineString | MultiLineString,
  CyclingPathProperties
>;
