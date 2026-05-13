import type { ExpressionSpecification } from 'maplibre-gl';
import type { OverlaySourceConfig, OverlaySourceGeoJson } from '../../config/overlaySources';
import type { CuratedRoutesGeoJson } from '../../types/curatedRoutes';
import type { UnifiedRouteGeoJson, UnifiedRouteProperties } from '../../types/routes';

export interface OverlayLayerViewModel {
  id: string;
  label: string;
  source: OverlaySourceConfig;
  defaultVisible: boolean;
  description: string;
  routeData: UnifiedRouteGeoJson | null;
  poiData: CuratedRoutesGeoJson | null;
  routeLayerIds: {
    source: string;
    route: string;
    selected: string;
    hitArea: string;
  };
  poiLayerIds: {
    source: string;
    circle: string;
    icon: string;
    label: string;
  };
  palette: {
    routeColor: string | ExpressionSpecification;
    selectedColor: string;
    poiColor?: string;
    poiTextColor?: string;
    poiHaloColor?: string;
    iconScale?: number;
  };
  activeBackgroundColor: string;
  activeTextColor: string;
}

export interface OverlaySourceRuntimeState {
  sourceId: string;
  data: OverlaySourceGeoJson | null;
}

export function getOverlayRouteLayerIds(overlayLayerId: string) {
  return {
    source: `mymaps-${overlayLayerId}-routes-source`,
    route: `mymaps-${overlayLayerId}-routes-route-layer`,
    selected: `mymaps-${overlayLayerId}-routes-selected-layer`,
    hitArea: `mymaps-${overlayLayerId}-routes-hit-area-layer`
  };
}

export function getOverlayPoiLayerIds(overlayLayerId: string) {
  return {
    source: `mymaps-${overlayLayerId}-pois-source`,
    circle: `mymaps-${overlayLayerId}-pois-circle-layer`,
    icon: `mymaps-${overlayLayerId}-pois-icon-layer`,
    label: `mymaps-${overlayLayerId}-pois-label-layer`
  };
}

export function getOverlayContentType({
  routeData,
  poiData
}: {
  routeData: UnifiedRouteGeoJson | null;
  poiData?: CuratedRoutesGeoJson | null;
}) {
  if (routeData && poiData) {
    return 'route-poi' as const;
  }

  if (poiData) {
    return 'poi' as const;
  }

  return 'route' as const;
}

export function isUnifiedRouteFeature(
  feature: import('maplibre-gl').MapGeoJSONFeature | undefined
): feature is import('maplibre-gl').MapGeoJSONFeature & {
  properties: UnifiedRouteProperties;
} {
  const properties = feature?.properties as Record<string, unknown> | undefined;

  return Boolean(
    properties &&
      typeof properties.routeId === 'string' &&
      typeof properties.routeName === 'string'
  );
}

export function normalizeUnifiedRouteProperties(
  properties: UnifiedRouteProperties
): UnifiedRouteProperties {
  return {
    ...properties,
    routeId: String(properties.routeId),
    routeName: String(properties.routeName),
    routeGroup: String(properties.routeGroup),
    routeLength:
      typeof properties.routeLength === 'number'
        ? properties.routeLength
        : properties.routeLength
          ? Number(properties.routeLength)
          : null,
    description: properties.description ? String(properties.description) : null,
    layerName: properties.layerName ? String(properties.layerName) : null,
    overlayId: properties.overlayId ? String(properties.overlayId) : null,
    overlayName: properties.overlayName ? String(properties.overlayName) : null,
    overlayLayerId: properties.overlayLayerId ? String(properties.overlayLayerId) : null
  };
}

export function normalizeCuratedPoiProperties(
  properties: CuratedRoutesGeoJson['features'][number]['properties'],
  overlayLayerId: string
): UnifiedRouteProperties {
  return {
    routeId: String(properties.featureId),
    routeType: 'curated-poi',
    routeSource: 'curated-my-maps',
    routeName: String(properties.name),
    routeGroup: String(properties.layerName ?? properties.overlayName),
    routeLength: null,
    description: properties.description ? String(properties.description) : null,
    layerName: properties.layerName ? String(properties.layerName) : null,
    overlayId: properties.overlayId ? String(properties.overlayId) : null,
    overlayName: properties.overlayName ? String(properties.overlayName) : null,
    overlayLayerId
  };
}

export function getRoutePresentation(route: UnifiedRouteProperties) {
  if (route.routeSource === 'official-pcn') {
    return {
      colorClass: 'bg-[#2FA66A]',
      label: 'Park Connector'
    };
  }

  if (route.routeSource === 'cycling-path') {
    return {
      colorClass: 'bg-[#BE93D4]',
      label: 'Cycling Path'
    };
  }

  return {
    colorClass: 'bg-[#F97316]',
    label: route.routeType === 'curated-poi' ? 'POI' : route.overlayName ?? 'Curated Routes'
  };
}
