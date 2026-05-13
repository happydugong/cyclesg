import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  loadDataGovOverlaySourceConfigs,
  loadMyMapsOverlaySourceConfigs,
  loadOverlaySourceConfigs
} from './overlay-source-config.mjs';

function writeConfigFile(config: unknown) {
  const tempDirectory = mkdtempSync(join(tmpdir(), 'overlay-source-config-'));
  const configPath = join(tempDirectory, 'overlay-sources.json');
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  return {
    configPath,
    cleanup() {
      rmSync(tempDirectory, { recursive: true, force: true });
    }
  };
}

describe('overlay-source-config', () => {
  it('loads mixed overlay sources and filters them by source kind', async () => {
    const { configPath, cleanup } = writeConfigFile([
      {
        id: 'official-pcn',
        label: 'PCN',
        sourceKind: 'data-gov-sg',
        featureAdapter: 'pcn',
        defaultVisible: true,
        description: 'Official NParks park connector routes.',
        asset: {
          geoJson: 'src/assets/pcn.geojson',
          metadata: 'src/assets/pcn-metadata.json'
        },
        sync: {
          datasetId: 'pcn-dataset',
          datasetTitle: 'Park Connector Loop',
          agency: 'NParks',
          minFeatureCount: 100
        }
      },
      {
        id: 'jonathan-route',
        label: 'Jonathan Route',
        sourceKind: 'google-my-maps',
        featureAdapter: 'my-maps',
        defaultVisible: false,
        description: 'Curated Google My Maps overlay.',
        asset: {
          geoJson: 'src/assets/curated-routes.geojson',
          metadata: 'src/assets/curated-routes-metadata.json'
        },
        sync: {
          sourceUrl: 'https://example.com/cycling.kml'
        }
      }
    ]);

    try {
      const sources = await loadOverlaySourceConfigs(configPath);
      const dataGovSources = await loadDataGovOverlaySourceConfigs(configPath);
      const myMapsSources = await loadMyMapsOverlaySourceConfigs(configPath);

      expect(sources).toHaveLength(2);
      expect(dataGovSources).toEqual([
        expect.objectContaining({
          id: 'official-pcn',
          sourceKind: 'data-gov-sg',
          featureAdapter: 'pcn'
        })
      ]);
      expect(myMapsSources).toEqual([
        expect.objectContaining({
          id: 'jonathan-route',
          sourceKind: 'google-my-maps',
          featureAdapter: 'my-maps'
        })
      ]);
    } finally {
      cleanup();
    }
  });

  it('fails fast for invalid shared config entries', async () => {
    const { configPath, cleanup } = writeConfigFile([
      {
        id: 'broken-source',
        label: 'Broken',
        sourceKind: 'google-my-maps',
        featureAdapter: 'my-maps',
        defaultVisible: false,
        description: 'Invalid overlay.',
        asset: {
          geoJson: 'src/assets/curated-routes.geojson',
          metadata: 'src/assets/curated-routes-metadata.json'
        },
        sync: {}
      }
    ]);

    try {
      await expect(loadMyMapsOverlaySourceConfigs(configPath)).rejects.toThrow(
        'Overlay source broken-source must define sync.sourceUrl.'
      );
    } finally {
      cleanup();
    }
  });
});
