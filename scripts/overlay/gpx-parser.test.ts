import { describe, expect, it } from 'vitest';
import { convertGpxFiles, parseGpx } from './gpx-parser.mjs';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const sampleGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Test" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Sample Ride</name>
  </metadata>
  <trk>
    <name>Morning Loop</name>
    <desc>Fast loop</desc>
    <trkseg>
      <trkpt lat="1.2867" lon="103.8607" />
      <trkpt lat="1.2880" lon="103.8631" />
    </trkseg>
  </trk>
  <rte>
    <name>Connector</name>
    <rtept lat="1.3004" lon="103.8673" />
    <rtept lat="1.3014" lon="103.8683" />
  </rte>
  <wpt lat="1.3004" lon="103.8673">
    <name>Water Point</name>
    <desc>Top up bottles</desc>
  </wpt>
</gpx>`;

describe('gpx parser', () => {
  it('parses tracks, routes, and waypoints into curated-route-style features', () => {
    const geoJson = parseGpx(sampleGpx);

    expect(geoJson.features).toHaveLength(3);
    expect(geoJson.features[0]).toEqual(
      expect.objectContaining({
        geometry: expect.objectContaining({
          type: 'LineString',
          coordinates: [
            [103.8607, 1.2867],
            [103.8631, 1.288]
          ]
        }),
        properties: expect.objectContaining({
          sourceType: 'gpx',
          overlayId: 'sample-ride',
          overlayName: 'Sample Ride',
          layerName: 'Sample Ride Track',
          geometryKind: 'line',
          strokeColor: '#0F766E',
          strokeWidth: 3
        })
      })
    );
    expect(geoJson.features[2]).toEqual(
      expect.objectContaining({
        geometry: expect.objectContaining({
          type: 'Point',
          coordinates: [103.8673, 1.3004]
        }),
        properties: expect.objectContaining({
          sourceType: 'gpx',
          name: 'Water Point',
          layerName: 'Waypoints',
          geometryKind: 'point'
        })
      })
    );
  });

  it('writes GeoJSON and metadata for GPX inputs', async () => {
    const tempDirectory = mkdtempSync(join(tmpdir(), 'convert-gpx-'));
    const gpxPath = join(tempDirectory, 'sample-ride.gpx');
    const outputPath = join(tempDirectory, 'sample-ride.geojson');
    const metadataPath = join(tempDirectory, 'sample-ride-metadata.json');
    writeFileSync(gpxPath, `${sampleGpx}\n`, 'utf8');

    try {
      const result = await convertGpxFiles([gpxPath], {
        outputPath,
        metadataPath,
        overlayId: 'custom-ride',
        overlayName: 'Custom Ride'
      });

      const geoJson = JSON.parse(readFileSync(outputPath, 'utf8'));
      const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));

      expect(result).toEqual(
        expect.objectContaining({
          featureCount: 3,
          lineCount: 2,
          pointCount: 1,
          geoJsonChanged: true,
          metadataChanged: true
        })
      );
      expect(geoJson.features[0].properties).toEqual(
        expect.objectContaining({
          overlayId: 'custom-ride',
          overlayName: 'Custom Ride'
        })
      );
      expect(metadata).toEqual(
        expect.objectContaining({
          sourceLabel: 'gpx',
          featureCount: 3,
          lineCount: 2,
          pointCount: 1,
          overlays: [
            expect.objectContaining({
              id: 'custom-ride',
              name: 'Custom Ride',
              featureCount: 3
            })
          ]
        })
      );
    } finally {
      rmSync(tempDirectory, { recursive: true, force: true });
    }
  });
});
