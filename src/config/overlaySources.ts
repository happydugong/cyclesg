import overlaySourcesJson from './overlay-sources.generated.json';
import { loadCyclingPathGeoJson } from '../services/cyclingPath/cyclingPathService';
import { loadCuratedRoutesGeoJson } from '../services/curatedRoutes/curatedRoutesService';
import { loadPcnGeoJson } from '../services/pcn/pcnService';
import type { CyclingPathGeoJson } from '../types/cyclingPath';
import type { CuratedRoutesGeoJson } from '../types/curatedRoutes';
import type { PcnGeoJson } from '../types/pcn';

export type OverlaySourceKind = 'data-gov-sg' | 'google-my-maps' | 'local-file';
export type FeatureAdapter = 'pcn' | 'cycling-path' | 'my-maps' | 'strava-gpx';

export interface OverlaySourceAttribution {
  message?: string;
  sourceLabel?: string;
  sourceUrl?: string;
}

export interface OverlaySourcePresentation {
  routeColor: string;
  selectedColor: string;
  activeBackgroundColor: string;
  activeTextColor: string;
}

export interface CuratedLayerColors {
  route: string;
  selected: string;
  poi: string;
  poiText: string;
  poiHalo: string;
}

interface OverlaySourceAssetConfig {
  geoJson: string;
  metadata: string;
}

interface DataGovSyncConfig {
  datasetId: string;
  datasetTitle: string;
  agency: string;
  minFeatureCount: number;
}

interface MyMapsSyncConfig {
  sourceUrl: string;
}

interface MyMapsLayerRules {
  hiddenLayerNames?: string[];
  poiIcons?: {
    default?: string;
    byLayerName?: Record<string, string>;
    byName?: Record<string, string>;
  };
  poiIconScales?: {
    default?: number;
    byLayerName?: Record<string, number>;
    byName?: Record<string, number>;
  };
  colors?: {
    default: CuratedLayerColors;
    byLayerName?: Record<string, CuratedLayerColors>;
  };
}

interface OverlaySourceConfigBase {
  id: string;
  label: string;
  sourceKind: OverlaySourceKind;
  featureAdapter: FeatureAdapter;
  defaultVisible: boolean;
  description: string;
  asset: OverlaySourceAssetConfig;
  attribution?: OverlaySourceAttribution;
  presentation: OverlaySourcePresentation;
}

export interface DataGovOverlaySourceConfig extends OverlaySourceConfigBase {
  sourceKind: 'data-gov-sg';
  featureAdapter: 'pcn' | 'cycling-path';
  sync: DataGovSyncConfig;
}

export interface MyMapsOverlaySourceConfig extends OverlaySourceConfigBase {
  sourceKind: 'google-my-maps';
  featureAdapter: 'my-maps';
  sync: MyMapsSyncConfig;
  layerRules?: MyMapsLayerRules;
}

export interface LocalFileOverlaySourceConfig extends OverlaySourceConfigBase {
  sourceKind: 'local-file';
  featureAdapter: 'strava-gpx';
  layerRules?: MyMapsLayerRules;
}

export type OverlaySourceConfig =
  | DataGovOverlaySourceConfig
  | MyMapsOverlaySourceConfig
  | LocalFileOverlaySourceConfig;
export type OverlaySourceGeoJson = PcnGeoJson | CyclingPathGeoJson | CuratedRoutesGeoJson;

export const OVERLAY_SOURCES = overlaySourcesJson as OverlaySourceConfig[];

export function isMyMapsOverlaySource(
  source: OverlaySourceConfig
): source is MyMapsOverlaySourceConfig {
  return source.sourceKind === 'google-my-maps';
}

export function isCuratedFileOverlaySource(
  source: OverlaySourceConfig
): source is LocalFileOverlaySourceConfig {
  return source.sourceKind === 'local-file';
}

export function isDataGovOverlaySource(
  source: OverlaySourceConfig
): source is DataGovOverlaySourceConfig {
  return source.sourceKind === 'data-gov-sg';
}

export function getOverlaySourcesByKind(sourceKind: OverlaySourceKind) {
  return OVERLAY_SOURCES.filter((source) => source.sourceKind === sourceKind);
}

export async function loadOverlaySourceGeoJson(
  source: OverlaySourceConfig
): Promise<OverlaySourceGeoJson> {
  switch (source.featureAdapter) {
    case 'pcn':
      return loadPcnGeoJson();
    case 'cycling-path':
      return loadCyclingPathGeoJson();
    case 'my-maps':
    case 'strava-gpx':
      return loadCuratedRoutesGeoJson(source.asset.geoJson);
  }
}
