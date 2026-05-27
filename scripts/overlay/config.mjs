import { readdir, readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

export const CONFIG_DIRECTORY_PATH = resolve(process.cwd(), 'src/config/overlay-sources');
export const GENERATED_CONFIG_PATH = resolve(
  process.cwd(),
  'src/config/overlay-sources.generated.json'
);

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
      source.featureAdapter === 'rail-station' ||
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
  assert(
    source.asset.geoJson === `data/${source.id}/converted/overlay.geojson`,
    `Overlay source ${source.id} must write converted GeoJSON to data/${source.id}/converted/overlay.geojson.`
  );
  assert(
    source.asset.metadata === `data/${source.id}/metadata/convert.json`,
    `Overlay source ${source.id} must write converted metadata to data/${source.id}/metadata/convert.json.`
  );
}

function validateDataGovConfig(source) {
  assert(source.sourceKind === 'data-gov-sg', `Overlay source ${source.id} must be data.gov.sg.`);
  assert(
    source.featureAdapter === 'pcn' ||
      source.featureAdapter === 'cycling-path' ||
      source.featureAdapter === 'rail-station',
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

async function loadOverlaySourceConfigDirectory(configDirectoryPath) {
  const entries = await readdir(configDirectoryPath, { withFileTypes: true });
  const jsonFiles = entries
    .filter((entry) => entry.isFile() && extname(entry.name) === '.json')
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  assert(jsonFiles.length > 0, 'Overlay source config directory must contain at least one JSON file.');

  const sources = [];

  for (const fileName of jsonFiles) {
    const configPath = resolve(configDirectoryPath, fileName);
    const configText = await readFile(configPath, 'utf8');
    const source = JSON.parse(configText);

    assert(source && !Array.isArray(source), `Overlay source file ${fileName} must contain a single source object.`);
    sources.push(source);
  }

  return sources;
}

export async function loadOverlaySourceConfigs(configDirectoryPath = CONFIG_DIRECTORY_PATH) {
  const sources = await loadOverlaySourceConfigDirectory(configDirectoryPath);

  assert(Array.isArray(sources) && sources.length > 0, 'Overlay source config must contain at least one source.');

  const sourceIds = new Set();

  for (const source of sources) {
    validateCommonConfig(source);
    assert(!sourceIds.has(source.id), `Overlay source ${source.id} is duplicated.`);
    sourceIds.add(source.id);
  }

  return sources;
}

export async function loadDataGovOverlaySourceConfigs(configDirectoryPath = CONFIG_DIRECTORY_PATH) {
  const sources = await loadOverlaySourceConfigs(configDirectoryPath);
  const filteredSources = sources.filter((source) => source.sourceKind === 'data-gov-sg');

  for (const source of filteredSources) {
    validateDataGovConfig(source);
  }

  return filteredSources;
}

export async function loadMyMapsOverlaySourceConfigs(configDirectoryPath = CONFIG_DIRECTORY_PATH) {
  const sources = await loadOverlaySourceConfigs(configDirectoryPath);
  const filteredSources = sources.filter((source) => source.sourceKind === 'google-my-maps');

  for (const source of filteredSources) {
    validateMyMapsConfig(source);
  }

  return filteredSources;
}

export async function loadLocalFileOverlaySourceConfigs(configDirectoryPath = CONFIG_DIRECTORY_PATH) {
  const sources = await loadOverlaySourceConfigs(configDirectoryPath);
  const filteredSources = sources.filter((source) => source.sourceKind === 'local-file');

  for (const source of filteredSources) {
    validateLocalFileConfig(source);
  }

  return filteredSources;
}
