import type { CyclingPathGeoJson } from '../../types/cyclingPath';

export const cyclingPathFixture: CyclingPathGeoJson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        OBJECTID_1: 102486,
        CYL_PATH: 'Bedok',
        AGENCY_MAINT: 'Land Transport Authority',
        INC_CRC: '2C4556DD286D7950',
        FMEL_UPD_D: '20240714130102',
        'SHAPE_1.LEN': 19.4437335776265
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [103.9229610905, 1.3283089196],
          [103.9229233051, 1.3282996088]
        ]
      }
    }
  ]
};
