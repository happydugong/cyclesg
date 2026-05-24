import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const OVERLAY_SOURCE_DIRECTORY = resolve(process.cwd(), 'src/config/overlay-sources');

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

function parseIssueFormBody(body) {
  const sections = new Map();
  const normalizedBody = body.replace(/\r\n/g, '\n');
  const matches = normalizedBody.matchAll(/^###\s+(.+)\n([\s\S]*?)(?=^###\s+|$)/gm);

  for (const match of matches) {
    const label = match[1]?.trim();
    const value = match[2]?.trim() ?? '';

    if (label) {
      sections.set(label, value);
    }
  }

  return sections;
}

function getRequiredSection(sections, label) {
  const value = sections.get(label)?.trim();
  assert(value, `Missing issue field: ${label}`);
  return value;
}

function getOptionalSection(sections, label) {
  return sections.get(label)?.trim() || '';
}

export function extractMidFromUrl(rawUrl) {
  const url = new URL(rawUrl);
  const directMid = url.searchParams.get('mid');

  if (directMid) {
    return directMid;
  }

  const embeddedMid = url.pathname.match(/\/d\/(?:viewer|edit|u\/\d+\/viewer)\/([^/]+)/)?.[1];
  if (embeddedMid) {
    return embeddedMid;
  }

  throw new Error('Could not extract the Google My Maps `mid` parameter from the page URL.');
}

export function buildKmlExportUrl(pageUrl) {
  const mid = extractMidFromUrl(pageUrl);
  return `https://www.google.com/maps/d/kml?mid=${encodeURIComponent(mid)}&forcekml=1`;
}

export function buildOverlayRecord({
  title,
  myMapsPageUrl,
  description,
  attributionName,
  attributionUrl
}) {
  const id = slugify(title);
  assert(id, 'Could not derive a valid overlay id from the map title.');

  return {
    id,
    label: title,
    sourceKind: 'google-my-maps',
    featureAdapter: 'my-maps',
    defaultVisible: false,
    description,
    asset: {
      geoJson: 'src/assets/curated-routes.geojson',
      metadata: 'src/assets/curated-routes-metadata.json'
    },
    sync: {
      sourceUrl: buildKmlExportUrl(myMapsPageUrl)
    },
    presentation: {
      routeColor: '#F97316',
      selectedColor: '#7C2D12',
      activeBackgroundColor: '#FFF7ED',
      activeTextColor: '#7C2D12'
    },
    attribution: {
      message: 'Map by',
      sourceLabel: attributionName,
      sourceUrl: attributionUrl
    }
  };
}

async function writeOverlaySourceRecord(record) {
  const outputPath = resolve(OVERLAY_SOURCE_DIRECTORY, `${record.id}.json`);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');

  return outputPath;
}

export function parseMapSuggestionIssueBody(issueBody) {
  const sections = parseIssueFormBody(issueBody);
  const title = getRequiredSection(sections, 'Map title');
  const myMapsPageUrl = getRequiredSection(sections, 'Google My Maps page URL');
  const description = getRequiredSection(sections, 'What is in this map?');
  const attributionName = getRequiredSection(sections, 'Attribution name');
  const attributionUrl = getRequiredSection(sections, 'Attribution URL');
  const layerNotes = getOptionalSection(sections, 'Layer notes');
  const additionalContext = getOptionalSection(sections, 'Additional context');

  return {
    title,
    myMapsPageUrl,
    description,
    attributionName,
    attributionUrl,
    layerNotes,
    additionalContext
  };
}

async function main() {
  const issueBody = process.env.ISSUE_BODY ?? '';
  assert(issueBody, 'ISSUE_BODY is required.');

  const {
    title,
    myMapsPageUrl,
    description,
    attributionName,
    attributionUrl,
    layerNotes,
    additionalContext
  } = parseMapSuggestionIssueBody(issueBody);

  const record = buildOverlayRecord({
    title,
    myMapsPageUrl,
    description,
    attributionName,
    attributionUrl
  });
  const outputPath = await writeOverlaySourceRecord(record);

  const output = {
    id: record.id,
    filePath: outputPath,
    sourceUrl: record.sync.sourceUrl,
    layerNotes,
    additionalContext
  };

  console.log(JSON.stringify(output, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
