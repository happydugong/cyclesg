import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';

const domParser = new Window().DOMParser;

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

function sanitizeGpxXml(gpxText) {
  return gpxText
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, cdataText) => escapeXmlText(cdataText))
    .replace(/[\u{10000}-\u{10FFFF}]/gu, '');
}

function parseCoordinateAttributes(pointElement) {
  const longitude = Number(pointElement.getAttribute('lon'));
  const latitude = Number(pointElement.getAttribute('lat'));

  assert(
    Number.isFinite(longitude) && Number.isFinite(latitude),
    'Encountered malformed GPX coordinate attributes.'
  );

  return [longitude, latitude];
}

function validateCoordinates(coordinates, context) {
  assert(Array.isArray(coordinates) && coordinates.length > 0, `${context} must contain coordinates.`);

  for (const coordinate of coordinates) {
    assert(
      Array.isArray(coordinate) &&
        coordinate.length >= 2 &&
        Number.isFinite(coordinate[0]) &&
        Number.isFinite(coordinate[1]),
      `Encountered malformed coordinates in ${context}.`
    );
  }
}

function getBaseName(filePath) {
  return basename(filePath, extname(filePath));
}

function humanizeName(value) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildFeature({
  overlayId,
  overlayName,
  layerName,
  name,
  description,
  geometryKind,
  coordinates,
  featureIndex
}) {
  validateCoordinates(coordinates, `${geometryKind} feature`);

  return {
    type: 'Feature',
    properties: {
      featureId: `${overlayId}-${slugify(layerName ?? geometryKind)}-${slugify(name) || featureIndex}-${geometryKind}-${featureIndex}`,
      overlayId,
      overlayName,
      sourceType: 'gpx',
      name,
      description,
      layerName,
      geometryKind,
      styleUrl: null,
      styleId: null,
      iconHref: null,
      strokeColor: geometryKind === 'line' ? '#0F766E' : null,
      strokeWidth: geometryKind === 'line' ? 3 : null
    },
    geometry:
      geometryKind === 'point'
        ? {
            type: 'Point',
            coordinates: coordinates[0]
          }
        : {
            type: 'LineString',
            coordinates
          }
  };
}

function parseTrackFeatures(document, overlayId, overlayName, fallbackName, startIndex) {
  const trackElements = Array.from(document.querySelectorAll('trk'));
  const features = [];
  let featureIndex = startIndex;

  for (const [trackIndex, trackElement] of trackElements.entries()) {
    const trackName = getNodeText(trackElement, ':scope > name') ?? `${fallbackName} Track ${trackIndex + 1}`;
    const description = getNodeText(trackElement, ':scope > desc');
    const segmentElements = Array.from(trackElement.querySelectorAll(':scope > trkseg'));

    assert(segmentElements.length > 0, `Track "${trackName}" did not contain any segments.`);

    for (const [segmentIndex, segmentElement] of segmentElements.entries()) {
      const coordinates = Array.from(segmentElement.querySelectorAll(':scope > trkpt')).map(
        parseCoordinateAttributes
      );

      assert(coordinates.length >= 2, `Track segment "${trackName}" must contain at least two points.`);

      const segmentName =
        segmentElements.length > 1 ? `${trackName} Segment ${segmentIndex + 1}` : trackName;

      features.push(
        buildFeature({
          overlayId,
          overlayName,
          layerName: `${overlayName} Track`,
          name: segmentName,
          description,
          geometryKind: 'line',
          coordinates,
          featureIndex
        })
      );
      featureIndex += 1;
    }
  }

  return {
    features,
    nextFeatureIndex: featureIndex
  };
}

function parseRouteFeatures(document, overlayId, overlayName, fallbackName, startIndex) {
  const routeElements = Array.from(document.querySelectorAll('rte'));
  const features = [];
  let featureIndex = startIndex;

  for (const [routeIndex, routeElement] of routeElements.entries()) {
    const routeName = getNodeText(routeElement, ':scope > name') ?? `${fallbackName} Route ${routeIndex + 1}`;
    const description = getNodeText(routeElement, ':scope > desc');
    const coordinates = Array.from(routeElement.querySelectorAll(':scope > rtept')).map(
      parseCoordinateAttributes
    );

    assert(coordinates.length >= 2, `Route "${routeName}" must contain at least two points.`);

    features.push(
      buildFeature({
        overlayId,
        overlayName,
        layerName: `${overlayName} Track`,
        name: routeName,
        description,
        geometryKind: 'line',
        coordinates,
        featureIndex
      })
    );
    featureIndex += 1;
  }

  return {
    features,
    nextFeatureIndex: featureIndex
  };
}

function parseWaypointFeatures(document, overlayId, overlayName, startIndex) {
  const waypointElements = Array.from(document.querySelectorAll('wpt'));
  const features = [];
  let featureIndex = startIndex;

  for (const [waypointIndex, waypointElement] of waypointElements.entries()) {
    const name = getNodeText(waypointElement, ':scope > name') ?? `Waypoint ${waypointIndex + 1}`;
    const description = getNodeText(waypointElement, ':scope > desc');

    features.push(
      buildFeature({
        overlayId,
        overlayName,
        layerName: 'Waypoints',
        name,
        description,
        geometryKind: 'point',
        coordinates: [parseCoordinateAttributes(waypointElement)],
        featureIndex
      })
    );
    featureIndex += 1;
  }

  return {
    features,
    nextFeatureIndex: featureIndex
  };
}

