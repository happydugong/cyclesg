import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { loadDataGovOverlaySourceConfigs } from './config.mjs';
import { assert, stringifyJson, writeIfChanged } from './common.mjs';
import { getOverlayDataPaths } from './file-layout.mjs';

function buildPcnFeatures(source, geoJson) {
  return geoJson.features.map((feature) => ({
    type: 'Feature',
    geometry: feature.geometry,
    properties: {
      featureId: `pcn-${feature.properties.OBJECTID}`,
      routeId: `pcn-${feature.properties.OBJECTID}`,
      overlayId: source.id,
      overlayName: source.label,
      sourceType: 'data-gov-sg',
      routeType: 'pcn',
      routeSource: 'official-pcn',
      routeName: feature.properties.PARK,
      routeGroup: feature.properties.PCN_LOOP,
      routeLength: feature.properties['SHAPE.LEN'],
      name: feature.properties.PARK,
      description: null,
      layerName: null,
      geometryKind: 'line',
      styleUrl: null,
      styleId: null,
      iconHref: null,
      poiIconHref: null,
      poiIconId: null,
      strokeColor: null,
      strokeWidth: null,
      overlayLayerId: source.id
    }
  }));
}

function buildCyclingPathFeatures(source, geoJson) {
  return geoJson.features.map((feature) => ({
    type: 'Feature',
    geometry: feature.geometry,
    properties: {
      featureId: `cycling-${feature.properties.OBJECTID_1}`,
      routeId: `cycling-${feature.properties.OBJECTID_1}`,
      overlayId: source.id,
      overlayName: source.label,
      sourceType: 'data-gov-sg',
      routeType: 'cycling-path',
      routeSource: 'cycling-path',
      routeName: feature.properties.CYL_PATH ?? 'LTA Cycling Path',
      routeGroup: feature.properties.AGENCY_MAINT ?? 'Land Transport Authority cycling path network',
      routeLength: feature.properties['SHAPE_1.LEN'],
      name: feature.properties.CYL_PATH ?? 'LTA Cycling Path',
      description: null,
      layerName: null,
      geometryKind: 'line',
      styleUrl: null,
      styleId: null,
      iconHref: null,
      poiIconHref: null,
      poiIconId: null,
      strokeColor: null,
      strokeWidth: null,
      overlayLayerId: source.id
    }
  }));
}

function formatRailGroundLevel(groundLevel) {
  return groundLevel.toLowerCase().replace(/^./, (value) => value.toUpperCase());
}

function titlecase(name) {
  const normalizedName = name?.trim();

  if (!normalizedName) {
    return 'Unnamed Station';
  }

  return normalizedName.toLowerCase().replace(/\b[a-z]/g, (value) => value.toUpperCase());
}

function getPositionsFromStationGeometry(geometry) {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.flat();
  }

  return geometry.coordinates.flat(2);
}

function getGeometryCenter(positions) {
  const validPositions = positions.filter(
    (position) =>
      Array.isArray(position) &&
      position.length >= 2 &&
      typeof position[0] === 'number' &&
      typeof position[1] === 'number'
  );

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

function buildRailStationFeatures(source, geoJson) {
  return geoJson.features.flatMap((feature) => {
    const center = getGeometryCenter(getPositionsFromStationGeometry(feature.geometry));

    if (!center) {
      return [];
    }

    const stationName = titlecase(feature.properties.NAME);

    return [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: center
        },
        properties: {
          featureId: `rail-station-${feature.properties.OBJECTID}`,
          routeId: `rail-station-${feature.properties.OBJECTID}`,
          overlayId: source.id,
          overlayName: source.label,
          sourceType: 'data-gov-sg',
          routeType: 'rail-station',
          routeSource: 'official-rail-station',
          routeName: stationName,
          routeGroup: source.label,
          routeLength: null,
          name: stationName,
          description: `${feature.properties.RAIL_TYPE} ${formatRailGroundLevel(feature.properties.GRND_LEVEL)} station`,
          layerName: null,
          geometryKind: 'point',
          styleUrl: null,
          styleId: null,
          iconHref: null,
          poiIconHref: null,
          poiIconId: null,
          strokeColor: null,
          strokeWidth: null,
          overlayLayerId: source.id
        }
      }
    ];
  });
}

function convertGeoJson(source, geoJson) {
  switch (source.featureAdapter) {
    case 'pcn':
      return buildPcnFeatures(source, geoJson);
    case 'cycling-path':
      return buildCyclingPathFeatures(source, geoJson);
    case 'rail-station':
      return buildRailStationFeatures(source, geoJson);
  }
}

function countFeatureTypes(features) {
  return features.reduce(
    (result, feature) => {
      if (feature.geometry.type === 'Point') {
        result.pointCount += 1;
      } else {
        result.lineCount += 1;
      }

      return result;
    },
    { lineCount: 0, pointCount: 0 }
  );
}

export async function convertDataGovOverlays() {
  const sources = await loadDataGovOverlaySourceConfigs();
  const results = [];

  for (const source of sources) {
    const paths = getOverlayDataPaths(source.id, 'geojson');
    const rawGeoJson = JSON.parse(await readFile(paths.rawPath, 'utf8'));
    assert(rawGeoJson?.type === 'FeatureCollection', `Expected FeatureCollection in ${paths.rawPath}.`);

    const features = convertGeoJson(source, rawGeoJson);
    const counts = countFeatureTypes(features);
    const overlayGeoJson = {
      type: 'FeatureCollection',
      features
    };
    const metadata = {
      sourceId: source.id,
      sourceKind: source.sourceKind,
      featureAdapter: source.featureAdapter,
      convertedAt: new Date().toISOString(),
      rawPath: resolve(process.cwd(), paths.rawPath).replace(`${process.cwd()}/`, ''),
      featureCount: features.length,
      ...counts
    };

    const geoJsonChanged = await writeIfChanged(paths.convertedGeoJsonPath, stringifyJson(overlayGeoJson));
    const convertMetadataChanged = await writeIfChanged(
      paths.convertMetadataPath,
      stringifyJson(metadata)
    );

    results.push({
      sourceId: source.id,
      featureCount: features.length,
      geoJsonChanged,
      convertMetadataChanged
    });
  }

  return results;
}

async function main() {
  console.log(JSON.stringify(await convertDataGovOverlays(), null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
