// Adapts the official PCN source into the shared overlay view model shape.
import type { DataGovOverlaySourceConfig } from '../../../config/overlaySources';
import type { PcnGeoJson } from '../../../types/pcn';
import type { OverlayLayerViewModel } from '../overlayViewModel';
import { buildOverlayLayerViewModel } from '../overlayViewModel';
import { buildOfficialLineRouteGeoJson } from '../helpers/lineRouteAdapter';

function buildPcnRoutes(pcnData: PcnGeoJson | null, overlaySourceId: string) {
  return buildOfficialLineRouteGeoJson(pcnData, overlaySourceId, {
    getRouteId: (properties) => `pcn-${properties.OBJECTID}`,
    routeType: 'pcn',
    routeSource: 'official-pcn',
    getRouteName: (properties) => properties.PARK,
    getRouteGroup: (properties) => properties.PCN_LOOP,
    getRouteLength: (properties) => properties['SHAPE.LEN']
  });
}

export function buildPcnOverlayLayerViewModels(
  source: DataGovOverlaySourceConfig,
  data: PcnGeoJson | null
): OverlayLayerViewModel[] {
  return [
    buildOverlayLayerViewModel({
      id: source.id,
      label: source.label,
      source,
      routeData: buildPcnRoutes(data, source.id),
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
