import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extname, resolve } from 'node:path';
import { loadMyMapsOverlaySourceConfigs } from './config.mjs';
import { fetchCuratedRoutesBufferFromUrl } from './my-maps-fetch.mjs';
import { stringifyJson, writeIfChanged } from './common.mjs';
import { getOverlayDataPaths } from './file-layout.mjs';

function detectRawExtension(buffer) {
  return buffer[0] === 0x50 && buffer[1] === 0x4b ? 'kmz' : 'kml';
}

export async function fetchMyMapsOverlays(fetchImpl = fetch) {
  const sources = await loadMyMapsOverlaySourceConfigs();
  const results = [];

  for (const source of sources) {
    const buffer = await fetchCuratedRoutesBufferFromUrl(source.sync.sourceUrl, fetchImpl);
    const rawExtension = detectRawExtension(buffer);
    const paths = getOverlayDataPaths(source.id, rawExtension);

    await mkdir(paths.rawDirectory, { recursive: true });
    await writeFile(paths.rawPath, buffer);

    const metadata = {
      sourceId: source.id,
      sourceKind: source.sourceKind,
      featureAdapter: source.featureAdapter,
      sourceUrl: source.sync.sourceUrl,
      fetchedAt: new Date().toISOString(),
      rawPath: resolve(process.cwd(), paths.rawPath).replace(`${process.cwd()}/`, '')
    };
    const fetchMetadataChanged = await writeIfChanged(paths.fetchMetadataPath, stringifyJson(metadata));

    results.push({
      sourceId: source.id,
      rawExtension,
      fetchMetadataChanged
    });
  }

  return results;
}

async function main() {
  console.log(JSON.stringify(await fetchMyMapsOverlays(), null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
