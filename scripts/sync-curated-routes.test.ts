import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseCuratedRoutesBuffer, parseCuratedRoutesKml, syncCuratedRoutes } from './sync-curated-routes.mjs';

const sampleKml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Style id="line-style">
      <LineStyle>
        <color>ff33aa55</color>
        <width>4</width>
      </LineStyle>
    </Style>
    <Style id="pin-style">
      <IconStyle>
        <Icon>
          <href>https://maps.google.com/mapfiles/kml/paddle/red-circle.png</href>
        </Icon>
      </IconStyle>
    </Style>
    <Folder>
      <name>Curated routes</name>
      <Placemark>
        <name>Canal Route</name>
        <description>Main route</description>
        <styleUrl>#line-style</styleUrl>
        <LineString>
          <coordinates>103.8607,1.2867,0 103.8631,1.2880,0</coordinates>
        </LineString>
      </Placemark>
    </Folder>
    <Folder>
      <name>POIs</name>
      <Placemark>
        <name>Rest stop</name>
        <description>Water point</description>
        <styleUrl>#pin-style</styleUrl>
        <Point>
          <coordinates>103.8673,1.3004,0</coordinates>
        </Point>
      </Placemark>
    </Folder>
  </Document>
</kml>`;

describe('sync-curated-routes parser', () => {
  it('parses KML LineString and Point features with folder metadata', () => {
    const result = parseCuratedRoutesKml(sampleKml);

    expect(result.features).toHaveLength(2);
    expect(result.features[0]).toEqual(
      expect.objectContaining({
        geometry: expect.objectContaining({ type: 'LineString' }),
        properties: expect.objectContaining({
          name: 'Canal Route',
          layerName: 'Curated routes',
          geometryKind: 'line',
          strokeColor: '#55AA33',
          strokeWidth: 4
        })
      })
    );
    expect(result.features[1]).toEqual(
      expect.objectContaining({
        geometry: expect.objectContaining({ type: 'Point' }),
        properties: expect.objectContaining({
          name: 'Rest stop',
          layerName: 'POIs',
          geometryKind: 'point',
          iconHref: 'https://maps.google.com/mapfiles/kml/paddle/red-circle.png'
        })
      })
    );
  });

  it('handles KMZ buffers by extracting the embedded KML', async () => {
    const tempDirectory = mkdtempSync(join(tmpdir(), 'curated-routes-kmz-'));

    try {
      const kmlPath = join(tempDirectory, 'doc.kml');
      const kmzPath = join(tempDirectory, 'map.kmz');
      writeFileSync(kmlPath, sampleKml, 'utf8');
      execFileSync('zip', ['-q', kmzPath, 'doc.kml'], { cwd: tempDirectory });

      const kmzBuffer = readFileSync(kmzPath);
      const result = await parseCuratedRoutesBuffer(kmzBuffer);

      expect(result.features).toHaveLength(2);
      expect(result.features.map((feature) => feature.geometry.type)).toEqual(['LineString', 'Point']);
    } finally {
      rmSync(tempDirectory, { recursive: true, force: true });
    }
  });

  it('rejects malformed coordinate order or empty geometries', () => {
    const malformedCoordinatesKml = sampleKml.replace(
      '103.8607,1.2867,0 103.8631,1.2880,0',
      'abc,1.2867,0'
    );
    const emptyGeometryKml = sampleKml.replace(
      '<coordinates>103.8673,1.3004,0</coordinates>',
      '<coordinates>   </coordinates>'
    );

    expect(() => parseCuratedRoutesKml(malformedCoordinatesKml)).toThrow(
      'Encountered malformed KML coordinates.'
    );
    expect(() => parseCuratedRoutesKml(emptyGeometryKml)).toThrow('Encountered an empty KML geometry.');
  });

  it('rejects coordinates outside Singapore bounds', () => {
    const outOfBoundsKml = sampleKml.replace('103.8673,1.3004,0', '120.0,14.0,0');

    expect(() => parseCuratedRoutesKml(outOfBoundsKml)).toThrow(
      'Found curated route coordinate outside Singapore bounds'
    );
  });

  it('syncs multiple configured My Maps overlays into one annotated GeoJSON asset', async () => {
    const tempDirectory = mkdtempSync(join(tmpdir(), 'curated-routes-sync-'));

    try {
      const outputPath = join(tempDirectory, 'curated-routes.geojson');
      const metadataPath = join(tempDirectory, 'curated-routes-metadata.json');
      const overlays = [
        {
          id: 'jonathan-route',
          label: 'Jonathan Route',
          sourceKind: 'google-my-maps',
          featureAdapter: 'my-maps',
          defaultVisible: false,
          description: 'Jonathan Route Google My Maps layer.',
          asset: {
            geoJson: 'src/assets/curated-routes.geojson',
            metadata: 'src/assets/curated-routes-metadata.json'
          },
          sync: {
            sourceUrl: 'https://example.com/cycling.kml'
          }
        },
        {
          id: 'food-stops',
          label: 'Food Stops',
          sourceKind: 'google-my-maps',
          featureAdapter: 'my-maps',
          defaultVisible: false,
          description: 'Food Stops Google My Maps layer.',
          asset: {
            geoJson: 'src/assets/curated-routes.geojson',
            metadata: 'src/assets/curated-routes-metadata.json'
          },
          sync: {
            sourceUrl: 'https://example.com/food.kml'
          }
        }
      ];
      const requestedUrls: string[] = [];
      const fetchImpl = async (url: string) => {
        requestedUrls.push(url);

        return new Response(sampleKml, {
          status: 200,
          headers: {
            'content-type': 'application/vnd.google-earth.kml+xml'
          }
        });
      };

      const result = await syncCuratedRoutes(fetchImpl, {
        overlays,
        outputPath,
        metadataPath
      });

      const geoJson = JSON.parse(readFileSync(outputPath, 'utf8'));
      const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));

      expect(requestedUrls).toEqual([
        'https://example.com/cycling.kml',
        'https://example.com/food.kml'
      ]);
      expect(result).toEqual(
        expect.objectContaining({
          featureCount: 4,
          lineCount: 2,
          pointCount: 2,
          geoJsonChanged: true,
          metadataChanged: true
        })
      );
      expect(geoJson.features).toHaveLength(4);
      expect(geoJson.features[0].properties).toEqual(
        expect.objectContaining({
          featureId: 'jonathan-route-curated-routes-canal-route-line-1',
          overlayId: 'jonathan-route',
          overlayName: 'Jonathan Route'
        })
      );
      expect(geoJson.features[2].properties).toEqual(
        expect.objectContaining({
          featureId: 'food-stops-curated-routes-canal-route-line-1',
          overlayId: 'food-stops',
          overlayName: 'Food Stops'
        })
      );
      expect(metadata).toEqual(
        expect.objectContaining({
          featureCount: 4,
          lineCount: 2,
          pointCount: 2,
          overlays: [
            expect.objectContaining({
              id: 'jonathan-route',
              name: 'Jonathan Route',
              featureCount: 2,
              lineCount: 1,
              pointCount: 1
            }),
            expect.objectContaining({
              id: 'food-stops',
              name: 'Food Stops',
              featureCount: 2,
              lineCount: 1,
              pointCount: 1
            })
          ]
        })
      );
    } finally {
      rmSync(tempDirectory, { recursive: true, force: true });
    }
  });
});
