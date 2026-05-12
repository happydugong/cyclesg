import type { ExpressionSpecification } from 'maplibre-gl';
import type { CyclingPathGeoJson } from '../types/cyclingPath';
import type { CuratedRoutesGeoJson } from '../types/curatedRoutes';
import type { PcnGeoJson } from '../types/pcn';
import type { UnifiedRouteGeoJson, UnifiedRouteProperties } from '../types/routes';

export interface MyMapsOverlayConfig {
  id: string;
  name: string;
  sourceUrl: string;
  defaultVisible?: boolean;
  attribution?: {
    message?: string;
    sourceLabel?: string;
    sourceUrl?: string;
  };
  hiddenLayerNames?: string[];
  colors: {
    route: string;
    selected: string;
    poi: string;
    poiText: string;
    poiHalo: string;
  };
}

export interface MyMapsOverlayLayerViewModel {
  id: string;
  label: string;
  config: MyMapsOverlayConfig;
  colors: {
    route: string;
    selected: string;
    poi: string;
    poiText: string;
    poiHalo: string;
  };
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
    label: string;
  };
}

export interface StaticOverlayViewModel {
  id: string;
  label: string;
  routeData: UnifiedRouteGeoJson | null;
  routeLayerIds: {
    source: string;
    route: string;
    selected: string;
    hitArea: string;
  };
  palette: {
    routeColor: string | ExpressionSpecification;
    selectedColor: string;
  };
}

