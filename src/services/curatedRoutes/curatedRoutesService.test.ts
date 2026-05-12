import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadCuratedRoutesGeoJson } from './curatedRoutesService';
import { curatedRoutesFixture } from '../../test/fixtures/curatedRoutesFixture';

describe('loadCuratedRoutesGeoJson', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns parsed GeoJSON when the asset fetch succeeds', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(curatedRoutesFixture), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const result = await loadCuratedRoutesGeoJson();

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(result).toEqual(curatedRoutesFixture);
  });

  it('throws when the asset fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('bad gateway', {
        status: 502,
        statusText: 'Bad Gateway'
      })
    );

    await expect(loadCuratedRoutesGeoJson()).rejects.toThrow('Failed to load curated routes data: 502');
  });
});
