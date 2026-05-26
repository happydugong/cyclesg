// Adapts Google My Maps overlays by delegating to the curated overlay pipeline,
// since My Maps data is already normalized into the app's curated GeoJSON format.
import type { MyMapsOverlaySourceConfig } from '../../../config/overlaySources';
import type { CuratedRoutesGeoJson } from '../../../types/curatedRoutes';
import type { OverlayLayerViewModel } from '../overlayViewModel';
import { buildCuratedOverlayLayerViewModels } from '../helpers/curatedOverlayAdapter';

export function buildMyMapsOverlayLayerViewModels(
  source: MyMapsOverlaySourceConfig,
  data: CuratedRoutesGeoJson | null
): OverlayLayerViewModel[] {
  return buildCuratedOverlayLayerViewModels(source, data);
}
