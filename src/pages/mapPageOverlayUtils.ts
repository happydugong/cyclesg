import type { OverlaySourceConfig, OverlaySourceGeoJson } from '../config/overlaySources';
import { buildConvertedOverlayLayerViewModels } from './overlay/curatedOverlayAdapter';
import type {
  OverlayLayerViewModel,
  OverlaySourceRuntimeState
} from './overlay/overlayViewModel';

export * from './overlay/overlayViewModel';

export function buildOverlayLayerViewModels(
  overlaySources: OverlaySourceConfig[],
  overlayStates: OverlaySourceRuntimeState[]
): OverlayLayerViewModel[] {
  const overlayDataBySourceId = new Map(
    overlayStates.map((overlayState) => [overlayState.sourceId, overlayState.data])
  );

  return overlaySources.flatMap((source) => {
    const data = overlayDataBySourceId.get(source.id) ?? null;
    return buildConvertedOverlayLayerViewModels(source, data as OverlaySourceGeoJson | null);
  });
}
