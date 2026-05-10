import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const DATASET_ID = 'd_a69ef89737379f231d2ae93fd1c5707f';
const DATASET_PAGE_URL = `https://data.gov.sg/datasets/${DATASET_ID}/view`;
const DOWNLOAD_POLL_URL = `https://api-open.data.gov.sg/v1/public/api/datasets/${DATASET_ID}/poll-download`;
const OUTPUT_PATH = resolve(process.cwd(), 'src/assets/pcn.geojson');
const METADATA_PATH = resolve(process.cwd(), 'src/assets/pcn-metadata.json');
const SINGAPORE_BOUNDS = {
  minLng: 103.58,
  maxLng: 104.1,
  minLat: 1.19,
  maxLat: 1.48
};

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

function validateFeatureCollection(geoJson) {
  assert(geoJson && geoJson.type === 'FeatureCollection', 'Expected a GeoJSON FeatureCollection.');
  assert(Array.isArray(geoJson.features), 'Expected GeoJSON features to be an array.');
  assert(geoJson.features.length > 100, 'Feature count is unexpectedly low.');

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

function createMetadata(geoJson) {
  const timestamp = new Date().toISOString();
  const featureCount = geoJson.features.length;

  return {
    datasetId: DATASET_ID,
    datasetPageUrl: DATASET_PAGE_URL,
    datasetTitle: 'Park Connector Loop',
    agency: 'NParks',
    syncedAt: timestamp,
    featureCount
  };
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

async function main() {
  const pollResult = await fetchJson(DOWNLOAD_POLL_URL);
  assert(pollResult.code === 0, pollResult.errMsg || 'Download poll failed.');
  assert(pollResult.data?.url, 'Download URL missing from poll response.');

  const geoJson = await fetchJson(pollResult.data.url);
  validateFeatureCollection(geoJson);

  const normalizedGeoJson = `${JSON.stringify(geoJson, null, 2)}\n`;
  const metadata = createMetadata(geoJson);
  const normalizedMetadata = `${JSON.stringify(metadata, null, 2)}\n`;

  const geoJsonChanged = await writeIfChanged(OUTPUT_PATH, normalizedGeoJson);
  const metadataChanged = await writeIfChanged(METADATA_PATH, normalizedMetadata);

  console.log(
    JSON.stringify(
      {
        datasetId: DATASET_ID,
        featureCount: geoJson.features.length,
        geoJsonChanged,
        metadataChanged
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
