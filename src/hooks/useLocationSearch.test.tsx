import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLocationSearch } from './useLocationSearch';

describe('useLocationSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('waits for 2 characters and debounces requests', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => []
    } as Response);

    const { result } = renderHook(() => useLocationSearch());

    act(() => {
      result.current.setQuery('m');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(fetchMock).not.toHaveBeenCalled();

    act(() => {
      result.current.setQuery('ma');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(299);
    });

    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain('countrycodes=sg');
    expect(fetchMock.mock.calls[0]?.[0]).toContain('limit=5');
  });

  it('ignores stale responses when a newer search resolves first', async () => {
    const fetchMock = vi.mocked(fetch);
    let resolveFirst: ((value: Response) => void) | null = null;
    let resolveSecond: ((value: Response) => void) | null = null;

    fetchMock
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveSecond = resolve;
          })
      );

    const { result } = renderHook(() => useLocationSearch());

    act(() => {
      result.current.setQuery('ma');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.setQuery('mar');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveSecond?.({
        ok: true,
        json: async () => [
          {
            place_id: 2,
            lat: '1.3000',
            lon: '103.8000',
            name: 'Marina',
            display_name: 'Marina, Singapore'
          }
        ]
      } as Response);
    });

    expect(result.current.results[0]?.primaryText).toBe('Marina');
    expect(result.current.status).toBe('success');

    await act(async () => {
      resolveFirst?.({
        ok: true,
        json: async () => [
          {
            place_id: 1,
            lat: '1.2800',
            lon: '103.8500',
            name: 'Maxwell',
            display_name: 'Maxwell, Singapore'
          }
        ]
      } as Response);
    });

    expect(result.current.results[0]?.primaryText).toBe('Marina');
  });

  it('selects a result without triggering another search', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          place_id: 101,
          lat: '1.2836',
          lon: '103.8607',
          name: 'Marina Bay Sands',
          display_name: 'Marina Bay Sands, Bayfront Avenue, Singapore'
        }
      ]
    } as Response);

    const { result } = renderHook(() => useLocationSearch());

    act(() => {
      result.current.setQuery('ma');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.results[0]?.primaryText).toBe('Marina Bay Sands');

    act(() => {
      result.current.selectResult(result.current.results[0]);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.query).toBe('Marina Bay Sands');
    expect(result.current.isOpen).toBe(false);
    expect(result.current.status).toBe('idle');
  });
});
