import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { Window } from 'happy-dom';
import { loadMyMapsOverlaySourceConfigs } from './overlay-source-config.mjs';

const execFileAsync = promisify(execFile);
const domParser = new Window().DOMParser;

const SINGAPORE_BOUNDS = {
  minLng: 103.58,
  maxLng: 104.1,
  minLat: 1.19,
  maxLat: 1.48
};

export const CURATED_ROUTES_SOURCE_URL =
  'https://www.google.com/maps/d/kml?mid=1d-f3wTmqM3jmT7C1LtTzorsRbGw&forcekml=1';

const OUTPUT_PATH = resolve(process.cwd(), 'src/assets/curated-routes.geojson');
const METADATA_PATH = resolve(process.cwd(), 'src/assets/curated-routes-metadata.json');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function getNodeText(element, selector) {
  const match = element.querySelector(selector);
  return match?.textContent?.trim() ?? null;
}

function escapeXmlText(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sanitizeKmlXml(kmlText) {
  return kmlText.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, cdataText) => {
    return escapeXmlText(cdataText);
  });
}

function parseKmlCoordinates(rawCoordinates) {
  const coordinateSets = rawCoordinates
    .trim()
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [longitudeText, latitudeText] = entry.split(',');
      const longitude = Number(longitudeText);
      const latitude = Number(latitudeText);

      assert(Number.isFinite(longitude) && Number.isFinite(latitude), 'Encountered malformed KML coordinates.');

      return [longitude, latitude];
    });

  assert(coordinateSets.length > 0, 'Encountered an empty KML geometry.');

  return coordinateSets;
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

function validateFeatures(features, overlayName = 'curated route') {
  assert(Array.isArray(features) && features.length > 0, `No features were extracted for ${overlayName}.`);

  for (const feature of features) {
    const coordinates =
      feature.geometry.type === 'Point'
        ? [feature.geometry.coordinates]
        : feature.geometry.coordinates;

    assert(coordinates.length > 0, 'Feature geometry must contain coordinates.');

    for (const coordinate of coordinates) {
      assert(
        isCoordinateInSingaporeBounds(coordinate),
        `Found curated route coordinate outside Singapore bounds: ${coordinate.join(',')}`
      );
    }
  }
}

