// Adapts the official cycling-path source into the shared overlay view model shape.
import type { DataGovOverlaySourceConfig } from '../../../config/overlaySources';
import type { CyclingPathGeoJson } from '../../../types/cyclingPath';
import type { OverlayLayerViewModel } from '../overlayViewModel';
import { buildOverlayLayerViewModel } from '../overlayViewModel';
import { buildOfficialLineRouteGeoJson } from '../helpers/lineRouteAdapter';

function buildCyclingPathRoutes(
  cyclingPathData: CyclingPathGeoJson | null,
  overlaySourceId: string
) {
  return buildOfficialLineRouteGeoJson(cyclingPathData, overlaySourceId, {
    getRouteId: (properties) => `cycling-${properties.OBJECTID_1}`,
    routeType: 'cycling-path',
    routeSource: 'cycling-path',
    getRouteName: (properties) => properties.CYL_PATH ?? 'LTA Cycling Path',
    getRouteGroup: (properties) =>
      properties.AGENCY_MAINT ?? 'Land Transport Authority cycling path network',
    getRouteLength: (properties) => properties['SHAPE_1.LEN']
  });
}

export function buildCyclingPathOverlayLayerViewModels(
  source: DataGovOverlaySourceConfig,
  data: CyclingPathGeoJson | null
): OverlayLayerViewModel[] {
  return [
    buildOverlayLayerViewModel({
      id: source.id,
      label: source.label,
      source,
      routeData: buildCyclingPathRoutes(data, source.id),
      poiData: null,
      palette: {
        routeColor: source.presentation.routeColor,
        selectedColor: source.presentation.selectedColor,
        poiColor: source.presentation.routeColor,
        poiTextColor: source.presentation.activeTextColor,
        poiHaloColor: source.presentation.activeBackgroundColor
      },
      activeBackgroundColor: source.presentation.activeBackgroundColor,
      activeTextColor: source.presentation.activeTextColor
    })
  ];
}
