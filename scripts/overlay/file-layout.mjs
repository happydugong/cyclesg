import { resolve } from 'node:path';

export function getOverlayDataDirectory(sourceId) {
  return resolve(process.cwd(), 'data', sourceId);
}

export function getOverlayRawDirectory(sourceId) {
  return resolve(getOverlayDataDirectory(sourceId), 'raw');
}

export function getOverlayConvertedDirectory(sourceId) {
  return resolve(getOverlayDataDirectory(sourceId), 'converted');
}

export function getOverlayMetadataDirectory(sourceId) {
  return resolve(getOverlayDataDirectory(sourceId), 'metadata');
}

export function getOverlayDataPaths(sourceId, rawExtension) {
  return {
    dataDirectory: getOverlayDataDirectory(sourceId),
    rawDirectory: getOverlayRawDirectory(sourceId),
    convertedDirectory: getOverlayConvertedDirectory(sourceId),
    metadataDirectory: getOverlayMetadataDirectory(sourceId),
    rawPath: resolve(getOverlayRawDirectory(sourceId), `source.${rawExtension}`),
    convertedGeoJsonPath: resolve(getOverlayConvertedDirectory(sourceId), 'overlay.geojson'),
    fetchMetadataPath: resolve(getOverlayMetadataDirectory(sourceId), 'fetch.json'),
    convertMetadataPath: resolve(getOverlayMetadataDirectory(sourceId), 'convert.json')
  };
}
