import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { loadDataGovOverlaySourceConfigs } from './overlay-source-config.mjs';

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

function sleep(milliseconds) {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, milliseconds);
  });
}

async function fetchJson(url, attempt = 1) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json'
    }
  });

  if (response.status === 429 && attempt < 4) {
    const retryAfterHeader = response.headers.get('retry-after');
    const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
    const retryDelay = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
      ? retryAfterSeconds * 1000
      : 2 ** attempt * 1000;

    await sleep(retryDelay);
    return fetchJson(url, attempt + 1);
  }

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

  if (geometry.type === 'Polygon') {
    return geometry.coordinates.flat();
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.flat(2);
  }

  return [];
}

function getExpectedGeometryTypes(featureAdapter) {
  if (featureAdapter === 'rail-station') {
    return ['Polygon', 'MultiPolygon'];
  }

  return ['LineString', 'MultiLineString'];
}

function validateFeatureCollection(geoJson, source) {
  const expectedGeometryTypes = getExpectedGeometryTypes(source.featureAdapter);

  assert(geoJson && geoJson.type === 'FeatureCollection', 'Expected a GeoJSON FeatureCollection.');
  assert(Array.isArray(geoJson.features), 'Expected GeoJSON features to be an array.');
  assert(geoJson.features.length >= source.sync.minFeatureCount, 'Feature count is unexpectedly low.');

  let outOfBoundsCount = 0;

  for (const feature of geoJson.features) {
    assert(feature && feature.type === 'Feature', 'Each item must be a GeoJSON Feature.');
    assert(feature.geometry, 'Each feature must include geometry.');
    assert(expectedGeometryTypes.includes(feature.geometry.type), `Unexpected geometry type: ${feature.geometry.type}`);

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

async function syncDataset(source) {
  const datasetPageUrl = `https://data.gov.sg/datasets/${source.sync.datasetId}/view`;
  const downloadPollUrl = `https://api-open.data.gov.sg/v1/public/api/datasets/${source.sync.datasetId}/poll-download`;
  const pollResult = await fetchJson(downloadPollUrl);

  assert(pollResult.code === 0, pollResult.errMsg || 'Download poll failed.');
  assert(pollResult.data?.url, 'Download URL missing from poll response.');

  const geoJson = await fetchJson(pollResult.data.url);
  validateFeatureCollection(geoJson, source);

  const normalizedGeoJson = `${JSON.stringify(geoJson, null, 2)}\n`;
  const metadata = {
    datasetId: source.sync.datasetId,
    datasetPageUrl,
    datasetTitle: source.sync.datasetTitle,
    agency: source.sync.agency,
    syncedAt: new Date().toISOString(),
    featureCount: geoJson.features.length
  };
  const normalizedMetadata = `${JSON.stringify(metadata, null, 2)}\n`;

  const geoJsonChanged = await writeIfChanged(
    resolve(process.cwd(), source.asset.geoJson),
    normalizedGeoJson
  );
  const metadataChanged = await writeIfChanged(
    resolve(process.cwd(), source.asset.metadata),
    normalizedMetadata
  );

  return {
    datasetId: source.sync.datasetId,
    datasetTitle: source.sync.datasetTitle,
    featureCount: geoJson.features.length,
    geoJsonChanged,
    metadataChanged
  };
}

async function main() {
  const sources = await loadDataGovOverlaySourceConfigs();
  const results = [];

  for (const source of sources) {
    results.push(await syncDataset(source));
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
