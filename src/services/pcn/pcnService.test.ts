import { describe, expect, it, vi, afterEach } from 'vitest';
import { loadPcnGeoJson } from './pcnService';
import { pcnFixture } from '../../test/fixtures/pcnFixture';

describe('loadPcnGeoJson', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns parsed GeoJSON when the asset fetch succeeds', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(pcnFixture), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const result = await loadPcnGeoJson();

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(result).toEqual(pcnFixture);
  });

  it('throws when the asset fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('bad gateway', {
        status: 502,
        statusText: 'Bad Gateway'
      })
    );

    await expect(loadPcnGeoJson()).rejects.toThrow('Failed to load PCN data: 502');
  });
});
