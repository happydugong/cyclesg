import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLocalFileOverlaySourceConfigs } from './config.mjs';
import { convertGpxFiles } from './gpx-parser.mjs';
import { readJsonIfExists, stringifyJson, writeIfChanged } from './common.mjs';
import { getOverlayDataPaths } from './file-layout.mjs';

export async function convertGpxOverlays() {
  const sources = await loadLocalFileOverlaySourceConfigs();
  const results = [];

  for (const source of sources) {
    const paths = getOverlayDataPaths(source.id, 'gpx');
    const legacyMetadata = await readJsonIfExists(source.asset.metadata);
    const overlayMetadata = Array.isArray(legacyMetadata?.overlays) ? legacyMetadata.overlays[0] : null;
    const routeLengthByPath = overlayMetadata
      ? {
          [paths.rawPath]: overlayMetadata.routeLength ?? null
        }
      : undefined;
    const result = await convertGpxFiles([paths.rawPath], {
      outputPath: paths.convertedGeoJsonPath,
      metadataPath: paths.convertMetadataPath,
      overlayId: source.id,
      overlayName: source.label,
      routeLengthByPath
    });

    const fetchMetadata = {
      sourceId: source.id,
      sourceKind: source.sourceKind,
      featureAdapter: source.featureAdapter,
      sourcePath: resolve(process.cwd(), paths.rawPath).replace(`${process.cwd()}/`, ''),
      importedAt: legacyMetadata?.syncedAt ?? null
    };
    await writeIfChanged(paths.fetchMetadataPath, stringifyJson(fetchMetadata));

    results.push({
      sourceId: source.id,
      featureCount: result.featureCount,
      geoJsonChanged: result.geoJsonChanged,
      convertMetadataChanged: result.metadataChanged
    });
  }

  return results;
}

async function main() {
  console.log(JSON.stringify(await convertGpxOverlays(), null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
