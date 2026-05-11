import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cyclingPathFixture } from '../test/fixtures/cyclingPathFixture';
import { pcnFixture } from '../test/fixtures/pcnFixture';

const testState = vi.hoisted(() => {
  const addTo = vi.fn();
  const setLngLat = vi.fn(() => ({ addTo }));
  const mockMarker = { setLngLat, remove: vi.fn() };
  const flyToLocation = vi.fn();
  const mapInstance = {
    once: vi.fn((event: string, callback: () => void) => {
      if (event === 'load') {
        callback();
      }
    }),
    remove: vi.fn()
  };

  return {
    addTo,
    setLngLat,
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
    testState.mapInstance.once.mockImplementation((event: string, callback: () => void) => {
      if (event === 'load') {
        callback();
      }
    });
  });

  it('shows a loading state and disables the center button while waiting for GPS', async () => {
    vi.mocked(useGeolocation).mockReturnValue({
      status: 'requesting',
      location: null,
      errorMessage: null
    });

    render(<MapPage />);

    expect(screen.getByText('Finding your GPS location…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /center map on current location/i })).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByText('CycleSG')).toBeInTheDocument();
    });
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
      errorMessage: 'Location permission was denied.'
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
  });
});
