import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const CONFIG_PATH = resolve(process.cwd(), 'src/config/overlay-sources.json');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateCommonConfig(source) {
  assert(typeof source.id === 'string' && source.id.length > 0, 'Each overlay source must have an id.');
  assert(typeof source.label === 'string' && source.label.length > 0, `Overlay source ${source.id} must have a label.`);
  assert(
    source.sourceKind === 'data-gov-sg' || source.sourceKind === 'google-my-maps' || source.sourceKind === 'local-file',
    `Overlay source ${source.id} has an unsupported sourceKind.`
  );
  assert(
    source.featureAdapter === 'pcn' ||
      source.featureAdapter === 'cycling-path' ||
      source.featureAdapter === 'my-maps' ||
      source.featureAdapter === 'strava-gpx',
    `Overlay source ${source.id} has an unsupported featureAdapter.`
  );
  assert(typeof source.defaultVisible === 'boolean', `Overlay source ${source.id} must define defaultVisible.`);
  assert(typeof source.description === 'string', `Overlay source ${source.id} must define description.`);
  assert(
    typeof source.asset?.geoJson === 'string' && source.asset.geoJson.length > 0,
    `Overlay source ${source.id} must define asset.geoJson.`
  );
  assert(
    typeof source.asset?.metadata === 'string' && source.asset.metadata.length > 0,
    `Overlay source ${source.id} must define asset.metadata.`
  );
}

function validateDataGovConfig(source) {
  assert(source.sourceKind === 'data-gov-sg', `Overlay source ${source.id} must be data.gov.sg.`);
  assert(
    source.featureAdapter === 'pcn' || source.featureAdapter === 'cycling-path',
    `Overlay source ${source.id} has an invalid adapter for data.gov.sg.`
  );
  assert(
    typeof source.sync?.datasetId === 'string' && source.sync.datasetId.length > 0,
    `Overlay source ${source.id} must define sync.datasetId.`
  );
  assert(
    typeof source.sync?.datasetTitle === 'string' && source.sync.datasetTitle.length > 0,
    `Overlay source ${source.id} must define sync.datasetTitle.`
  );
  assert(
    typeof source.sync?.agency === 'string' && source.sync.agency.length > 0,
    `Overlay source ${source.id} must define sync.agency.`
  );
  assert(
    Number.isInteger(source.sync?.minFeatureCount) && source.sync.minFeatureCount > 0,
    `Overlay source ${source.id} must define a positive sync.minFeatureCount.`
  );
}

function validateMyMapsConfig(source) {
  assert(source.sourceKind === 'google-my-maps', `Overlay source ${source.id} must be Google My Maps.`);
  assert(source.featureAdapter === 'my-maps', `Overlay source ${source.id} must use the my-maps adapter.`);
  assert(
    typeof source.sync?.sourceUrl === 'string' && source.sync.sourceUrl.length > 0,
    `Overlay source ${source.id} must define sync.sourceUrl.`
  );
}

function validateLocalFileConfig(source) {
  assert(source.sourceKind === 'local-file', `Overlay source ${source.id} must be a local file source.`);
  assert(
    source.featureAdapter === 'strava-gpx',
    `Overlay source ${source.id} must use the strava-gpx adapter.`
  );
}

export async function loadOverlaySourceConfigs(configPath = CONFIG_PATH) {
  const configText = await readFile(configPath, 'utf8');
  const sources = JSON.parse(configText);

  assert(Array.isArray(sources) && sources.length > 0, 'Overlay source config must contain at least one source.');

  for (const source of sources) {
    validateCommonConfig(source);
  }

  return sources;
}

export async function loadDataGovOverlaySourceConfigs(configPath = CONFIG_PATH) {
  const sources = await loadOverlaySourceConfigs(configPath);
  const filteredSources = sources.filter((source) => source.sourceKind === 'data-gov-sg');

  for (const source of filteredSources) {
    validateDataGovConfig(source);
  }

  return filteredSources;
}

export async function loadMyMapsOverlaySourceConfigs(configPath = CONFIG_PATH) {
  const sources = await loadOverlaySourceConfigs(configPath);
  const filteredSources = sources.filter((source) => source.sourceKind === 'google-my-maps');

  for (const source of filteredSources) {
    validateMyMapsConfig(source);
  }

  return filteredSources;
}

export async function loadLocalFileOverlaySourceConfigs(configPath = CONFIG_PATH) {
  const sources = await loadOverlaySourceConfigs(configPath);
  const filteredSources = sources.filter((source) => source.sourceKind === 'local-file');

  for (const source of filteredSources) {
    validateLocalFileConfig(source);
  }

  return filteredSources;
}
