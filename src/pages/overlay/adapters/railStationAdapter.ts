// Adapts the official rail-station source into the shared overlay view model shape
// by converting station polygons into representative point POIs.
import type { Position } from 'geojson';
import type { DataGovOverlaySourceConfig } from '../../../config/overlaySources';
import type { CuratedRoutesGeoJson } from '../../../types/curatedRoutes';
import type { RailStationGeoJson } from '../../../types/railStation';
import type { OverlayLayerViewModel } from '../overlayViewModel';
import { buildOverlayLayerViewModel } from '../overlayViewModel';

function formatRailGroundLevel(groundLevel: string) {
  return groundLevel
    .toLowerCase()
    .replace(/^./, (firstCharacter) => firstCharacter.toUpperCase());
}

function titlecase(name: string | null) {
  const normalizedName = name?.trim();

  if (!normalizedName) {
    return 'Unnamed Station';
  }

  return normalizedName
    .toLowerCase()
    .replace(/\b[a-z]/g, (firstCharacter) => firstCharacter.toUpperCase());
}

function getPositionsFromStationGeometry(
  geometry: RailStationGeoJson['features'][number]['geometry']
): Position[] {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.flat();
  }

  return geometry.coordinates.flat(2);
}

function getGeometryCenter(positions: Position[]): [number, number] | null {
  const validPositions = positions.filter((position): position is [number, number] => {
    return (
      position.length >= 2 &&
      typeof position[0] === 'number' &&
      typeof position[1] === 'number'
    );
  });

  if (validPositions.length === 0) {
    return null;
  }

  const totals = validPositions.reduce(
    (currentTotals, position) => ({
      longitude: currentTotals.longitude + position[0],
      latitude: currentTotals.latitude + position[1]
    }),
    { longitude: 0, latitude: 0 }
  );

  return [
    totals.longitude / validPositions.length,
    totals.latitude / validPositions.length
  ];
}

function buildRailStationPois(
  railStationData: RailStationGeoJson | null,
  source: DataGovOverlaySourceConfig
): CuratedRoutesGeoJson | null {
  if (!railStationData) {
    return null;
  }

  const features = railStationData.features.flatMap((feature): CuratedRoutesGeoJson['features'] => {
    const center = getGeometryCenter(getPositionsFromStationGeometry(feature.geometry));

    if (!center) {
      return [];
    }

    return [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: center
        },
        properties: {
          featureId: `rail-station-${feature.properties.OBJECTID}`,
          overlayId: source.id,
          overlayName: source.label,
          sourceType: 'data-gov-sg',
          routeType: 'rail-station',
          routeSource: 'official-rail-station',
          name: titlecase(feature.properties.NAME),
          description: `${feature.properties.RAIL_TYPE} ${formatRailGroundLevel(feature.properties.GRND_LEVEL)} station`,
          layerName: null,
          geometryKind: 'point',
          styleUrl: null,
          styleId: null,
          iconHref: null,
          poiIconHref: null,
          poiIconId: null,
          strokeColor: null,
          strokeWidth: null
        }
      }
    ];
  });

  return {
    type: 'FeatureCollection',
    features
  };
}

export function buildRailStationOverlayLayerViewModels(
  source: DataGovOverlaySourceConfig,
  data: RailStationGeoJson | null
): OverlayLayerViewModel[] {
  return [
    buildOverlayLayerViewModel({
      id: source.id,
      label: source.label,
      source,
      routeData: null,
      poiData: buildRailStationPois(data, source),
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
