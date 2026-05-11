import { useEffect, useMemo } from 'react';
import type {
  ExpressionSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
  MapLayerMouseEvent
} from 'maplibre-gl';
import type { MapGeoJSONFeature } from 'maplibre-gl';
import type { PcnGeoJson, PcnProperties } from '../types/pcn';

const SOURCE_ID = 'pcn-source';
const OUTLINE_LAYER_ID = 'pcn-outline-layer';
const ROUTE_LAYER_ID = 'pcn-route-layer';
const SELECTED_INNER_LAYER_ID = 'pcn-selected-inner-layer';

interface PcnLayerProps {
  data: PcnGeoJson;
  map: MapLibreMap | null;
  selectedObjectId: number | null;
  onSelect: (properties: PcnProperties) => void;
  onClearSelection: () => void;
}

const ACCESSIBLE_LOOP_COLORS = [
  '#1B9E77',
  '#D95F02',
  '#7570B3',
  '#E7298A',
  '#66A61E',
  '#A6761D',
  '#1F78B4',
  '#E31A1C'
] as const;

function createLoopColorExpression(data: PcnGeoJson): ExpressionSpecification {
  const loopNames = Array.from(
    new Set(data.features.map((feature) => feature.properties.PCN_LOOP).filter(Boolean))
  ).sort((left, right) => left.localeCompare(right));

  const expression: unknown[] = ['match', ['get', 'PCN_LOOP']];

  loopNames.forEach((loopName, loopIndex) => {
    expression.push(loopName, ACCESSIBLE_LOOP_COLORS[loopIndex % ACCESSIBLE_LOOP_COLORS.length]);
  });

  expression.push(ACCESSIBLE_LOOP_COLORS[0]);

  return expression as ExpressionSpecification;
}

function isPcnFeature(feature: MapGeoJSONFeature | undefined): feature is MapGeoJSONFeature & {
  properties: PcnProperties;
} {
  const properties = feature?.properties as Record<string, unknown> | undefined;

  if (!properties) {
    return false;
  }

  const objectId = properties.OBJECTID;

  return (
    (typeof objectId === 'number' || typeof objectId === 'string') &&
    typeof properties.PARK === 'string'
  );
}

export function PcnLayer({
  data,
  map,
  selectedObjectId,
  onSelect,
  onClearSelection
}: PcnLayerProps) {
  const routeColorExpression = useMemo(() => createLoopColorExpression(data), [data]);

  useEffect(() => {
    if (!map) {
      return;
    }

    const addLayer = () => {
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data
        });
      } else {
        const source = map.getSource(SOURCE_ID) as GeoJSONSource;
        source.setData(data);
      }

      if (!map.getLayer(OUTLINE_LAYER_ID)) {
        map.addLayer({
          id: OUTLINE_LAYER_ID,
          type: 'line',
          source: SOURCE_ID,
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          },
          paint: {
            'line-color': routeColorExpression,
            'line-width': ['interpolate', ['linear'], ['zoom'], 9, 6, 15, 12],
            'line-opacity': 0.24
          }
        });
      }

      if (!map.getLayer(ROUTE_LAYER_ID)) {
        map.addLayer({
          id: ROUTE_LAYER_ID,
          type: 'line',
          source: SOURCE_ID,
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          },
          paint: {
            'line-color': routeColorExpression,
            'line-width': ['interpolate', ['linear'], ['zoom'], 9, 4, 15, 7],
            'line-opacity': 0.58
          }
        });
      }

      if (!map.getLayer(SELECTED_INNER_LAYER_ID)) {
        map.addLayer({
          id: SELECTED_INNER_LAYER_ID,
          type: 'line',
          source: SOURCE_ID,
          filter: ['==', ['get', 'OBJECTID'], -1],
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          },
          paint: {
            'line-color': '#374151',
            'line-width': ['interpolate', ['linear'], ['zoom'], 9, 5.5, 15, 9],
            'line-opacity': 0.68
          }
        });
      }
    };

    // Style loads asynchronously; this keeps the overlay in sync after reloads and style changes.
    if (map.isStyleLoaded()) {
      addLayer();
    } else {
      map.once('load', addLayer);
    }

    return () => {
      if (map.getLayer(SELECTED_INNER_LAYER_ID)) {
        map.removeLayer(SELECTED_INNER_LAYER_ID);
      }

      if (map.getLayer(ROUTE_LAYER_ID)) {
        map.removeLayer(ROUTE_LAYER_ID);
      }

      if (map.getLayer(OUTLINE_LAYER_ID)) {
        map.removeLayer(OUTLINE_LAYER_ID);
      }

      if (map.getSource(SOURCE_ID)) {
        map.removeSource(SOURCE_ID);
      }
    };
  }, [data, map, routeColorExpression]);

  useEffect(() => {
    if (!map) {
      return;
    }

    const handleRouteClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];

      if (isPcnFeature(feature)) {
        onSelect({
          ...feature.properties,
          OBJECTID: Number(feature.properties.OBJECTID),
          'SHAPE.LEN': Number(feature.properties['SHAPE.LEN'])
        });
      }
    };

    const handlePointerEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };

    const handlePointerLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    const handleMapClick = (event: MapLayerMouseEvent) => {
      const features = map.queryRenderedFeatures(event.point, {
        layers: [ROUTE_LAYER_ID, OUTLINE_LAYER_ID, SELECTED_INNER_LAYER_ID]
      });

      if (features.length === 0) {
        onClearSelection();
      }
    };

    map.on('click', ROUTE_LAYER_ID, handleRouteClick);
    map.on('mouseenter', ROUTE_LAYER_ID, handlePointerEnter);
    map.on('mouseleave', ROUTE_LAYER_ID, handlePointerLeave);
    map.on('click', handleMapClick);

    return () => {
      map.off('click', ROUTE_LAYER_ID, handleRouteClick);
      map.off('mouseenter', ROUTE_LAYER_ID, handlePointerEnter);
      map.off('mouseleave', ROUTE_LAYER_ID, handlePointerLeave);
      map.off('click', handleMapClick);
    };
  }, [map, onClearSelection, onSelect]);

  useEffect(() => {
    if (
      !map || !map.getLayer(SELECTED_INNER_LAYER_ID)
    ) {
      return;
    }

    const filter =
      selectedObjectId === null
        ? (['==', ['get', 'OBJECTID'], -1] as ExpressionSpecification)
        : (['==', ['get', 'OBJECTID'], selectedObjectId] as ExpressionSpecification);

    map.setFilter(SELECTED_INNER_LAYER_ID, filter);
  }, [map, selectedObjectId]);

  return null;
}
