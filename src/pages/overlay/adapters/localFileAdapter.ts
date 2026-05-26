// Adapts local-file overlays by delegating to the curated overlay pipeline,
// since imported GPX-derived data is normalized into the curated GeoJSON format.
import type { LocalFileOverlaySourceConfig } from '../../../config/overlaySources';
import type { CuratedRoutesGeoJson } from '../../../types/curatedRoutes';
import type { OverlayLayerViewModel } from '../overlayViewModel';
import { buildCuratedOverlayLayerViewModels } from '../helpers/curatedOverlayAdapter';

export function buildLocalFileOverlayLayerViewModels(
  source: LocalFileOverlaySourceConfig,
  data: CuratedRoutesGeoJson | null
): OverlayLayerViewModel[] {
  return buildCuratedOverlayLayerViewModels(source, data);
}
