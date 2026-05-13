import {
  isDataGovOverlaySource,
  isMyMapsOverlaySource,
  type OverlaySourceConfig
} from '../config/overlaySources';
import type { CuratedRoutesGeoJson } from '../types/curatedRoutes';
import {
  buildOfficialOverlayLayerViewModel
} from './overlay/officialRouteAdapters';
import { buildMyMapsOverlayLayerViewModels } from './overlay/myMapsAdapter';
import type {
  OverlayLayerViewModel,
  OverlaySourceRuntimeState
} from './overlay/overlayRuntime';

export * from './overlay/overlayRuntime';

export function buildOverlayLayerViewModels(
  overlaySources: OverlaySourceConfig[],
  overlayStates: OverlaySourceRuntimeState[]
): OverlayLayerViewModel[] {
  const overlayDataBySourceId = new Map(
    overlayStates.map((overlayState) => [overlayState.sourceId, overlayState.data])
  );

  return overlaySources.flatMap((source) => {
    const data = overlayDataBySourceId.get(source.id) ?? null;

    if (isMyMapsOverlaySource(source)) {
      return buildMyMapsOverlayLayerViewModels(source, data as CuratedRoutesGeoJson | null);
    }

    if (isDataGovOverlaySource(source)) {
      return buildOfficialOverlayLayerViewModel(source, data);
    }

    return [];
  });
}
