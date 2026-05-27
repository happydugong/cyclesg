import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { loadDataGovOverlaySourceConfigs } from './config.mjs';
import { assert, stringifyJson, writeIfChanged } from './common.mjs';
import { getOverlayDataPaths } from './file-layout.mjs';

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

export async function fetchDataGovOverlays() {
  const sources = await loadDataGovOverlaySourceConfigs();
  const results = [];

  for (const source of sources) {
    const paths = getOverlayDataPaths(source.id, 'geojson');
    const downloadPollUrl = `https://api-open.data.gov.sg/v1/public/api/datasets/${source.sync.datasetId}/poll-download`;
    const pollResult = await fetchJson(downloadPollUrl);

    assert(pollResult.code === 0, pollResult.errMsg || 'Download poll failed.');
    assert(pollResult.data?.url, 'Download URL missing from poll response.');

    const geoJson = await fetchJson(pollResult.data.url);
    await mkdir(paths.rawDirectory, { recursive: true });
    await writeFile(paths.rawPath, stringifyJson(geoJson), 'utf8');

    const metadata = {
      sourceId: source.id,
      sourceKind: source.sourceKind,
      featureAdapter: source.featureAdapter,
      datasetId: source.sync.datasetId,
      datasetTitle: source.sync.datasetTitle,
      agency: source.sync.agency,
      datasetPageUrl: `https://data.gov.sg/datasets/${source.sync.datasetId}/view`,
      downloadUrl: pollResult.data.url,
      fetchedAt: new Date().toISOString(),
      rawPath: resolve(process.cwd(), paths.rawPath).replace(`${process.cwd()}/`, '')
    };
    const fetchMetadataChanged = await writeIfChanged(paths.fetchMetadataPath, stringifyJson(metadata));

    results.push({
      sourceId: source.id,
      rawPath: paths.rawPath,
      featureCount: Array.isArray(geoJson?.features) ? geoJson.features.length : 0,
      fetchMetadataChanged
    });
  }

  return results;
}

async function main() {
  console.log(JSON.stringify(await fetchDataGovOverlays(), null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
