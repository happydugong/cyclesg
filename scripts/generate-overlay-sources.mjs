import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  GENERATED_CONFIG_PATH,
  loadOverlaySourceConfigs
} from './overlay-source-config.mjs';

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

async function main() {
  const sources = await loadOverlaySourceConfigs();
  const changed = await writeIfChanged(
    GENERATED_CONFIG_PATH,
    `${JSON.stringify(sources, null, 2)}\n`
  );

  console.log(
    JSON.stringify(
      {
        sourceCount: sources.length,
        outputPath: GENERATED_CONFIG_PATH,
        changed
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
