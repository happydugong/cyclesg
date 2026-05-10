import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGeolocation } from './useGeolocation';

describe('useGeolocation', () => {
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: originalNavigator
    });
  });

  it('returns an error when geolocation is unsupported', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {}
    });

    const { result } = renderHook(() => useGeolocation());

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(result.current.errorMessage).toBe('Geolocation is not supported in this browser.');
  });

  it('transitions to ready when watchPosition yields coordinates', async () => {
    const watchPosition = vi.fn(
      (
        onSuccess: PositionCallback,
        _onError?: PositionErrorCallback,
        _options?: PositionOptions
      ) => {
        const position = {
          coords: {
            latitude: 1.3521,
            longitude: 103.8198,
            accuracy: 12,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null
          },
          timestamp: 1715385600000
        } as GeolocationPosition;

        onSuccess(position);
        return 7;
      }
    );

    const clearWatch = vi.fn();

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        geolocation: {
          watchPosition,
          clearWatch
        }
      }
    });

    const { result, unmount } = renderHook(() => useGeolocation());

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    expect(watchPosition).toHaveBeenCalledOnce();
    expect(result.current.location).toMatchObject({
      latitude: 1.3521,
      longitude: 103.8198,
      accuracy: 12
    });

    unmount();
    expect(clearWatch).toHaveBeenCalledWith(7);
  });

  it('surfaces a permission denied error while preserving the last location', async () => {
    let onErrorHandler: PositionErrorCallback | undefined;
    let onSuccessHandler: PositionCallback | undefined;
    const clearWatch = vi.fn();

    const watchPosition = vi.fn(
      (
        onSuccess: PositionCallback,
        onError?: PositionErrorCallback,
        _options?: PositionOptions
      ) => {
        onSuccessHandler = onSuccess;
        onErrorHandler = onError;
        return 3;
      }
    );

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        geolocation: {
          watchPosition,
          clearWatch
        }
      }
    });

    const { result, unmount } = renderHook(() => useGeolocation());

    act(() => {
      onSuccessHandler?.({
        coords: {
          latitude: 1.3,
          longitude: 103.8,
          accuracy: 15,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: 10
      } as GeolocationPosition);
    });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    act(() => {
      onErrorHandler?.({
        code: 1,
        message: 'permission denied',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      } as GeolocationPositionError);
    });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(result.current.location).toMatchObject({
      latitude: 1.3,
      longitude: 103.8
    });
    expect(result.current.errorMessage).toContain('Location permission was denied');

    unmount();
    expect(clearWatch).toHaveBeenCalledWith(3);
  });
});