const CURATED_LAYER_COLOR_SETS = [
  {
    route: '#F97316',
    selected: '#7C2D12',
    poi: '#F97316',
    poiText: '#7C2D12',
    poiHalo: '#FFF7ED'
  },
  {
    route: '#2563EB',
    selected: '#1E3A8A',
    poi: '#2563EB',
    poiText: '#1E3A8A',
    poiHalo: '#DBEAFE'
  },
  {
    route: '#16A34A',
    selected: '#166534',
    poi: '#16A34A',
    poiText: '#166534',
    poiHalo: '#DCFCE7'
  },
  {
    route: '#DC2626',
    selected: '#991B1B',
    poi: '#DC2626',
    poiText: '#991B1B',
    poiHalo: '#FEE2E2'
  },
  {
    route: '#7C3AED',
    selected: '#5B21B6',
    poi: '#7C3AED',
    poiText: '#5B21B6',
    poiHalo: '#EDE9FE'
  },
  {
    route: '#D97706',
    selected: '#92400E',
    poi: '#D97706',
    poiText: '#92400E',
    poiHalo: '#FEF3C7'
  }
] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function getCuratedLayerColors(colorIndex: number) {
  return CURATED_LAYER_COLOR_SETS[colorIndex % CURATED_LAYER_COLOR_SETS.length];
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

export function buildPcnRoutes(pcnData: PcnGeoJson | null): UnifiedRouteGeoJson | null {
  if (!pcnData) {
    return null;
  }

  return {
    type: 'FeatureCollection',
    features: pcnData.features.map((feature) => ({
      ...feature,
      properties: {
        routeId: `pcn-${feature.properties.OBJECTID}`,
        routeType: 'pcn' as const,
        routeSource: 'official-pcn' as const,
        routeName: feature.properties.PARK,
        routeGroup: feature.properties.PCN_LOOP,
        routeLength: feature.properties['SHAPE.LEN'],
        overlayLayerId: 'official-pcn'
      }
    }))
  };
}

export function buildCyclingPathRoutes(
  cyclingPathData: CyclingPathGeoJson | null
): UnifiedRouteGeoJson | null {
  if (!cyclingPathData) {
    return null;
  }

  return {
    type: 'FeatureCollection',
    features: cyclingPathData.features.map((feature) => ({
      ...feature,
      properties: {
        routeId: `cycling-${feature.properties.OBJECTID_1}`,
        routeType: 'cycling-path' as const,
        routeSource: 'cycling-path' as const,
        routeName: feature.properties.CYL_PATH ?? 'LTA Cycling Path',
        routeGroup:
          feature.properties.AGENCY_MAINT ?? 'Land Transport Authority cycling path network',
        routeLength: feature.properties['SHAPE_1.LEN'],
        overlayLayerId: 'official-cycling-path'
      }
    }))
  };
}

function buildCuratedRouteGeoJson(
  curatedRoutesData: CuratedRoutesGeoJson | null,
  overlay: MyMapsOverlayConfig,
  overlayLayerId: string,
  layerName: string
): UnifiedRouteGeoJson | null {
  if (!curatedRoutesData) {
    return null;
  }

  const features = curatedRoutesData.features
    .filter((feature) => feature.properties.overlayId === overlay.id)
    .filter((feature) => (feature.properties.layerName ?? overlay.name) === layerName)
    .filter(isLineFeature)
    .map((feature) => ({
      ...feature,
      properties: {
        routeId: feature.properties.featureId,
        routeType: 'curated-my-maps' as const,
        routeSource: 'curated-my-maps' as const,
        routeName: feature.properties.name,
        routeGroup: feature.properties.layerName ?? `${overlay.name} route`,
        routeLength: null,
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
  curatedRoutesData: CuratedRoutesGeoJson | null,
  overlay: MyMapsOverlayConfig,
  layerName: string
): CuratedRoutesGeoJson | null {
  if (!curatedRoutesData) {
    return null;
  }

  const features = curatedRoutesData.features
    .filter((feature) => feature.properties.overlayId === overlay.id)
    .filter((feature) => (feature.properties.layerName ?? overlay.name) === layerName)
    .filter(isPointFeature);

  return features.length > 0
    ? {
        type: 'FeatureCollection',
        features
      }
    : null;
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
    label: route.overlayName ?? 'Curated Routes'
  };
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

export function buildMyMapsOverlayLayerViewModels(
  curatedRoutesData: CuratedRoutesGeoJson | null,
  overlays: MyMapsOverlayConfig[]
): MyMapsOverlayLayerViewModel[] {
  if (!curatedRoutesData) {
    return [];
  }

  const overlayLayers: MyMapsOverlayLayerViewModel[] = [];
  let colorIndex = 0;

  for (const overlay of overlays) {
    const layerNames = new Set<string>();
    const hiddenLayerNames = new Set(overlay.hiddenLayerNames ?? []);

    for (const feature of curatedRoutesData.features) {
      if (feature.properties.overlayId !== overlay.id) {
        continue;
      }

      const layerName = feature.properties.layerName ?? overlay.name;

      if (hiddenLayerNames.has(layerName)) {
        continue;
      }

      layerNames.add(layerName);
    }

    for (const layerName of Array.from(layerNames)) {
      const overlayLayerId = `${overlay.id}-${slugify(layerName || overlay.name) || 'layer'}`;

      overlayLayers.push({
        id: overlayLayerId,
        label: layerName,
        config: overlay,
        colors: getCuratedLayerColors(colorIndex),
        routeData: buildCuratedRouteGeoJson(curatedRoutesData, overlay, overlayLayerId, layerName),
        poiData: buildCuratedPoiGeoJson(curatedRoutesData, overlay, layerName),
        routeLayerIds: getOverlayRouteLayerIds(overlayLayerId),
        poiLayerIds: getOverlayPoiLayerIds(overlayLayerId)
      });
      colorIndex += 1;
    }
  }

  return overlayLayers;
}

export function loadOverlayData<TData>(
  loader: () => Promise<TData>,
  onSuccess: (data: TData) => void,
  onError: () => void
) {
  let active = true;

  void loader()
    .then((data) => {
      if (active) {
        onSuccess(data);
      }
    })
    .catch(() => {
      if (active) {
        onError();
      }
    });

  return () => {
    active = false;
  };
}
