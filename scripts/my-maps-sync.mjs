import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadMyMapsOverlaySourceConfigs } from './overlay-source-config.mjs';
import { fetchCuratedRoutesBufferFromUrl } from './my-maps-fetch.mjs';
import { parseCuratedRoutesBuffer, validateFeatures } from './my-maps-kml-parser.mjs';

/*
This module owns the repository-facing sync workflow.

It does not parse KML itself and it does not know HTTP details beyond calling
the fetch helper. Its job is:

1. load configured Google My Maps overlays
2. choose whether to rebuild all overlays or refresh one selected overlay
3. merge refreshed overlay features with any untouched existing output
4. write the combined GeoJSON and metadata files

This keeps "repo sync state management" separate from "download bytes" and
"parse KML into features".
*/

const OUTPUT_PATH = resolve(process.cwd(), 'src/assets/curated-routes.geojson');
const METADATA_PATH = resolve(process.cwd(), 'src/assets/curated-routes-metadata.json');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function writeIfChanged(filePath, contents) {
  let previousContents = null;

  try {
    previousContents = await readFile(filePath, 'utf8');
  } catch {
    previousContents = null;
  }

  if (previousContents === contents) {
    return false;
  }

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, 'utf8');

  return true;
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

function indexFeaturesByOverlayId(features) {
  const featureMap = new Map();

  for (const feature of features) {
    const overlayId = feature.properties?.overlayId;
    assert(typeof overlayId === 'string' && overlayId.length > 0, 'Feature is missing properties.overlayId.');

    const existingFeatures = featureMap.get(overlayId) ?? [];
    existingFeatures.push(feature);
    featureMap.set(overlayId, existingFeatures);
  }

  return featureMap;
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch {
    return null;
  }
}

export function normalizeSelectedOverlayId(overlayId) {
  if (Array.isArray(overlayId)) {
    assert(overlayId.length <= 1, 'Only one Google My Maps overlay id can be refreshed at a time.');
    return normalizeSelectedOverlayId(overlayId[0] ?? '');
  }

  const normalizedOverlayId = overlayId.trim();

  if (!normalizedOverlayId) {
    return null;
  }

  assert(
    !normalizedOverlayId.includes(','),
    'Only one Google My Maps overlay id can be refreshed at a time.'
  );

  return normalizedOverlayId;
}

function filterOverlaysById(overlays, selectedOverlayId) {
  if (!selectedOverlayId) {
    return overlays;
  }

  const filteredOverlays = overlays.filter((overlay) => overlay.id === selectedOverlayId);

  assert(filteredOverlays.length === 1, `Unknown Google My Maps overlay id: ${selectedOverlayId}.`);

  return filteredOverlays;
}

function normalizeMyMapsOverlayConfig(overlay) {
  return {
    ...overlay,
    name: overlay.label ?? overlay.name,
    sourceUrl: overlay.sync?.sourceUrl ?? overlay.sourceUrl
  };
}

function annotateOverlayFeatures(geoJson, overlay) {
  return geoJson.features.map((feature) => ({
    ...feature,
    properties: {
      ...feature.properties,
      featureId: `${overlay.id}-${feature.properties.featureId}`,
      overlayId: overlay.id,
      overlayName: overlay.name
    }
  }));
}

async function loadExistingOverlayState({ selectedOverlayId, outputPath, metadataPath }) {
  if (!selectedOverlayId) {
    return {
      existingFeatureMap: new Map(),
      existingOverlayResults: new Map()
    };
  }

  const existingGeoJson = await readJsonIfExists(outputPath);
  const existingMetadata = await readJsonIfExists(metadataPath);

  assert(
    existingGeoJson?.type === 'FeatureCollection' && Array.isArray(existingGeoJson.features),
    'Partial Google My Maps refresh requires an existing curated routes GeoJSON file.'
  );
  assert(
    Array.isArray(existingMetadata?.overlays),
    'Partial Google My Maps refresh requires an existing curated routes metadata file.'
  );

  return {
    existingFeatureMap: indexFeaturesByOverlayId(existingGeoJson.features),
    existingOverlayResults: new Map(existingMetadata.overlays.map((overlay) => [overlay.id, overlay]))
  };
}

