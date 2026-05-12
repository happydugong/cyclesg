import { useEffect } from 'react';
import type {
  ExpressionSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
  MapLayerMouseEvent
} from 'maplibre-gl';
import type { GeoJSONSourceSpecification, MapGeoJSONFeature } from 'maplibre-gl';

const DEFAULT_HIT_AREA_WIDTH: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['zoom'],
  9,
  16,
  13,
  20,
  16,
  26
];

const ROUTE_LINE_WIDTH: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['zoom'],
  9,
  3.4,
  12,
  5.4,
  16,
  8.2
];

const SELECTED_LINE_WIDTH: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['zoom'],
  9,
  4.4,
  12,
  6.6,
  16,
  9.4
];

function isStyleLoadingError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return message.toLowerCase().includes('style is not done loading');
}

interface RouteOverlayLayerIds {
  source: string;
  route: string;
  selected: string;
  hitArea: string;
}

interface RouteOverlayPalette {
  routeColor: string | ExpressionSpecification;
  selectedColor: string;
}

interface RouteOverlayLayerProps<TProperties> {
  data: GeoJSONSourceSpecification['data'];
  hitAreaWidth?: ExpressionSpecification;
  ids: RouteOverlayLayerIds;
  isFeature: (feature: MapGeoJSONFeature | undefined) => feature is MapGeoJSONFeature & {
    properties: TProperties;
  };
  map: MapLibreMap | null;
  normalizeProperties: (properties: TProperties) => TProperties;
  objectIdKey: string;
  onClearSelection: () => void;
  onSelect: (properties: TProperties) => void;
  palette: RouteOverlayPalette;
  selectedObjectId: string | number | null;
}

export function RouteOverlayLayer<TProperties>({
  data,
  hitAreaWidth = DEFAULT_HIT_AREA_WIDTH,
  ids,
  isFeature,
  map,
  normalizeProperties,
  objectIdKey,
  onClearSelection,
  onSelect,
  palette,
  selectedObjectId
}: RouteOverlayLayerProps<TProperties>) {
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

      if (!map.getLayer(ids.route)) {
        map.addLayer(
          {
            id: ids.route,
            type: 'line',
            source: ids.source,
            layout: {
              'line-cap': 'round',
              'line-join': 'round'
            },
            paint: {
              'line-color': palette.routeColor,
              'line-width': ROUTE_LINE_WIDTH,
              'line-opacity': 0.7
            }
          }
        );
      }

      if (!map.getLayer(ids.hitArea)) {
        map.addLayer(
          {
            id: ids.hitArea,
            type: 'line',
            source: ids.source,
            layout: {
              'line-cap': 'round',
              'line-join': 'round'
            },
            paint: {
              'line-color': '#000000',
              'line-width': hitAreaWidth,
              'line-opacity': 0
            }
          }
        );
      }

      if (!map.getLayer(ids.selected)) {
        map.addLayer(
          {
            id: ids.selected,
            type: 'line',
            source: ids.source,
            filter: ['==', ['get', objectIdKey], -1],
            layout: {
              'line-cap': 'round',
              'line-join': 'round'
            },
            paint: {
              'line-color': palette.selectedColor,
              'line-width': SELECTED_LINE_WIDTH,
              'line-opacity': 0.62
            }
          }
        );
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

      if (map.getLayer(ids.selected)) {
        map.removeLayer(ids.selected);
      }

      if (map.getLayer(ids.hitArea)) {
        map.removeLayer(ids.hitArea);
      }

      if (map.getLayer(ids.route)) {
        map.removeLayer(ids.route);
      }

      if (map.getSource(ids.source)) {
        map.removeSource(ids.source);
      }
    };
  }, [data, hitAreaWidth, ids.hitArea, ids.route, ids.selected, ids.source, map, objectIdKey, palette.routeColor, palette.selectedColor]);

  useEffect(() => {
    if (!map) {
      return;
    }

    const handleRouteClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];

      if (isFeature(feature)) {
        // Prevent the same click from bubbling into the map-level clear handler.
        event.preventDefault();
        onSelect(normalizeProperties(feature.properties));
      }
    };

    const handlePointerEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };

    const handlePointerLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    const handleMapClick = (event: MapLayerMouseEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      const features = map.queryRenderedFeatures(event.point, {
        layers: [ids.hitArea, ids.route, ids.selected]
      });

      if (features.length === 0) {
        onClearSelection();
      }
    };

    map.on('click', ids.hitArea, handleRouteClick);
    map.on('mouseenter', ids.hitArea, handlePointerEnter);
    map.on('mouseleave', ids.hitArea, handlePointerLeave);
    map.on('click', handleMapClick);

    return () => {
      map.off('click', ids.hitArea, handleRouteClick);
      map.off('mouseenter', ids.hitArea, handlePointerEnter);
      map.off('mouseleave', ids.hitArea, handlePointerLeave);
      map.off('click', handleMapClick);
    };
  }, [ids.hitArea, ids.route, ids.selected, isFeature, map, normalizeProperties, onClearSelection, onSelect]);

  useEffect(() => {
    if (!map || !map.getLayer(ids.selected)) {
      return;
    }

    const filter =
      selectedObjectId === null
        ? (['==', ['get', objectIdKey], -1] as ExpressionSpecification)
        : (['==', ['get', objectIdKey], selectedObjectId] as ExpressionSpecification);

    map.setFilter(ids.selected, filter);
  }, [ids.selected, map, objectIdKey, selectedObjectId]);

  return null;
}
