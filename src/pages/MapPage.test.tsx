import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cyclingPathFixture } from '../test/fixtures/cyclingPathFixture';
import { pcnFixture } from '../test/fixtures/pcnFixture';

const testState = vi.hoisted(() => {
  const addTo = vi.fn();
  const setLngLat = vi.fn(() => ({ addTo }));
  const mockMarker = { setLngLat, remove: vi.fn() };
  const flyToLocation = vi.fn();
  const easeTo = vi.fn();
  const handlers = new Map<string, Set<(event?: { originalEvent?: unknown }) => void>>();
  const mapInstance = {
    once: vi.fn((event: string, callback: () => void) => {
      if (event === 'load') {
        callback();
      }
    }),
    on: vi.fn((event: string, callback: (event?: { originalEvent?: unknown }) => void) => {
      const currentHandlers =
        handlers.get(event) ?? new Set<(event?: { originalEvent?: unknown }) => void>();
      currentHandlers.add(callback);
      handlers.set(event, currentHandlers);
    }),
    off: vi.fn((event: string, callback: (event?: { originalEvent?: unknown }) => void) => {
      handlers.get(event)?.delete(callback);
    }),
    easeTo,
    remove: vi.fn()
  };

  return {
    addTo,
    easeTo,
    setLngLat,
    handlers,
    mockMarker,
    flyToLocation,
    mapInstance
  };
});

vi.mock('../services/map/mapService', () => ({
  createMap: vi.fn(() => testState.mapInstance),
  createUserLocationMarker: vi.fn(() => testState.mockMarker),
  flyToLocation: testState.flyToLocation
}));

vi.mock('../services/pcn/pcnService', () => ({
  loadPcnGeoJson: vi.fn(() => Promise.resolve(pcnFixture))
}));

vi.mock('../services/cyclingPath/cyclingPathService', () => ({
  loadCyclingPathGeoJson: vi.fn(() => Promise.resolve(cyclingPathFixture))
}));

vi.mock('../hooks/useGeolocation', () => ({
  useGeolocation: vi.fn()
}));

vi.mock('../components/RouteOverlayLayer', () => ({
  RouteOverlayLayer: () => null
}));

const { MapPage } = await import('./MapPage');
const { useGeolocation } = await import('../hooks/useGeolocation');

describe('MapPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    testState.handlers.clear();
    testState.mapInstance.once.mockImplementation((event: string, callback: () => void) => {
      if (event === 'load') {
        callback();
      }
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a loading state and disables the center button while waiting for GPS', async () => {
    vi.mocked(useGeolocation).mockReturnValue({
      status: 'requesting',
      location: null,
      errorMessage: null,
      refresh: vi.fn()
    });

    render(<MapPage />);

    expect(screen.getByText('Finding your GPS location…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /center map on current location/i })).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByText('CycleSG')).toBeInTheDocument();
    });

    expect(screen.queryByRole('link', { name: /hui shun/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /open source/i })).not.toBeInTheDocument();
  });

  it('shows a permission error and enables recenter when GPS is available', async () => {
    vi.mocked(useGeolocation).mockReturnValue({
      status: 'error',
      location: {
        latitude: 1.35,
        longitude: 103.82,
        accuracy: 10,
        heading: null,
        speed: null,
        timestamp: 100
      },
      errorMessage: 'Location permission was denied.',
      refresh: vi.fn()
    });

    render(<MapPage />);

    const button = screen.getByRole('button', { name: /center map on current location/i });

    expect(screen.getByText('Location permission was denied.')).toBeInTheDocument();
    expect(button).toBeEnabled();

    await waitFor(() => {
      expect(testState.setLngLat).toHaveBeenCalledWith([103.82, 1.35]);
    });

    fireEvent.click(button);

    expect(testState.flyToLocation).toHaveBeenCalledWith(testState.mapInstance, 103.82, 1.35);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button.className).toContain('animate-followBreath');
    expect(screen.getByText('Following your location')).toBeInTheDocument();
  });

  it('keeps the map following after recenter until the user manually moves the map', async () => {
    const location = {
      latitude: 1.35,
      longitude: 103.82,
      accuracy: 10,
      heading: null,
      speed: null,
      timestamp: 100
    };

    vi.mocked(useGeolocation).mockReturnValue({
      status: 'ready',
      location,
      errorMessage: null,
      refresh: vi.fn()
    });

    const { rerender } = render(<MapPage />);

    const button = screen.getByRole('button', { name: /center map on current location/i });

    await waitFor(() => {
      expect(testState.setLngLat).toHaveBeenCalledWith([103.82, 1.35]);
    });

    fireEvent.click(button);

    rerender(<MapPage />);

    vi.mocked(useGeolocation).mockReturnValue({
      status: 'ready',
      location: {
        ...location,
        latitude: 1.351,
        longitude: 103.821,
        timestamp: 200
      },
      errorMessage: null,
      refresh: vi.fn()
    });

    rerender(<MapPage />);

    await waitFor(() => {
      expect(testState.easeTo).toHaveBeenCalledWith(
        expect.objectContaining({
          center: [103.821, 1.351]
        })
      );
    });

    act(() => {
      testState.handlers.get('dragstart')?.forEach((handler) => {
        handler({ originalEvent: {} });
      });
    });

    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('dismisses follow notices after a short delay', async () => {
    vi.useFakeTimers();

    vi.mocked(useGeolocation).mockReturnValue({
      status: 'ready',
      location: {
        latitude: 1.35,
        longitude: 103.82,
        accuracy: 10,
        heading: null,
        speed: null,
        timestamp: 100
      },
      errorMessage: null,
      refresh: vi.fn()
    });

    render(<MapPage />);

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole('button', { name: /center map on current location/i }));

    expect(screen.getByText('Following your location')).toBeInTheDocument();
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.getByText('Following your location')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(240);
    });

    expect(screen.queryByText('Following your location')).not.toBeInTheDocument();

    act(() => {
      testState.handlers.get('dragstart')?.forEach((handler) => {
        handler({ originalEvent: {} });
      });
    });
  });

  it('toggles follow mode off when the active follow button is clicked again', async () => {
    vi.mocked(useGeolocation).mockReturnValue({
      status: 'ready',
      location: {
        latitude: 1.35,
        longitude: 103.82,
        accuracy: 10,
        heading: null,
        speed: null,
        timestamp: 100
      },
      errorMessage: null,
      refresh: vi.fn()
    });

    render(<MapPage />);

    const button = screen.getByRole('button', { name: /center map on current location/i });

    await waitFor(() => {
      expect(testState.setLngLat).toHaveBeenCalledWith([103.82, 1.35]);
    });

    fireEvent.click(button);

    expect(testState.flyToLocation).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    });

    fireEvent.click(screen.getByRole('button'));

    expect(testState.flyToLocation).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
    });
  });
});
