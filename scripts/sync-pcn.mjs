import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const SINGAPORE_BOUNDS = {
  minLng: 103.58,
  maxLng: 104.1,
  minLat: 1.19,
  maxLat: 1.48
};

const DATASETS = [
  {
    datasetId: 'd_a69ef89737379f231d2ae93fd1c5707f',
    datasetTitle: 'Park Connector Loop',
    agency: 'NParks',
    outputPath: resolve(process.cwd(), 'src/assets/pcn.geojson'),
    metadataPath: resolve(process.cwd(), 'src/assets/pcn-metadata.json'),
    minFeatureCount: 100
  },
  {
    datasetId: 'd_8f468b25193f64be8a16fa7d8f60f553',
    datasetTitle: 'Cycling Path Network (GEOJSON)',
    agency: 'LTA',
    outputPath: resolve(process.cwd(), 'src/assets/cycling-paths.geojson'),
    metadataPath: resolve(process.cwd(), 'src/assets/cycling-paths-metadata.json'),
    minFeatureCount: 100
  }
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function isCoordinateInSingaporeBounds(coordinate) {
  if (!Array.isArray(coordinate) || coordinate.length < 2) {
    return false;
  }

  const [lng, lat] = coordinate;

  return (
    typeof lng === 'number' &&
    typeof lat === 'number' &&
    lng >= SINGAPORE_BOUNDS.minLng &&
    lng <= SINGAPORE_BOUNDS.maxLng &&
    lat >= SINGAPORE_BOUNDS.minLat &&
    lat <= SINGAPORE_BOUNDS.maxLat
  );
}

function collectCoordinates(geometry) {
  if (geometry.type === 'LineString') {
    return geometry.coordinates;
  }

  if (geometry.type === 'MultiLineString') {
    return geometry.coordinates.flat();
  }

  return [];
}

function validateFeatureCollection(geoJson, minFeatureCount) {
  assert(geoJson && geoJson.type === 'FeatureCollection', 'Expected a GeoJSON FeatureCollection.');
  assert(Array.isArray(geoJson.features), 'Expected GeoJSON features to be an array.');
  assert(geoJson.features.length >= minFeatureCount, 'Feature count is unexpectedly low.');

  let outOfBoundsCount = 0;

  for (const feature of geoJson.features) {
    assert(feature && feature.type === 'Feature', 'Each item must be a GeoJSON Feature.');
    assert(feature.geometry, 'Each feature must include geometry.');
    assert(
      feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString',
      `Unexpected geometry type: ${feature.geometry.type}`
    );

    const coordinates = collectCoordinates(feature.geometry);
    assert(coordinates.length > 0, 'Feature geometry must contain coordinates.');

    for (const coordinate of coordinates) {
      if (!isCoordinateInSingaporeBounds(coordinate)) {
        outOfBoundsCount += 1;
      }
    }
  }

  assert(outOfBoundsCount === 0, `Found ${outOfBoundsCount} coordinates outside Singapore bounds.`);
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

async function syncDataset(dataset) {
  const datasetPageUrl = `https://data.gov.sg/datasets/${dataset.datasetId}/view`;
  const downloadPollUrl = `https://api-open.data.gov.sg/v1/public/api/datasets/${dataset.datasetId}/poll-download`;
  const pollResult = await fetchJson(downloadPollUrl);

  assert(pollResult.code === 0, pollResult.errMsg || 'Download poll failed.');
  assert(pollResult.data?.url, 'Download URL missing from poll response.');

  const geoJson = await fetchJson(pollResult.data.url);
  validateFeatureCollection(geoJson, dataset.minFeatureCount);

  const normalizedGeoJson = `${JSON.stringify(geoJson, null, 2)}\n`;
  const metadata = {
    datasetId: dataset.datasetId,
    datasetPageUrl,
    datasetTitle: dataset.datasetTitle,
    agency: dataset.agency,
    syncedAt: new Date().toISOString(),
    featureCount: geoJson.features.length
  };
  const normalizedMetadata = `${JSON.stringify(metadata, null, 2)}\n`;

  const geoJsonChanged = await writeIfChanged(dataset.outputPath, normalizedGeoJson);
  const metadataChanged = await writeIfChanged(dataset.metadataPath, normalizedMetadata);

  return {
    datasetId: dataset.datasetId,
    datasetTitle: dataset.datasetTitle,
    featureCount: geoJson.features.length,
    geoJsonChanged,
    metadataChanged
  };
}

async function main() {
  const results = [];

  for (const dataset of DATASETS) {
    results.push(await syncDataset(dataset));
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
