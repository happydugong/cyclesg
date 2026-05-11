import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadCyclingPathGeoJson } from './cyclingPathService';
import { cyclingPathFixture } from '../../test/fixtures/cyclingPathFixture';

describe('loadCyclingPathGeoJson', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns parsed GeoJSON when the asset fetch succeeds', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(cyclingPathFixture), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const result = await loadCyclingPathGeoJson();

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(result).toEqual(cyclingPathFixture);
  });

  it('throws when the asset fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('bad gateway', {
        status: 502,
        statusText: 'Bad Gateway'
      })
    );

    await expect(loadCyclingPathGeoJson()).rejects.toThrow('Failed to load cycling path data: 502');
  });
});
