import type { CuratedRoutesGeoJson } from '../../types/curatedRoutes';

export const curatedRoutesFixture: CuratedRoutesGeoJson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        featureId: 'marina-bay-connector-line-1',
        overlayId: 'jonathan-route',
        overlayName: 'Jonathan Route',
        sourceType: 'google-my-maps',
        routeType: 'curated-my-maps',
        routeSource: 'curated-my-maps',
        name: 'Marina Bay Connector',
        description: 'Scenic curated route segment',
        layerName: 'Scenic connectors',
        geometryKind: 'line',
        styleUrl: '#icon-503-0288D1',
        styleId: 'icon-503-0288D1',
        iconHref: null,
        strokeColor: '#0288D1',
        strokeWidth: 4
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [103.8607, 1.2867],
          [103.8631, 1.288]
        ]
      }
    },
    {
      type: 'Feature',
      properties: {
        featureId: 'rest-stop-point-1',
        overlayId: 'jonathan-route',
        overlayName: 'Jonathan Route',
        sourceType: 'google-my-maps',
        routeType: 'curated-poi',
        routeSource: 'curated-my-maps',
        name: 'Rest stop',
        description: 'Water point and shelter',
        layerName: 'POIs',
        geometryKind: 'point',
        styleUrl: '#icon-1899-DB4436',
        styleId: 'icon-1899-DB4436',
        iconHref: 'https://maps.google.com/mapfiles/kml/paddle/red-circle.png',
        strokeColor: null,
        strokeWidth: null
      },
      geometry: {
        type: 'Point',
        coordinates: [103.8673, 1.3004]
      }
    }
  ]
};
