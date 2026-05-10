import type { FeatureCollection, LineString, MultiLineString } from 'geojson';

export interface PcnProperties {
  OBJECTID: number;
  PARK: string;
  PCN_LOOP: string;
  MORE_INFO: string;
  INC_CRC: string;
  FMEL_UPD_D: string;
  'SHAPE.LEN': number;
}

export type PcnGeoJson = FeatureCollection<LineString | MultiLineString, PcnProperties>;
