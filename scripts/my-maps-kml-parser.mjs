import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { Window } from 'happy-dom';

/*
This module owns only the KML/KMZ-to-GeoJSON conversion path.

The logic is intentionally isolated from config loading, HTTP fetching, and
file writing so the parser can be reasoned about as a pure transformation step:

1. normalize the raw KML text so DOM parsing is predictable
2. extract styles, folders, placemarks, and geometries
3. convert them into the app's feature shape
4. validate the resulting features stay within Singapore bounds

Everything here should answer one question only:
"Given a KML or KMZ payload, what GeoJSON features does it contain?"
*/

const execFileAsync = promisify(execFile);
const domParser = new Window().DOMParser;

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

function sanitizeKmlXml(kmlText) {
  return kmlText.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, cdataText) => {
    return cdataText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
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

export function validateFeatures(features, overlayName = 'curated route') {
  assert(Array.isArray(features) && features.length > 0, `No features were extracted for ${overlayName}.`);

  for (const feature of features) {
    const coordinates =
      feature.geometry.type === 'Point'
        ? [feature.geometry.coordinates]
        : feature.geometry.coordinates;

    assert(coordinates.length > 0, 'Feature geometry must contain coordinates.');

    for (const coordinate of coordinates) {
      const inSingaporeBounds =
        Array.isArray(coordinate) &&
        coordinate.length >= 2 &&
        typeof coordinate[0] === 'number' &&
        typeof coordinate[1] === 'number' &&
        coordinate[0] >= SINGAPORE_BOUNDS.minLng &&
        coordinate[0] <= SINGAPORE_BOUNDS.maxLng &&
        coordinate[1] >= SINGAPORE_BOUNDS.minLat &&
        coordinate[1] <= SINGAPORE_BOUNDS.maxLat;

      assert(
        inSingaporeBounds,
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
  const tempDirectory = await mkdtemp(resolve(tmpdir(), 'my-maps-routes-'));
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