export function parseGpx(gpxText, options = {}) {
  const parser = new domParser();
  const document = parser.parseFromString(sanitizeGpxXml(gpxText), 'application/xml');
  const parseError = document.querySelector('parsererror');
  assert(!parseError, `Failed to parse GPX: ${parseError?.textContent ?? 'Unknown parser error'}`);

  const metadataName = getNodeText(document, 'metadata > name');
  const fallbackName = humanizeName(options.fallbackName ?? metadataName ?? 'GPX Route');
  const fallbackOverlayId = slugify(fallbackName || 'gpx-route') || 'gpx-route';
  const overlayId = options.overlayId ?? fallbackOverlayId;
  const overlayName = humanizeName(options.overlayName ?? metadataName ?? fallbackName);

  let featureIndex = 1;
  const features = [];

  const trackResult = parseTrackFeatures(document, overlayId, overlayName, fallbackName, featureIndex);
  features.push(...trackResult.features);
  featureIndex = trackResult.nextFeatureIndex;

  const routeResult = parseRouteFeatures(document, overlayId, overlayName, fallbackName, featureIndex);
  features.push(...routeResult.features);
  featureIndex = routeResult.nextFeatureIndex;

  const waypointResult = parseWaypointFeatures(document, overlayId, overlayName, featureIndex);
  features.push(...waypointResult.features);
  featureIndex = waypointResult.nextFeatureIndex;

  assert(features.length > 0, `No GPX features were extracted for ${overlayName}.`);

  return {
    type: 'FeatureCollection',
    features
  };
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

function parseCliArgs(argv) {
  const filePaths = [];
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === '--output') {
      options.outputPath = argv[index + 1];
      index += 1;
      continue;
    }

    if (value === '--metadata') {
      options.metadataPath = argv[index + 1];
      index += 1;
      continue;
    }

    if (value === '--overlay-id') {
      options.overlayId = argv[index + 1];
      index += 1;
      continue;
    }

    if (value === '--overlay-name') {
      options.overlayName = argv[index + 1];
      index += 1;
      continue;
    }

    filePaths.push(value);
  }

  return { filePaths, options };
}

function getDefaultOutputPaths(filePaths, options) {
  if (options.outputPath && options.metadataPath) {
    return {
      outputPath: resolve(process.cwd(), options.outputPath),
      metadataPath: resolve(process.cwd(), options.metadataPath)
    };
  }

  if (filePaths.length === 1) {
    const basePath = resolve(process.cwd(), filePaths[0]);
    const outputBaseName = getBaseName(filePaths[0]);

    return {
      outputPath: options.outputPath
        ? resolve(process.cwd(), options.outputPath)
        : resolve(process.cwd(), 'src/assets', `${outputBaseName}.geojson`),
      metadataPath: options.metadataPath
        ? resolve(process.cwd(), options.metadataPath)
        : resolve(process.cwd(), 'src/assets', `${outputBaseName}-metadata.json`)
    };
  }

  return {
    outputPath: resolve(process.cwd(), options.outputPath ?? 'src/assets/gpx-routes.geojson'),
    metadataPath: resolve(process.cwd(), options.metadataPath ?? 'src/assets/gpx-routes-metadata.json')
  };
}

export async function convertGpxFiles(filePaths, options = {}) {
  assert(filePaths.length > 0, 'Provide at least one GPX file path.');

  const combinedFeatures = [];
  const overlays = [];

  for (const filePath of filePaths) {
    const absolutePath = resolve(process.cwd(), filePath);
    const fileContents = await readFile(absolutePath, 'utf8');
    const fallbackName = getBaseName(filePath);
    const perFileOptions =
      filePaths.length === 1
        ? {
            fallbackName,
            overlayId: options.overlayId,
            overlayName: options.overlayName
          }
        : {
            fallbackName
          };
    const geoJson = parseGpx(fileContents, perFileOptions);
    const counts = countFeatureTypes(geoJson.features);
    const overlayInfo = geoJson.features[0]?.properties;

    combinedFeatures.push(...geoJson.features);
    overlays.push({
      id: overlayInfo.overlayId,
      name: overlayInfo.overlayName,
      sourcePath: filePath,
      featureCount: geoJson.features.length,
      ...counts
    });
  }

  const counts = countFeatureTypes(combinedFeatures);
  const { outputPath, metadataPath } = getDefaultOutputPaths(filePaths, options);
  const geoJson = {
    type: 'FeatureCollection',
    features: combinedFeatures
  };
  const metadata = {
    sourceLabel: 'gpx',
    syncedAt: new Date().toISOString(),
    featureCount: geoJson.features.length,
    ...counts,
    overlays
  };

  const geoJsonChanged = await writeIfChanged(outputPath, `${JSON.stringify(geoJson, null, 2)}\n`);
  const metadataChanged = await writeIfChanged(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);

  return {
    outputPath,
    metadataPath,
    featureCount: geoJson.features.length,
    ...counts,
    overlays,
    geoJsonChanged,
    metadataChanged
  };
}

async function main() {
  const { filePaths, options } = parseCliArgs(process.argv.slice(2));
  const result = await convertGpxFiles(filePaths, options);
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
