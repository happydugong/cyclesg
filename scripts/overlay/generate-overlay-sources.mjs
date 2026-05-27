import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import {
  GENERATED_CONFIG_PATH,
  loadOverlaySourceConfigs
} from './config.mjs';

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

export async function generateOverlaySources() {
  const sources = await loadOverlaySourceConfigs();
  const changed = await writeIfChanged(
    GENERATED_CONFIG_PATH,
    `${JSON.stringify(sources, null, 2)}\n`
  );

  return {
    sourceCount: sources.length,
    outputPath: GENERATED_CONFIG_PATH,
    changed
  };
}

async function main() {
  console.log(JSON.stringify(await generateOverlaySources(), null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
