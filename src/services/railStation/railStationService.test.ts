import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadRailStationGeoJson } from './railStationService';
import type { RailStationGeoJson } from '../../types/railStation';

const railStationFixture: RailStationGeoJson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [103.90280826828767, 1.4063299295444645],
            [103.90228586062663, 1.4053811042860254],
            [103.90232698542147, 1.4053586486262621],
            [103.90280826828767, 1.4063299295444645]
          ]
        ]
      },
      properties: {
        OBJECTID: 36,
        GRND_LEVEL: 'ABOVEGROUND',
        RAIL_TYPE: 'LRT',
        NAME: 'PUNGGOL CENTRAL',
        INC_CRC: '5ED154CD47409638',
        FMEL_UPD_D: '20191209180316',
        'SHAPE.AREA': 11506.493908565,
        'SHAPE.LEN': 648.115901396167
      }
    }
  ]
};

describe('loadRailStationGeoJson', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns parsed GeoJSON when the asset fetch succeeds', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(railStationFixture), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const result = await loadRailStationGeoJson();

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(result).toEqual(railStationFixture);
  });

  it('throws when the asset fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('bad gateway', {
        status: 502,
        statusText: 'Bad Gateway'
      })
    );

    await expect(loadRailStationGeoJson()).rejects.toThrow('Failed to load rail station data: 502');
  });
});
