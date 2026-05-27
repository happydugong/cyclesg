// Builds overlay view models from converted overlay GeoJSON by splitting
// already-normalized route and POI features into per-layer map datasets.
import type {
  CuratedLayerColors,
  OverlaySourceConfig,
  LocalFileOverlaySourceConfig,
  MyMapsOverlaySourceConfig
} from '../../config/overlaySources';
import type { CuratedRoutesGeoJson } from '../../types/curatedRoutes';
import type { UnifiedRouteGeoJson } from '../../types/routes';
import { buildOverlayLayerViewModel, type OverlayLayerViewModel } from './overlayViewModel';

export type CuratedOverlaySourceConfig = MyMapsOverlaySourceConfig | LocalFileOverlaySourceConfig;
type OverlayWithLayerRules = CuratedOverlaySourceConfig;

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function getConfiguredLayerColors(
  overlay: OverlayWithLayerRules,
  layerName: string
): CuratedLayerColors {
  if (!overlay.layerRules?.colors?.default) {
    throw new Error(`Missing layerRules.colors.default for curated overlay "${overlay.id}".`);
  }

  return overlay.layerRules.colors.byLayerName?.[layerName] ?? overlay.layerRules.colors.default;
}

function getConfiguredPoiIconScale(overlay: OverlayWithLayerRules, layerName: string) {
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
  overlay: OverlayWithLayerRules,
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
  geometry:
    | { type: 'LineString'; coordinates: [number, number][] }
    | { type: 'MultiLineString'; coordinates: [number, number][][] };
} {
  return feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString';
}

function buildRouteGeoJson(
  overlayData: CuratedRoutesGeoJson,
  overlay: OverlaySourceConfig,
  overlayLayerId: string,
  layerName: string
): UnifiedRouteGeoJson | null {
  const features = overlayData.features
    .filter((feature) => feature.properties.overlayId === overlay.id)
    .filter((feature) => (feature.properties.layerName ?? overlay.label) === layerName)
    .filter(isLineFeature)
    .map((feature) => ({
      ...feature,
      properties: {
        routeId: feature.properties.routeId,
        routeType: feature.properties.routeType,
        routeSource: feature.properties.routeSource,
        routeName: feature.properties.routeName,
        routeGroup: feature.properties.routeGroup,
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
  overlayData: CuratedRoutesGeoJson,
  overlay: OverlaySourceConfig,
  layerName: string
): CuratedRoutesGeoJson | null {
  const features = overlayData.features
    .filter((feature) => feature.properties.overlayId === overlay.id)
    .filter((feature) => (feature.properties.layerName ?? overlay.label) === layerName)
    .filter(isPointFeature)
    .map((feature) => {
      const poiIconHref =
        overlay.sourceKind === 'google-my-maps' || overlay.sourceKind === 'local-file'
          ? getConfiguredPoiIconHref(overlay, feature, layerName)
          : feature.properties.poiIconHref ?? null;

      return {
        ...feature,
        properties: {
          ...feature.properties,
          poiIconHref,
          poiIconId:
            poiIconHref ? (feature.properties.poiIconId ?? getStableIconId(poiIconHref)) : null
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

function getLayerNames(source: OverlaySourceConfig, data: CuratedRoutesGeoJson) {
  const layerNames = new Set<string>();
  const hiddenLayerNames = new Set(
    source.sourceKind === 'google-my-maps' || source.sourceKind === 'local-file'
      ? source.layerRules?.hiddenLayerNames ?? []
      : []
  );

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

  return layerNames;
}

function getOverlayPalette(source: OverlaySourceConfig, layerName: string) {
  if (source.sourceKind === 'google-my-maps' || source.sourceKind === 'local-file') {
    const colors = getConfiguredLayerColors(source, layerName);

    return {
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
    };
  }

  return {
    palette: {
      routeColor: source.presentation.routeColor,
      selectedColor: source.presentation.selectedColor,
      poiColor: source.presentation.routeColor,
      poiTextColor: source.presentation.activeTextColor,
      poiHaloColor: source.presentation.activeBackgroundColor
    },
    activeBackgroundColor: source.presentation.activeBackgroundColor,
    activeTextColor: source.presentation.activeTextColor
  };
}

export function buildConvertedOverlayLayerViewModels(
  source: OverlaySourceConfig,
  data: CuratedRoutesGeoJson | null
): OverlayLayerViewModel[] {
  if (!data) {
    return [];
  }

  const overlayLayers: OverlayLayerViewModel[] = [];
  const layerNames = getLayerNames(source, data);

  for (const layerName of layerNames) {
    const overlayLayerId =
      source.sourceKind === 'data-gov-sg' && layerName === source.label
        ? source.id
        : `${source.id}-${slugify(layerName || source.label) || 'layer'}`;
    const { palette, activeBackgroundColor, activeTextColor } = getOverlayPalette(source, layerName);

    overlayLayers.push(
      buildOverlayLayerViewModel({
        id: overlayLayerId,
        label: layerName,
        source,
        routeData: buildRouteGeoJson(data, source, overlayLayerId, layerName),
        poiData: buildCuratedPoiGeoJson(data, source, layerName),
        palette,
        activeBackgroundColor,
        activeTextColor
      })
    );
  }

  return overlayLayers;
}