function normalizeColor(kmlColor) {
  if (!kmlColor || kmlColor.length !== 8) {
    return null;
  }

  const [, , blue, green, red] = kmlColor.match(/^([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/) ?? [];

  if (!blue || !green || !red) {
    return null;
  }

  return `#${red}${green}${blue}`.toUpperCase();
}

function resolveStyleUrl(styleUrl, styleMaps) {
  if (!styleUrl) {
    return null;
  }

  if (!styleUrl.startsWith('#')) {
    return styleUrl;
  }

  return styleMaps.get(styleUrl.slice(1)) ?? styleUrl;
}

function collectStyles(document) {
  const styles = new Map();
  const styleMaps = new Map();

  for (const styleElement of document.querySelectorAll('Style[id]')) {
    const styleId = styleElement.getAttribute('id');

    if (!styleId) {
      continue;
    }

    styles.set(styleId, {
      iconHref: getNodeText(styleElement, 'IconStyle > Icon > href'),
      strokeColor: normalizeColor(getNodeText(styleElement, 'LineStyle > color')),
      strokeWidth: (() => {
        const widthText = getNodeText(styleElement, 'LineStyle > width');
        const width = widthText ? Number(widthText) : null;
        return Number.isFinite(width) ? width : null;
      })()
    });
  }

  for (const styleMapElement of document.querySelectorAll('StyleMap[id]')) {
    const styleMapId = styleMapElement.getAttribute('id');

    if (!styleMapId) {
      continue;
    }

    const normalPair = Array.from(styleMapElement.querySelectorAll('Pair')).find(
      (pair) => getNodeText(pair, 'key') === 'normal'
    );
    const mappedStyleUrl = getNodeText(normalPair ?? styleMapElement, 'styleUrl');

    if (mappedStyleUrl) {
      styleMaps.set(styleMapId, mappedStyleUrl);
    }
  }

  return { styles, styleMaps };
}

function buildFeature({ geometry, layerName, placemark, styles, styleMaps, featureIndex }) {
  const name = getNodeText(placemark, 'name') ?? `${geometry.type} ${featureIndex}`;
  const description = getNodeText(placemark, 'description');
  const originalStyleUrl = getNodeText(placemark, 'styleUrl');
  const resolvedStyleUrl = resolveStyleUrl(originalStyleUrl, styleMaps);
  const styleId = resolvedStyleUrl?.startsWith('#') ? resolvedStyleUrl.slice(1) : null;
  const style = styleId ? styles.get(styleId) : null;
  const featureIdBase = `${slugify(layerName ?? 'curated')}-${slugify(name) || featureIndex}`;

  if (geometry.type === 'Point') {
    return {
      type: 'Feature',
      properties: {
        featureId: `${featureIdBase}-point-${featureIndex}`,
        sourceType: 'google-my-maps',
        name,
        description,
        layerName,
        geometryKind: 'point',
        styleUrl: originalStyleUrl,
        styleId,
        iconHref: style?.iconHref ?? null,
        strokeColor: style?.strokeColor ?? null,
        strokeWidth: style?.strokeWidth ?? null
      },
      geometry
    };
  }

  return {
    type: 'Feature',
    properties: {
      featureId: `${featureIdBase}-line-${featureIndex}`,
      sourceType: 'google-my-maps',
      name,
      description,
      layerName,
      geometryKind: 'line',
      styleUrl: originalStyleUrl,
      styleId,
      iconHref: style?.iconHref ?? null,
      strokeColor: style?.strokeColor ?? null,
      strokeWidth: style?.strokeWidth ?? null
    },
    geometry
  };
}

function extractGeometries(placemark) {
  const geometries = [];

  for (const pointElement of placemark.querySelectorAll(':scope > Point, :scope > MultiGeometry > Point')) {
    const coordinatesText = getNodeText(pointElement, 'coordinates');

    assert(coordinatesText, 'Encountered an empty KML geometry.');

    const coordinates = parseKmlCoordinates(coordinatesText);
    assert(coordinates.length === 1, 'Point geometry must contain exactly one coordinate pair.');

    geometries.push({
      type: 'Point',
      coordinates: coordinates[0]
    });
  }

  for (const lineElement of placemark.querySelectorAll(':scope > LineString, :scope > MultiGeometry > LineString')) {
    const coordinatesText = getNodeText(lineElement, 'coordinates');

    assert(coordinatesText, 'Encountered an empty KML geometry.');

    geometries.push({
      type: 'LineString',
      coordinates: parseKmlCoordinates(coordinatesText)
    });
  }

  return geometries;
}

function collectPlacemarks(parentElement, inheritedLayerName = null, placemarks = []) {
  for (const child of Array.from(parentElement.children)) {
    if (child.tagName === 'Folder' || child.tagName === 'Document') {
      const childLayerName =
        child.tagName === 'Folder' ? getNodeText(child, ':scope > name') ?? inheritedLayerName : inheritedLayerName;
      collectPlacemarks(child, childLayerName, placemarks);
      continue;
    }

    if (child.tagName === 'Placemark') {
      placemarks.push({
        layerName: inheritedLayerName,
        placemark: child
      });
    }
  }

  return placemarks;
}

export function parseCuratedRoutesKml(kmlText) {
  const parser = new domParser();
  const document = parser.parseFromString(sanitizeKmlXml(kmlText), 'application/xml');
  const parseError = document.querySelector('parsererror');
  assert(!parseError, `Failed to parse KML: ${parseError?.textContent ?? 'Unknown parser error'}`);

  const { styles, styleMaps } = collectStyles(document);
  const placemarks = collectPlacemarks(document.documentElement);
  const features = [];

  placemarks.forEach(({ placemark, layerName }, placemarkIndex) => {
    const geometries = extractGeometries(placemark);

    geometries.forEach((geometry, geometryIndex) => {
      features.push(
        buildFeature({
          geometry,
          layerName,
          placemark,
          styles,
          styleMaps,
          featureIndex: placemarkIndex + geometryIndex + 1
        })
      );
    });
  });

  validateFeatures(features);

  return {
    type: 'FeatureCollection',
    features
  };
}

async function extractKmlFromKmzBuffer(buffer) {
  const tempDirectory = await mkdtemp(resolve(tmpdir(), 'curated-routes-'));
  const archivePath = resolve(tempDirectory, 'map.kmz');

  try {
    await writeFile(archivePath, buffer);
    const { stdout } = await execFileAsync('unzip', ['-p', archivePath], {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024
    });

    assert(stdout.includes('<kml'), 'KMZ archive did not contain a readable KML payload.');

    return stdout;
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

export async function parseCuratedRoutesBuffer(buffer) {
  const isKmz = buffer[0] === 0x50 && buffer[1] === 0x4b;
  const kmlText = isKmz ? await extractKmlFromKmzBuffer(buffer) : buffer.toString('utf8');

  return parseCuratedRoutesKml(kmlText);
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

export async function fetchCuratedRoutesBuffer(fetchImpl = fetch) {
  return fetchCuratedRoutesBufferFromUrl(CURATED_ROUTES_SOURCE_URL, fetchImpl);
}

export async function fetchCuratedRoutesBufferFromUrl(sourceUrl, fetchImpl = fetch) {
  const response = await fetchImpl(sourceUrl, {
    headers: {
      Accept: 'application/vnd.google-earth.kmz,application/vnd.google-earth.kml+xml,application/xml,text/xml,text/plain;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
    },
    redirect: 'follow'
  });

  if (!response.ok) {
    throw new Error(
      `Request failed for curated Google My Maps dataset: ${response.status} ${response.statusText}`
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') ?? '';
  const contentDisposition = response.headers.get('content-disposition') ?? '';
  const prefix = buffer.subarray(0, 256).toString('utf8').trimStart().toLowerCase();
  const isKmz = buffer[0] === 0x50 && buffer[1] === 0x4b;
  const looksLikeKml = prefix.startsWith('<?xml') || prefix.startsWith('<kml');
  const isDeclaredKml =
    contentType.includes('xml') ||
    contentType.includes('kml') ||
    contentDisposition.toLowerCase().includes('.kml') ||
    contentDisposition.toLowerCase().includes('.kmz');

  if (!isKmz && !(looksLikeKml && isDeclaredKml)) {
    throw new Error(
      `Expected KML/KMZ from Google My Maps export but received ${contentType || 'an unknown content type'}.`
    );
  }

  if (prefix.startsWith('<!doctype html') || prefix.startsWith('<html')) {
    throw new Error('Google My Maps export returned HTML instead of KML/KMZ.');
  }

  return buffer;
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

export async function syncCuratedRoutes(fetchImpl = fetch, options = {}) {
  const overlays = (
    options.overlays ?? await loadMyMapsOverlaySourceConfigs(options.configPath)
  ).map(normalizeMyMapsOverlayConfig);
  const overlayResults = [];
  const combinedFeatures = [];

  for (const overlay of overlays) {
    const buffer = await fetchCuratedRoutesBufferFromUrl(overlay.sourceUrl, fetchImpl);
    const geoJson = await parseCuratedRoutesBuffer(buffer);
    const annotatedFeatures = annotateOverlayFeatures(geoJson, overlay);

    validateFeatures(annotatedFeatures, overlay.name);
    combinedFeatures.push(...annotatedFeatures);

    overlayResults.push({
      id: overlay.id,
      name: overlay.name,
      sourceUrl: overlay.sourceUrl,
      featureCount: annotatedFeatures.length,
      ...countFeatureTypes(annotatedFeatures)
    });
  }

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
    overlays: overlayResults
  };

  const geoJsonChanged = await writeIfChanged(
    options.outputPath ?? OUTPUT_PATH,
    `${JSON.stringify(geoJson, null, 2)}\n`
  );
  const metadataChanged = await writeIfChanged(
    options.metadataPath ?? METADATA_PATH,
    `${JSON.stringify(metadata, null, 2)}\n`
  );

  return {
    featureCount: geoJson.features.length,
    ...counts,
    overlays: overlayResults,
    geoJsonChanged,
    metadataChanged
  };
}

async function main() {
  const result = await syncCuratedRoutes();
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
