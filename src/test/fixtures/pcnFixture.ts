import type { FeatureCollection, LineString, MultiLineString } from 'geojson';

type PcnFixtureProperties = {
  OBJECTID: number;
  PARK: string;
  PCN_LOOP: string;
  MORE_INFO: string;
  INC_CRC: string;
  FMEL_UPD_D: string;
  'SHAPE.LEN': number;
};

export const pcnFixture: FeatureCollection<LineString | MultiLineString, PcnFixtureProperties> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        OBJECTID: 101,
        PARK: 'Punggol Park Connector',
        PCN_LOOP: 'North Eastern Riverine Loop',
        MORE_INFO: 'https://www.nparks.gov.sg/pcn',
        INC_CRC: 'CRC-101',
        FMEL_UPD_D: '20250122140539',
        'SHAPE.LEN': 98.87
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [103.8767006811, 1.3829175543],
          [103.8768548603, 1.3829130224]
        ]
      }
    },
    {
      type: 'Feature',
      properties: {
        OBJECTID: 202,
        PARK: 'Marina Bay Park Connector',
        PCN_LOOP: 'Central Urban Loop',
        MORE_INFO: 'https://www.nparks.gov.sg/pcn',
        INC_CRC: 'CRC-202',
        FMEL_UPD_D: '20250122140539',
        'SHAPE.LEN': 76.14
      },
      geometry: {
        type: 'MultiLineString',
        coordinates: [
          [
            [103.8573, 1.2892],
            [103.8606, 1.2866]
          ]
        ]
      }
    }
  ]
};
