import type { OverlaySourceConfig, OverlaySourceGeoJson } from '../config/overlaySources';
import type { CyclingPathGeoJson } from '../types/cyclingPath';
import type { CuratedRoutesGeoJson } from '../types/curatedRoutes';
import type { PcnGeoJson } from '../types/pcn';
import type { RailStationGeoJson } from '../types/railStation';
import { buildCyclingPathOverlayLayerViewModels } from './overlay/adapters/cyclingPathAdapter';
import { buildLocalFileOverlayLayerViewModels } from './overlay/adapters/localFileAdapter';
import { buildMyMapsOverlayLayerViewModels } from './overlay/adapters/myMapsAdapter';
import { buildPcnOverlayLayerViewModels } from './overlay/adapters/pcnAdapter';
import { buildRailStationOverlayLayerViewModels } from './overlay/adapters/railStationAdapter';
import type {
  OverlayLayerViewModel,
  OverlaySourceRuntimeState
} from './overlay/overlayViewModel';

export * from './overlay/overlayViewModel';

function buildOverlayLayerViewModelsForSource(
  source: OverlaySourceConfig,
  data: OverlaySourceGeoJson | null
): OverlayLayerViewModel[] {
  switch (source.featureAdapter) {
    case 'my-maps':
      return buildMyMapsOverlayLayerViewModels(source, data as CuratedRoutesGeoJson | null);
    case 'strava-gpx':
      return buildLocalFileOverlayLayerViewModels(source, data as CuratedRoutesGeoJson | null);
    case 'pcn':
      return buildPcnOverlayLayerViewModels(source, data as PcnGeoJson | null);
    case 'cycling-path':
      return buildCyclingPathOverlayLayerViewModels(source, data as CyclingPathGeoJson | null);
    case 'rail-station':
      return buildRailStationOverlayLayerViewModels(source, data as RailStationGeoJson | null);
  }
}

export function buildOverlayLayerViewModels(
  overlaySources: OverlaySourceConfig[],
  overlayStates: OverlaySourceRuntimeState[]
): OverlayLayerViewModel[] {
  const overlayDataBySourceId = new Map(
    overlayStates.map((overlayState) => [overlayState.sourceId, overlayState.data])
  );

  return overlaySources.flatMap((source) => {
    const data = overlayDataBySourceId.get(source.id) ?? null;
    return buildOverlayLayerViewModelsForSource(source, data);
  });
}
