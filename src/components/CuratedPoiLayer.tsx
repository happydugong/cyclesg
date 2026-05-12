import { useEffect } from 'react';
import type {
  GeoJSONSource,
  GeoJSONSourceSpecification,
  Map as MapLibreMap
} from 'maplibre-gl';

interface CuratedPoiLayerProps {
  data: GeoJSONSourceSpecification['data'];
  ids: {
    source: string;
    circle: string;
    label: string;
  };
  map: MapLibreMap | null;
  palette: {
    circleColor: string;
    textColor: string;
    textHaloColor: string;
  };
}

function isStyleLoadingError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return message.toLowerCase().includes('style is not done loading');
}

export function CuratedPoiLayer({ data, ids, map, palette }: CuratedPoiLayerProps) {
  useEffect(() => {
    if (!map) {
      return;
    }

    const addLayer = () => {
      if (!map.getSource(ids.source)) {
        map.addSource(ids.source, {
          type: 'geojson',
          data
        });
      } else {
        const source = map.getSource(ids.source) as GeoJSONSource;
        source.setData(data);
      }

      if (!map.getLayer(ids.circle)) {
        map.addLayer({
          id: ids.circle,
          type: 'circle',
          source: ids.source,
          paint: {
            'circle-color': palette.circleColor,
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 5, 14, 7.5, 17, 10],
            'circle-stroke-color': palette.textHaloColor,
            'circle-stroke-width': 2.5,
            'circle-opacity': 0.96
          }
        });
      }

      if (!map.getLayer(ids.label)) {
        map.addLayer({
          id: ids.label,
          type: 'symbol',
          source: ids.source,
          layout: {
            'text-field': ['get', 'name'],
            'text-font': ['Open Sans Semibold'],
            'text-size': 11,
            'text-offset': [0, 1.2],
            'text-anchor': 'top',
            'text-max-width': 14,
            'text-optional': true
          },
          paint: {
            'text-color': palette.textColor,
            'text-halo-color': palette.textHaloColor,
            'text-halo-width': 1.2
          }
        });
      }
    };

    let isMounted = true;

    // Try immediately, then retry once on `load` if MapLibre briefly reports
    // "Style is not done loading" while the current style is settling.
    const addLayerWhenReady = () => {
      if (!isMounted) {
        return;
      }

      try {
        addLayer();
      } catch (error) {
        if (isStyleLoadingError(error)) {
          map.once('load', addLayerWhenReady);
          return;
        }

        throw error;
      }
    };

    addLayerWhenReady();

    return () => {
      isMounted = false;
      map.off('load', addLayerWhenReady);

      if (map.getLayer(ids.label)) {
        map.removeLayer(ids.label);
      }

      if (map.getLayer(ids.circle)) {
        map.removeLayer(ids.circle);
      }

      if (map.getSource(ids.source)) {
        map.removeSource(ids.source);
      }
    };
  }, [data, ids.circle, ids.label, ids.source, map, palette.circleColor, palette.textColor, palette.textHaloColor]);

  return null;
}
