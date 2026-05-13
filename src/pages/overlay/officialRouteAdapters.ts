import type { FeatureCollection, LineString, MultiLineString } from 'geojson';
import type { DataGovOverlaySourceConfig, OverlaySourceGeoJson } from '../../config/overlaySources';
import type { CyclingPathGeoJson } from '../../types/cyclingPath';
import type { PcnGeoJson } from '../../types/pcn';
import type { UnifiedRouteGeoJson } from '../../types/routes';
import {
  getOverlayPoiLayerIds,
  getOverlayRouteLayerIds,
  type OverlayLayerViewModel
} from './overlayRuntime';

interface OfficialRouteFieldMapping<TProperties> {
  getRouteId: (properties: TProperties) => string;
  routeType: 'pcn' | 'cycling-path';
  routeSource: 'official-pcn' | 'cycling-path';
  getRouteName: (properties: TProperties) => string;
  getRouteGroup: (properties: TProperties) => string;
  getRouteLength: (properties: TProperties) => number | null;
}

function buildOfficialRoutes<TProperties>(
  data: FeatureCollection<LineString | MultiLineString, TProperties> | null,
  overlaySourceId: string,
  fieldMapping: OfficialRouteFieldMapping<TProperties>
): UnifiedRouteGeoJson | null {
  if (!data) {
    return null;
  }

  return {
    type: 'FeatureCollection',
    features: data.features.map((feature) => ({
      ...feature,
      properties: {
        routeId: fieldMapping.getRouteId(feature.properties),
        routeType: fieldMapping.routeType,
        routeSource: fieldMapping.routeSource,
        routeName: fieldMapping.getRouteName(feature.properties),
        routeGroup: fieldMapping.getRouteGroup(feature.properties),
        routeLength: fieldMapping.getRouteLength(feature.properties),
        overlayLayerId: overlaySourceId
      }
    }))
  };
}

function buildPcnRoutes(pcnData: PcnGeoJson | null, overlaySourceId: string): UnifiedRouteGeoJson | null {
  return buildOfficialRoutes(pcnData, overlaySourceId, {
    getRouteId: (properties) => `pcn-${properties.OBJECTID}`,
    routeType: 'pcn',
    routeSource: 'official-pcn',
    getRouteName: (properties) => properties.PARK,
    getRouteGroup: (properties) => properties.PCN_LOOP,
    getRouteLength: (properties) => properties['SHAPE.LEN']
  });
}

function buildCyclingPathRoutes(
  cyclingPathData: CyclingPathGeoJson | null,
  overlaySourceId: string
): UnifiedRouteGeoJson | null {
  return buildOfficialRoutes(cyclingPathData, overlaySourceId, {
    getRouteId: (properties) => `cycling-${properties.OBJECTID_1}`,
    routeType: 'cycling-path',
    routeSource: 'cycling-path',
    getRouteName: (properties) => properties.CYL_PATH ?? 'LTA Cycling Path',
    getRouteGroup: (properties) =>
      properties.AGENCY_MAINT ?? 'Land Transport Authority cycling path network',
    getRouteLength: (properties) => properties['SHAPE_1.LEN']
  });
}

export function buildOfficialOverlayLayerViewModel(
  source: DataGovOverlaySourceConfig,
  data: OverlaySourceGeoJson | null
): OverlayLayerViewModel[] {
  const routeData =
    source.featureAdapter === 'pcn'
      ? buildPcnRoutes(data as PcnGeoJson | null, source.id)
      : buildCyclingPathRoutes(data as CyclingPathGeoJson | null, source.id);

  return [
    {
      id: source.id,
      label: source.label,
      source,
      defaultVisible: source.defaultVisible,
      description: source.description,
      routeData,
      poiData: null,
      routeLayerIds: getOverlayRouteLayerIds(source.id),
      poiLayerIds: getOverlayPoiLayerIds(source.id),
      palette: {
        routeColor: source.presentation.routeColor,
        selectedColor: source.presentation.selectedColor
      },
      activeBackgroundColor: source.presentation.activeBackgroundColor,
      activeTextColor: source.presentation.activeTextColor
    }
  ];
}
