import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { loadMyMapsOverlaySourceConfigs } from './config.mjs';
import { parseCuratedRoutesBuffer, validateFeatures } from './my-maps-kml-parser.mjs';
import { assert, stringifyJson, writeIfChanged } from './common.mjs';
import { getOverlayConvertedDirectory, getOverlayDataPaths, getOverlayRawDirectory } from './file-layout.mjs';

function filterSourcesById(sources, sourceId) {
  if (!sourceId) {
    return sources;
  }

  const filteredSources = sources.filter((source) => source.id === sourceId);

  assert(filteredSources.length > 0, `Unknown Google My Maps overlay source: ${sourceId}`);
  return filteredSources;
}

function annotateOverlayFeatures(geoJson, overlay) {
  return geoJson.features.map((feature) => ({
    ...feature,
    properties: {
      ...feature.properties,
      featureId: `${overlay.id}-${feature.properties.featureId}`,
      routeId: `${overlay.id}-${feature.properties.routeId}`,
      overlayId: overlay.id,
      overlayName: overlay.label
    }
  }));
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

async function getRawPath(sourceId) {
  const rawDirectory = getOverlayRawDirectory(sourceId);
  const entries = await readdir(rawDirectory, { withFileTypes: true });
  const sourceFile = entries.find(
    (entry) => entry.isFile() && (entry.name === 'source.kml' || entry.name === 'source.kmz')
  );

  assert(sourceFile, `Expected source.kml or source.kmz in ${rawDirectory}.`);
  return resolve(rawDirectory, sourceFile.name);
}

export async function convertMyMapsOverlays() {
  const requestedSourceId = process.env.OVERLAY_SOURCE_ID?.trim();
  const sources = filterSourcesById(await loadMyMapsOverlaySourceConfigs(), requestedSourceId);
  const results = [];

  for (const source of sources) {
    const rawPath = await getRawPath(source.id);
    const rawBuffer = await readFile(rawPath);
    const geoJson = await parseCuratedRoutesBuffer(rawBuffer);
    const features = annotateOverlayFeatures(geoJson, source);
    validateFeatures(features, source.label);
    const counts = countFeatureTypes(features);
    const paths = getOverlayDataPaths(source.id, rawPath.endsWith('.kmz') ? 'kmz' : 'kml');

    const overlayGeoJson = {
      type: 'FeatureCollection',
      features
    };
    const metadata = {
      sourceId: source.id,
      sourceKind: source.sourceKind,
      featureAdapter: source.featureAdapter,
      convertedAt: new Date().toISOString(),
      rawPath: resolve(process.cwd(), rawPath).replace(`${process.cwd()}/`, ''),
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
  console.log(JSON.stringify(await convertMyMapsOverlays(), null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
