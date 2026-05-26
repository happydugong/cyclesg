// Adapts curated overlays that already use the app's curated GeoJSON shape,
// splitting mixed features into per-layer route and POI datasets with styling.
import type {
  CuratedLayerColors,
  LocalFileOverlaySourceConfig,
  MyMapsOverlaySourceConfig
} from '../../../config/overlaySources';
import type { CuratedRoutesGeoJson } from '../../../types/curatedRoutes';
import type { UnifiedRouteGeoJson } from '../../../types/routes';
import { buildOverlayLayerViewModel, type OverlayLayerViewModel } from '../overlayViewModel';

export type CuratedOverlaySourceConfig = MyMapsOverlaySourceConfig | LocalFileOverlaySourceConfig;

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function getConfiguredLayerColors(
  overlay: CuratedOverlaySourceConfig,
  layerName: string
): CuratedLayerColors {
  if (!overlay.layerRules?.colors?.default) {
    throw new Error(`Missing layerRules.colors.default for curated overlay "${overlay.id}".`);
  }

  return overlay.layerRules.colors.byLayerName?.[layerName] ?? overlay.layerRules.colors.default;
}

function getConfiguredPoiIconScale(overlay: CuratedOverlaySourceConfig, layerName: string) {
  return (
    overlay.layerRules?.poiIconScales?.byLayerName?.[layerName] ??
    overlay.layerRules?.poiIconScales?.default ??
    1
  );
}

function getStableIconId(iconHref: string) {
  let hash = 0;

  for (let index = 0; index < iconHref.length; index += 1) {
    hash = (hash * 31 + iconHref.charCodeAt(index)) >>> 0;
  }

  return `curated-poi-icon-${hash.toString(36)}`;
}

function resolveConfiguredIconHref(iconHref: string) {
  if (/^(?:[a-z]+:)?\/\//i.test(iconHref) || iconHref.startsWith('data:')) {
    return iconHref;
  }

  const baseUrl = import.meta.env.BASE_URL;
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const normalizedIconHref = iconHref.replace(/^\/+/, '');

  return `${normalizedBaseUrl}${normalizedIconHref}`;
}

function getConfiguredPoiIconHref(
  overlay: CuratedOverlaySourceConfig,
  feature: CuratedRoutesGeoJson['features'][number],
  layerName: string
) {
  const iconHref =
    overlay.layerRules?.poiIcons?.byName?.[feature.properties.name] ??
    overlay.layerRules?.poiIcons?.byLayerName?.[layerName] ??
    overlay.layerRules?.poiIcons?.default ??
    null;

  return iconHref ? resolveConfiguredIconHref(iconHref) : null;
}

function isPointFeature(
  feature: CuratedRoutesGeoJson['features'][number]
): feature is CuratedRoutesGeoJson['features'][number] & {
  geometry: { type: 'Point'; coordinates: [number, number] };
} {
  return feature.geometry.type === 'Point';
}

function isLineFeature(
  feature: CuratedRoutesGeoJson['features'][number]
): feature is CuratedRoutesGeoJson['features'][number] & {
  geometry: { type: 'LineString'; coordinates: [number, number][] };
} {
  return feature.geometry.type === 'LineString';
}

function buildCuratedRouteGeoJson(
  curatedRoutesData: CuratedRoutesGeoJson,
  overlay: CuratedOverlaySourceConfig,
  overlayLayerId: string,
  layerName: string
): UnifiedRouteGeoJson | null {
  const features = curatedRoutesData.features
    .filter((feature) => feature.properties.overlayId === overlay.id)
    .filter((feature) => (feature.properties.layerName ?? overlay.label) === layerName)
    .filter(isLineFeature)
    .map((feature) => ({
      ...feature,
      properties: {
        routeId: feature.properties.featureId,
        routeType: 'curated-my-maps' as const,
        routeSource: 'curated-my-maps' as const,
        routeName: feature.properties.name,
        routeGroup: feature.properties.layerName ?? `${overlay.label} route`,
        routeLength:
          typeof feature.properties.routeLength === 'number'
            ? feature.properties.routeLength
            : feature.properties.routeLength
              ? Number(feature.properties.routeLength)
              : null,
        description: feature.properties.description,
        layerName: feature.properties.layerName,
        overlayId: feature.properties.overlayId,
        overlayName: feature.properties.overlayName,
        overlayLayerId
      }
    }));

  return features.length > 0
    ? {
        type: 'FeatureCollection',
        features
      }
    : null;
}

function buildCuratedPoiGeoJson(
  curatedRoutesData: CuratedRoutesGeoJson,
  overlay: CuratedOverlaySourceConfig,
  layerName: string
): CuratedRoutesGeoJson | null {
  const features = curatedRoutesData.features
    .filter((feature) => feature.properties.overlayId === overlay.id)
    .filter((feature) => (feature.properties.layerName ?? overlay.label) === layerName)
    .filter(isPointFeature)
    .map((feature) => {
      const poiIconHref = getConfiguredPoiIconHref(overlay, feature, layerName);

      return {
        ...feature,
        properties: {
          ...feature.properties,
          routeType: 'curated-poi' as const,
          routeSource: 'curated-my-maps' as const,
          poiIconHref,
          poiIconId: poiIconHref ? getStableIconId(poiIconHref) : null
        }
      };
    });

  return features.length > 0
    ? {
        type: 'FeatureCollection',
        features
      }
    : null;
}

export function buildCuratedOverlayLayerViewModels(
  source: CuratedOverlaySourceConfig,
  data: CuratedRoutesGeoJson | null
): OverlayLayerViewModel[] {
  if (!data) {
    return [];
  }

  const overlayLayers: OverlayLayerViewModel[] = [];
  const layerNames = new Set<string>();
  const hiddenLayerNames = new Set(source.layerRules?.hiddenLayerNames ?? []);

  for (const feature of data.features) {
    if (feature.properties.overlayId !== source.id) {
      continue;
    }

    const layerName = feature.properties.layerName ?? source.label;

    if (hiddenLayerNames.has(layerName)) {
      continue;
    }

    layerNames.add(layerName);
  }

  for (const layerName of layerNames) {
    const overlayLayerId = `${source.id}-${slugify(layerName || source.label) || 'layer'}`;
    const colors = getConfiguredLayerColors(source, layerName);

    overlayLayers.push(
      buildOverlayLayerViewModel({
        id: overlayLayerId,
        label: layerName,
        source,
        routeData: buildCuratedRouteGeoJson(data, source, overlayLayerId, layerName),
        poiData: buildCuratedPoiGeoJson(data, source, layerName),
        palette: {
          routeColor: colors.route,
          selectedColor: colors.selected,
          poiColor: colors.poi,
          poiTextColor: colors.poiText,
          poiHaloColor: colors.poiHalo,
          iconScale: getConfiguredPoiIconScale(source, layerName)
        },
        activeBackgroundColor: colors.poiHalo,
        activeTextColor: colors.selected
      })
    );
  }

  return overlayLayers;
}
