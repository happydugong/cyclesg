import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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
  const configDirectoryPath = join(tempDirectory, 'overlay-sources');
  const records = Array.isArray(config) ? config : [config];

  mkdirSync(configDirectoryPath, { recursive: true });

  records.forEach((record, index) => {
    const recordId =
      record && typeof record === 'object' && 'id' in record && typeof record.id === 'string'
        ? record.id
        : `record-${index + 1}`;
    writeFileSync(
      join(configDirectoryPath, `${recordId}.json`),
      `${JSON.stringify(record, null, 2)}\n`,
      'utf8'
    );
  });

  return {
    configDirectoryPath,
    cleanup() {
      rmSync(tempDirectory, { recursive: true, force: true });
    }
  };
}

describe('overlay-source-config', () => {
  it('loads mixed overlay sources and filters them by source kind', async () => {
    const { configDirectoryPath, cleanup } = writeConfigFile([
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
      const sources = await loadOverlaySourceConfigs(configDirectoryPath);
      const dataGovSources = await loadDataGovOverlaySourceConfigs(configDirectoryPath);
      const myMapsSources = await loadMyMapsOverlaySourceConfigs(configDirectoryPath);

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
    const { configDirectoryPath, cleanup } = writeConfigFile([
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
      await expect(loadMyMapsOverlaySourceConfigs(configDirectoryPath)).rejects.toThrow(
        'Overlay source broken-source must define sync.sourceUrl.'
      );
    } finally {
      cleanup();
    }
  });

  it('fails fast when overlay source ids are duplicated across files', async () => {
    const { configDirectoryPath, cleanup } = writeConfigFile([
      {
        id: 'duplicate-source',
        label: 'First',
        sourceKind: 'google-my-maps',
        featureAdapter: 'my-maps',
        defaultVisible: false,
        description: 'First overlay.',
        asset: {
          geoJson: 'src/assets/curated-routes.geojson',
          metadata: 'src/assets/curated-routes-metadata.json'
        },
        sync: {
          sourceUrl: 'https://example.com/first.kml'
        },
        presentation: {
          routeColor: '#F97316',
          selectedColor: '#7C2D12',
          activeBackgroundColor: '#FFF7ED',
          activeTextColor: '#7C2D12'
        }
      },
      {
        id: 'duplicate-source',
        label: 'Second',
        sourceKind: 'google-my-maps',
        featureAdapter: 'my-maps',
        defaultVisible: false,
        description: 'Second overlay.',
        asset: {
          geoJson: 'src/assets/curated-routes.geojson',
          metadata: 'src/assets/curated-routes-metadata.json'
        },
        sync: {
          sourceUrl: 'https://example.com/second.kml'
        },
        presentation: {
          routeColor: '#2563EB',
          selectedColor: '#1E3A8A',
          activeBackgroundColor: '#DBEAFE',
          activeTextColor: '#1E3A8A'
        }
      }
    ]);

    writeFileSync(
      join(configDirectoryPath, 'duplicate-source-copy.json'),
      `${JSON.stringify(
        {
          id: 'duplicate-source',
          label: 'Copied',
          sourceKind: 'google-my-maps',
          featureAdapter: 'my-maps',
          defaultVisible: false,
          description: 'Copied overlay.',
          asset: {
            geoJson: 'src/assets/curated-routes.geojson',
            metadata: 'src/assets/curated-routes-metadata.json'
          },
          sync: {
            sourceUrl: 'https://example.com/copied.kml'
          },
          presentation: {
            routeColor: '#16A34A',
            selectedColor: '#166534',
            activeBackgroundColor: '#DCFCE7',
            activeTextColor: '#166534'
          }
        },
        null,
        2
      )}\n`,
      'utf8'
    );

    try {
      await expect(loadOverlaySourceConfigs(configDirectoryPath)).rejects.toThrow(
        'Overlay source duplicate-source is duplicated.'
      );
    } finally {
      cleanup();
    }
  });
});
