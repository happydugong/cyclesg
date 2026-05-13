import { useEffect } from 'react';
import type {
  ExpressionSpecification,
  GeoJSONSource,
  GeoJSONSourceSpecification,
  FilterSpecification,
  Map as MapLibreMap,
  MapLayerMouseEvent
} from 'maplibre-gl';
import type { CuratedRoutesGeoJson } from '../types/curatedRoutes';

interface CuratedPoiLayerProps {
  data: GeoJSONSourceSpecification['data'];
  ids: {
    source: string;
    circle: string;
    icon: string;
    label: string;
  };
  map: MapLibreMap | null;
  onClearSelection: () => void;
  onSelect: (properties: CuratedRoutesGeoJson['features'][number]['properties']) => void;
  palette: {
    circleColor: string;
    iconScale?: number;
    textColor: string;
    textHaloColor: string;
  };
}

function getConfiguredIcons(data: GeoJSONSourceSpecification['data']) {
  if (typeof data === 'string' || !('features' in data)) {
    return [];
  }

  const icons = new Map<string, string>();

  for (const feature of (data as CuratedRoutesGeoJson).features) {
    const iconId = feature.properties.poiIconId;
    const iconHref = feature.properties.poiIconHref;

    if (iconId && iconHref) {
      icons.set(iconId, iconHref);
    }
  }

  return Array.from(icons, ([id, href]) => ({ id, href }));
}

function getLoadedIconFilter(iconIds: string[]): FilterSpecification {
  if (iconIds.length === 0) {
    return ['==', ['get', 'poiIconId'], '__never__'] as FilterSpecification;
  }

  return [
    'match',
    ['get', 'poiIconId'],
    iconIds,
    true,
    false
  ] as FilterSpecification;
}

function isStyleLoadingError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return message.toLowerCase().includes('style is not done loading');
}

function loadSvgRasterImage(url: string) {
  return new Promise<ImageData>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const width = image.naturalWidth || image.width || 64;
      const height = image.naturalHeight || image.height || 64;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');

      if (!context) {
        reject(new Error(`Unable to rasterize POI icon: ${url}`));
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      resolve(context.getImageData(0, 0, width, height));
    };
    image.onerror = () => reject(new Error(`Unable to load POI icon: ${url}`));
    image.src = url;
  });
}

function shouldLoadAsSvgImage(url: string) {
  return /\.svg(?:[?#].*)?$/i.test(url) || /^data:image\/svg\+xml/i.test(url);
}

function getIconSizeExpression(iconScale = 1): ExpressionSpecification {
  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    10,
    0.55 * iconScale,
    14,
    0.7 * iconScale,
    17,
    0.9 * iconScale
  ] as ExpressionSpecification;
}

export function CuratedPoiLayer({
  data,
  ids,
  map,
  onClearSelection,
  onSelect,
  palette
}: CuratedPoiLayerProps) {
  useEffect(() => {
    if (!map) {
      return;
    }

    const configuredIcons = getConfiguredIcons(data);
    const loadedIconIds = new Set<string>();

    const refreshIconFilters = () => {
      const iconIds = Array.from(loadedIconIds);
      const loadedIconFilter = getLoadedIconFilter(iconIds);

      if (map.getLayer(ids.circle)) {
        map.setFilter(ids.circle, ['!', loadedIconFilter] as FilterSpecification);
      }

      if (map.getLayer(ids.icon)) {
        map.setFilter(ids.icon, loadedIconFilter);
      }
    };

    const loadConfiguredIcons = () => {
      void Promise.all(
        configuredIcons.map(async (icon) => {
          if (map.hasImage(icon.id)) {
            return;
          }

          const image = shouldLoadAsSvgImage(icon.href)
            ? { data: await loadSvgRasterImage(icon.href) }
            : await map.loadImage(icon.href);

          if (!map.hasImage(icon.id)) {
            map.addImage(icon.id, image.data);
          }

          loadedIconIds.add(icon.id);
          refreshIconFilters();
        })
      ).catch(() => {
        // Keep fallback circle markers visible if a configured icon cannot load.
      });
    };

    const addLayer = () => {
      if (configuredIcons.length > 0) {
        loadConfiguredIcons();
      }

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

      if (!map.getLayer(ids.icon)) {
        map.addLayer({
          id: ids.icon,
          type: 'symbol',
          source: ids.source,
          layout: {
            'icon-image': ['coalesce', ['get', 'poiIconId'], ''],
            'icon-size': getIconSizeExpression(palette.iconScale),
            'icon-anchor': 'bottom',
            'icon-offset': [0, -2],
            'icon-allow-overlap': true
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
            'text-offset': [0, 0.8],
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

      refreshIconFilters();
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

      if (map.getLayer(ids.icon)) {
        map.removeLayer(ids.icon);
      }

      if (map.getLayer(ids.circle)) {
        map.removeLayer(ids.circle);
      }

      if (map.getSource(ids.source)) {
        map.removeSource(ids.source);
      }
    };
  }, [data, ids.circle, ids.icon, ids.label, ids.source, map, palette.circleColor, palette.iconScale, palette.textColor, palette.textHaloColor]);

  useEffect(() => {
    if (!map) {
      return;
    }

    const handlePoiClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const properties = feature?.properties as
        | CuratedRoutesGeoJson['features'][number]['properties']
        | undefined;

      if (properties?.featureId && properties.geometryKind === 'point') {
        event.preventDefault();
        onSelect(properties);
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
        layers: [ids.circle, ids.icon, ids.label]
      });

      if (features.length === 0) {
        onClearSelection();
      }
    };

    map.on('click', ids.circle, handlePoiClick);
    map.on('click', ids.icon, handlePoiClick);
    map.on('click', ids.label, handlePoiClick);
    map.on('mouseenter', ids.circle, handlePointerEnter);
    map.on('mouseenter', ids.icon, handlePointerEnter);
    map.on('mouseenter', ids.label, handlePointerEnter);
    map.on('mouseleave', ids.circle, handlePointerLeave);
    map.on('mouseleave', ids.icon, handlePointerLeave);
    map.on('mouseleave', ids.label, handlePointerLeave);
    map.on('click', handleMapClick);

    return () => {
      map.off('click', ids.circle, handlePoiClick);
      map.off('click', ids.icon, handlePoiClick);
      map.off('click', ids.label, handlePoiClick);
      map.off('mouseenter', ids.circle, handlePointerEnter);
      map.off('mouseenter', ids.icon, handlePointerEnter);
      map.off('mouseenter', ids.label, handlePointerEnter);
      map.off('mouseleave', ids.circle, handlePointerLeave);
      map.off('mouseleave', ids.icon, handlePointerLeave);
      map.off('mouseleave', ids.label, handlePointerLeave);
      map.off('click', handleMapClick);
    };
  }, [ids.circle, ids.icon, ids.label, map, onClearSelection, onSelect]);

  return null;
}