function buildCombinedFeatures(overlays, refreshedFeatureMap, existingFeatureMap) {
  const combinedFeatures = [];

  for (const overlay of overlays) {
    const refreshedFeatures = refreshedFeatureMap.get(overlay.id);
    const existingFeatures = existingFeatureMap.get(overlay.id);

    if (refreshedFeatures) {
      combinedFeatures.push(...refreshedFeatures);
      continue;
    }

    if (existingFeatures) {
      combinedFeatures.push(...existingFeatures);
    }
  }

  return combinedFeatures;
}

export async function syncCuratedRoutes(fetchImpl = fetch, options = {}) {
  const overlays = (
    options.overlays ?? await loadMyMapsOverlaySourceConfigs(options.configPath)
  ).map(normalizeMyMapsOverlayConfig);
  const selectedOverlayId = normalizeSelectedOverlayId(options.overlayId ?? '');
  const overlaysToRefresh = filterOverlaysById(overlays, selectedOverlayId);
  const outputPath = options.outputPath ?? OUTPUT_PATH;
  const metadataPath = options.metadataPath ?? METADATA_PATH;
  const { existingFeatureMap, existingOverlayResults } = await loadExistingOverlayState({
    selectedOverlayId,
    outputPath,
    metadataPath
  });
  const overlayResults = [];
  const refreshedFeatureMap = new Map();

  for (const overlay of overlaysToRefresh) {
    const buffer = await fetchCuratedRoutesBufferFromUrl(overlay.sourceUrl, fetchImpl);
    const geoJson = await parseCuratedRoutesBuffer(buffer);
    const annotatedFeatures = annotateOverlayFeatures(geoJson, overlay);

    validateFeatures(annotatedFeatures, overlay.name);
    refreshedFeatureMap.set(overlay.id, annotatedFeatures);

    overlayResults.push({
      id: overlay.id,
      name: overlay.name,
      sourceUrl: overlay.sourceUrl,
      featureCount: annotatedFeatures.length,
      ...countFeatureTypes(annotatedFeatures)
    });
  }

  const overlayResultsById = new Map(overlayResults.map((overlay) => [overlay.id, overlay]));
  const combinedFeatures = buildCombinedFeatures(overlays, refreshedFeatureMap, existingFeatureMap);
  const combinedOverlayResults = overlays
    .map((overlay) => overlayResultsById.get(overlay.id) ?? existingOverlayResults.get(overlay.id))
    .filter(Boolean);

  assert(
    combinedFeatures.length > 0,
    'No curated route features are available after syncing the selected Google My Maps overlays.'
  );

  const counts = countFeatureTypes(combinedFeatures);
  const geoJson = {
    type: 'FeatureCollection',
    features: combinedFeatures
  };
  const metadata = {
    sourceLabel: 'google-my-maps',
    syncedAt: new Date().toISOString(),
    featureCount: geoJson.features.length,
    ...counts,
    overlays: combinedOverlayResults
  };

  const geoJsonChanged = await writeIfChanged(
    outputPath,
    `${JSON.stringify(geoJson, null, 2)}\n`
  );
  const metadataChanged = await writeIfChanged(
    metadataPath,
    `${JSON.stringify(metadata, null, 2)}\n`
  );

  return {
    featureCount: geoJson.features.length,
    ...counts,
    overlays: combinedOverlayResults,
    geoJsonChanged,
    metadataChanged
  };
}

async function main() {
  const result = await syncCuratedRoutes(fetch, {
    overlayId: process.env.OVERLAY_SOURCE_ID ?? ''
  });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
