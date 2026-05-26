import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cyclingPathFixture } from '../test/fixtures/cyclingPathFixture';
import { curatedRoutesFixture } from '../test/fixtures/curatedRoutesFixture';
import { pcnFixture } from '../test/fixtures/pcnFixture';

const testState = vi.hoisted(() => {
  const addTo = vi.fn();
  const setLngLat = vi.fn(() => ({ addTo }));
  const mockMarker = { setLngLat, remove: vi.fn() };
  const flyToLocation = vi.fn();
  const easeTo = vi.fn();
  const moveLayer = vi.fn();
  const routeOverlayProps: Array<{
    data: { features: Array<{ properties: Record<string, unknown> }> };
    ids: { route: string };
    onSelect: (properties: Record<string, unknown>) => void;
    palette: { routeColor: unknown; selectedColor: string };
  }> = [];
  const poiLayerProps: Array<{
    data: { features: Array<{ properties: Record<string, unknown> }> };
    ids: { circle: string; icon: string; label: string };
    onSelect: (properties: Record<string, unknown>) => void;
    palette: Record<string, string>;
  }> = [];
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
    getLayer: vi.fn((id: string) => ({ id })),
    moveLayer,
    easeTo,
    remove: vi.fn()
  };

  return {
    addTo,
    easeTo,
    moveLayer,
    setLngLat,
    handlers,
    mockMarker,
    flyToLocation,
    routeOverlayProps,
    poiLayerProps,
    mapInstance
  };
});

vi.mock('../config/overlay-sources.generated.json', () => ({
  default: [
    {
      id: 'official-pcn',
      label: 'PCN',
      sourceKind: 'data-gov-sg',
      featureAdapter: 'pcn',
      defaultVisible: true,
      description: 'Official NParks park connector routes.',
      asset: {
        geoJson: 'src/assets/pcn.geojson',
        metadata: 'src/assets/pcn-metadata.json'
      },
      sync: {
        datasetId: 'pcn-dataset',
        datasetTitle: 'Park Connector Loop',
        agency: 'NParks',
        minFeatureCount: 100
      },
      presentation: {
        routeColor: '#2FA66A',
        selectedColor: '#526072',
        activeBackgroundColor: '#DCFCE7',
        activeTextColor: '#166534'
      }
    },
    {
      id: 'official-cycling-path',
      label: 'Cycling Path',
      sourceKind: 'data-gov-sg',
      featureAdapter: 'cycling-path',
      defaultVisible: true,
      description: 'Official LTA cycling path routes.',
      asset: {
        geoJson: 'src/assets/cycling-paths.geojson',
        metadata: 'src/assets/cycling-paths-metadata.json'
      },
      sync: {
        datasetId: 'cycling-dataset',
        datasetTitle: 'Cycling Path Network (GEOJSON)',
        agency: 'LTA',
        minFeatureCount: 100
      },
      presentation: {
        routeColor: '#BE93D4',
        selectedColor: '#526072',
        activeBackgroundColor: '#F3E8FF',
        activeTextColor: '#6B21A8'
      }
    },
    {
      id: 'official-rail-station',
      label: 'MRT/LRT Stations',
      sourceKind: 'data-gov-sg',
      featureAdapter: 'rail-station',
      defaultVisible: true,
      description: 'Official URA Master Plan 2019 MRT/LRT station outlines shown as station markers.',
      asset: {
        geoJson: 'src/assets/rail-stations.geojson',
        metadata: 'src/assets/rail-stations-metadata.json'
      },
      sync: {
        datasetId: 'rail-station-dataset',
        datasetTitle: 'Master Plan 2019 Rail Station layer (GEOJSON)',
        agency: 'URA',
        minFeatureCount: 100
      },
      presentation: {
        routeColor: '#2563EB',
        selectedColor: '#1E3A8A',
        activeBackgroundColor: '#DBEAFE',
        activeTextColor: '#1E3A8A'
      }
    },
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
      },
      presentation: {
        routeColor: '#F97316',
        selectedColor: '#7C2D12',
        activeBackgroundColor: '#FFF7ED',
        activeTextColor: '#7C2D12'
      },
      attribution: {
        message: 'Map provided by Jonathan Hiew.',
        sourceLabel: 'Source',
        sourceUrl: 'https://jnhiew.blogspot.com/2014/12/cycling-map-in-singapore.html'
      },
      layerRules: {
        hiddenLayerNames: ['PCN', 'Cycling Path Network'],
        colors: {
          default: {
            route: '#F97316',
            selected: '#7C2D12',
            poi: '#F97316',
            poiText: '#7C2D12',
            poiHalo: '#FFF7ED'
          },
          byLayerName: {
            POIs: {
              route: '#0F766E',
              selected: '#134E4A',
              poi: '#0F766E',
              poiText: '#134E4A',
              poiHalo: '#CCFBF1'
            }
          }
        }
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
      },
      presentation: {
        routeColor: '#2563EB',
        selectedColor: '#1E3A8A',
        activeBackgroundColor: '#DBEAFE',
        activeTextColor: '#1E3A8A'
      },
      layerRules: {
        colors: {
          default: {
            route: '#2563EB',
            selected: '#1E3A8A',
            poi: '#2563EB',
            poiText: '#1E3A8A',
            poiHalo: '#DBEAFE'
          },
          byLayerName: {
            'Food POIs': {
              route: '#16A34A',
              selected: '#166534',
              poi: '#16A34A',
              poiText: '#166534',
              poiHalo: '#DCFCE7'
            }
          }
        },
      }
    }
  ]
}));

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

vi.mock('../services/railStation/railStationService', () => ({
  loadRailStationGeoJson: vi.fn(() =>
    Promise.resolve({
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
        },
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [103.903, 1.407],
                [103.904, 1.407],
                [103.904, 1.408],
                [103.903, 1.407]
              ]
            ]
          },
          properties: {
            OBJECTID: 37,
            GRND_LEVEL: 'UNDERGROUND',
            RAIL_TYPE: 'MRT',
            NAME: null,
            INC_CRC: '6E7738D952D979E6',
            FMEL_UPD_D: '20191209180316',
            'SHAPE.AREA': 401.26602951,
            'SHAPE.LEN': 86.37980235812
          }
        }
      ]
    })
  )
}));

vi.mock('../services/curatedRoutes/curatedRoutesService', () => ({
  loadCuratedRoutesGeoJson: vi.fn(() =>
    Promise.resolve({
      ...curatedRoutesFixture,
      features: [
        ...curatedRoutesFixture.features,
        {
          ...curatedRoutesFixture.features[0],
          properties: {
            ...curatedRoutesFixture.features[0].properties,
            featureId: 'pcn-hidden-line-1',
            name: 'Hidden PCN Line',
            layerName: 'PCN'
          }
        },
        ...curatedRoutesFixture.features.map((feature) => ({
          ...feature,
          properties: {
            ...feature.properties,
            featureId:
              feature.properties.geometryKind === 'line'
                ? 'city-bites-line-1'
                : 'snack-stop-point-1',
            overlayId: 'food-stops',
            overlayName: 'Food Stops',
            name:
              feature.properties.geometryKind === 'line' ? 'City Bites Connector' : 'Snack stop',
            layerName: feature.properties.geometryKind === 'line' ? 'Food spots' : 'Food POIs'
          }
        }))
      ]
    })
  )
}));

vi.mock('../hooks/useGeolocation', () => ({
  useGeolocation: vi.fn()
}));

vi.mock('../components/RouteOverlayLayer', () => ({
  RouteOverlayLayer: (props: {
    data: { features: Array<{ properties: Record<string, unknown> }> };
    ids: { route: string };
    onSelect: (properties: Record<string, unknown>) => void;
    palette: { routeColor: unknown; selectedColor: string };
  }) => {
    testState.routeOverlayProps.push(props);

    return (
      <button
        type="button"
        onClick={() => props.onSelect(props.data.features[0].properties)}
      >
        Select {props.ids.route}
      </button>
    );
  }
}));

vi.mock('../components/CuratedPoiLayer', () => ({
  CuratedPoiLayer: (props: {
    data: { features: Array<{ properties: Record<string, unknown> }> };
    ids: { circle: string; icon: string; label: string };
    onSelect: (properties: Record<string, unknown>) => void;
    palette: Record<string, string>;
  }) => {
    testState.poiLayerProps.push(props);

    return (
      <button
        type="button"
        onClick={() => props.onSelect(props.data.features[0].properties)}
      >
        Select {props.ids.circle}
      </button>
    );
  }
}));

const { MapPage } = await import('./MapPage');
const { useGeolocation } = await import('../hooks/useGeolocation');

describe('MapPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    testState.handlers.clear();
    testState.routeOverlayProps.length = 0;
    testState.poiLayerProps.length = 0;
    window.localStorage.clear();
    testState.mapInstance.getLayer.mockImplementation((id: string) => ({ id }));
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

    expect(
      screen.queryByText('Includes official NParks/LTA overlays and curated Google My Maps layers.')
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^pcn route$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cycling path route/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mrt\/lrt stations poi/i })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /scenic connectors route/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /food spots route/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^pcn route$/i })).toHaveLength(1);

    expect(screen.queryByRole('link', { name: /open source/i })).not.toBeInTheDocument();
  });

  it('keeps visible curated route and poi layers above the official overlays', async () => {
    vi.mocked(useGeolocation).mockReturnValue({
      status: 'requesting',
      location: null,
      errorMessage: null,
      refresh: vi.fn()
    });

    render(<MapPage />);

    fireEvent.click(await screen.findByRole('button', { name: /scenic connectors route/i }));
    fireEvent.click(screen.getByRole('button', { name: /^pois poi$/i }));
    fireEvent.click(screen.getByRole('button', { name: /food spots route/i }));
    fireEvent.click(screen.getByRole('button', { name: /food pois poi/i }));

    await waitFor(() => {
      expect(testState.moveLayer).toHaveBeenCalledWith('mymaps-official-pcn-routes-route-layer');
      expect(testState.moveLayer).toHaveBeenCalledWith('mymaps-official-cycling-path-routes-route-layer');
      expect(testState.moveLayer).toHaveBeenCalledWith('mymaps-official-rail-station-pois-circle-layer');
      expect(testState.moveLayer).toHaveBeenCalledWith('mymaps-jonathan-route-scenic-connectors-routes-route-layer');
      expect(testState.moveLayer).toHaveBeenCalledWith('mymaps-jonathan-route-pois-pois-circle-layer');
      expect(testState.moveLayer).toHaveBeenCalledWith('mymaps-food-stops-food-spots-routes-route-layer');
      expect(testState.moveLayer).toHaveBeenCalledWith('mymaps-food-stops-food-pois-pois-label-layer');
    });
  });

  it('renders configured My Maps overlays with independent route and poi layer props', async () => {
    vi.mocked(useGeolocation).mockReturnValue({
      status: 'requesting',
      location: null,
      errorMessage: null,
      refresh: vi.fn()
    });

    render(<MapPage />);

    fireEvent.click(await screen.findByRole('button', { name: /scenic connectors route/i }));
    fireEvent.click(screen.getByRole('button', { name: /^pois poi$/i }));
    fireEvent.click(screen.getByRole('button', { name: /food spots route/i }));
    fireEvent.click(screen.getByRole('button', { name: /food pois poi/i }));

    await waitFor(() => {
      expect(testState.routeOverlayProps.length).toBeGreaterThanOrEqual(3);
    });

    expect(testState.routeOverlayProps.map((props) => props.ids.route)).toEqual(
      expect.arrayContaining([
        'mymaps-official-pcn-routes-route-layer',
        'mymaps-official-cycling-path-routes-route-layer',
        'mymaps-jonathan-route-scenic-connectors-routes-route-layer',
        'mymaps-food-stops-food-spots-routes-route-layer'
      ])
    );
    expect(testState.poiLayerProps.map((props) => props.ids.circle)).toEqual(
      expect.arrayContaining([
        'mymaps-official-rail-station-pois-circle-layer',
        'mymaps-jonathan-route-pois-pois-circle-layer',
        'mymaps-food-stops-food-pois-pois-circle-layer'
      ])
    );
    expect(testState.poiLayerProps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          palette: expect.objectContaining({
            circleColor: expect.any(String),
            textColor: expect.any(String),
            textHaloColor: expect.any(String)
          })
        })
      ])
    );
    const scenicRoutePalette = testState.routeOverlayProps.find(
      (props) => props.ids.route === 'mymaps-jonathan-route-scenic-connectors-routes-route-layer'
    )?.palette.routeColor;
    const foodRoutePalette = testState.routeOverlayProps.find(
      (props) => props.ids.route === 'mymaps-food-stops-food-spots-routes-route-layer'
    )?.palette.routeColor;

    expect(scenicRoutePalette).toBeDefined();
    expect(foodRoutePalette).toBeDefined();
    expect(scenicRoutePalette).not.toEqual(foodRoutePalette);
    const scenicPoiPalette = testState.poiLayerProps.find(
      (props) => props.ids.circle === 'mymaps-jonathan-route-pois-pois-circle-layer'
    )?.palette.circleColor;
    const foodPoiPalette = testState.poiLayerProps.find(
      (props) => props.ids.circle === 'mymaps-food-stops-food-pois-pois-circle-layer'
    )?.palette.circleColor;

    expect(scenicPoiPalette).toBeDefined();
    expect(foodPoiPalette).toBeDefined();
    expect(scenicPoiPalette).not.toEqual(foodPoiPalette);
    expect(testState.routeOverlayProps.map((props) => props.ids.route)).not.toContain(
      'mymaps-jonathan-route-pcn-routes-route-layer'
    );
    expect(testState.routeOverlayProps.map((props) => props.ids.route)).not.toContain(
      'mymaps-official-rail-station-routes-route-layer'
    );
    expect(
      testState.poiLayerProps
        .find((props) => props.ids.circle === 'mymaps-official-rail-station-pois-circle-layer')
        ?.data.features[0].properties.name
    ).toBe('Punggol Central');
    expect(
      testState.poiLayerProps
        .find((props) => props.ids.circle === 'mymaps-official-rail-station-pois-circle-layer')
        ?.data.features[1].properties.name
    ).toBe('Unnamed Station');
  });

  it('persists official overlay visibility in localStorage', async () => {
    vi.mocked(useGeolocation).mockReturnValue({
      status: 'requesting',
      location: null,
      errorMessage: null,
      refresh: vi.fn()
    });

    render(<MapPage />);

    const pcnToggle = await screen.findByRole('button', { name: /^pcn route$/i });

    fireEvent.click(pcnToggle);

    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem('cyclesg.curatedOverlayVisibility.v1') ?? '{}')).toEqual(
        expect.objectContaining({
          'official-pcn': false
        })
      );
    });
  });

  it('persists My Maps overlay visibility in localStorage', async () => {
    vi.mocked(useGeolocation).mockReturnValue({
      status: 'requesting',
      location: null,
      errorMessage: null,
      refresh: vi.fn()
    });

    render(<MapPage />);

    const foodToggle = await screen.findByRole('button', { name: /food spots route/i });

    fireEvent.click(foodToggle);

    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem('cyclesg.curatedOverlayVisibility.v1') ?? '{}')).toEqual(
        expect.objectContaining({
          'food-stops-food-spots': true
        })
      );
    });
  });

  it('clears a selected curated route when its overlay is hidden', async () => {
    vi.mocked(useGeolocation).mockReturnValue({
      status: 'requesting',
      location: null,
      errorMessage: null,
      refresh: vi.fn()
    });

    render(<MapPage />);

    fireEvent.click(await screen.findByRole('button', { name: /food spots route/i }));

    const selectFoodRoute = await screen.findByRole('button', {
      name: /select mymaps-food-stops-food-spots-routes-route-layer/i
    });

    fireEvent.click(selectFoodRoute);

    await waitFor(() => {
      expect(screen.getByText('Segment ID city-bites-line-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /close selected route details/i }));

    const openLayersButton = await screen.findByRole('button', { name: /open map layers/i });

    fireEvent.click(openLayersButton);
    fireEvent.click(screen.getByRole('button', { name: /food spots route/i }));

    await waitFor(() => {
      expect(screen.queryByText('Segment ID city-bites-line-1')).not.toBeInTheDocument();
    });
  });

  it('opens the info sheet when a curated POI is selected', async () => {
    vi.mocked(useGeolocation).mockReturnValue({
      status: 'requesting',
      location: null,
      errorMessage: null,
      refresh: vi.fn()
    });

    render(<MapPage />);

    fireEvent.click(await screen.findByRole('button', { name: /^pois poi$/i }));

    const selectPoi = await screen.findByRole('button', {
      name: /select mymaps-jonathan-route-pois-pois-circle-layer/i
    });

    fireEvent.click(selectPoi);

    await waitFor(() => {
      expect(screen.getByText('POI ID rest-stop-point-1')).toBeInTheDocument();
    });

    expect(screen.getByText('Rest stop')).toBeInTheDocument();
    expect(screen.queryByText('Length unavailable')).not.toBeInTheDocument();
  });

  it('shows config-driven attribution for the Jonathan overlay', async () => {
    vi.mocked(useGeolocation).mockReturnValue({
      status: 'requesting',
      location: null,
      errorMessage: null,
      refresh: vi.fn()
    });

    render(<MapPage />);

    fireEvent.click(await screen.findByRole('button', { name: /scenic connectors route/i }));

    const selectJonathanRoute = await screen.findByRole('button', {
      name: /select mymaps-jonathan-route-scenic-connectors-routes-route-layer/i
    });

    fireEvent.click(selectJonathanRoute);

    await waitFor(() => {
      expect(screen.getByText('Map provided by Jonathan Hiew.')).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: 'Source' })).toHaveAttribute(
      'href',
      'https://jnhiew.blogspot.com/2014/12/cycling-map-in-singapore.html'
    );
    fireEvent.click(screen.getAllByRole('button', { name: /open map layers/i })[0]);

    await waitFor(() => {
      expect(screen.queryByText('Map provided by Jonathan Hiew.')).not.toBeInTheDocument();
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

    expect(screen.getByRole('button', { name: /center map on current location/i })).toHaveAttribute('aria-pressed', 'false');
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
    expect(screen.getByRole('button', { name: /following current location/i })).toHaveAttribute('aria-pressed', 'true');

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
      expect(screen.getByRole('button', { name: /following current location/i })).toHaveAttribute('aria-pressed', 'true');
    });

    fireEvent.click(screen.getByRole('button', { name: /following current location/i }));

    expect(testState.flyToLocation).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /center map on current location/i })).toHaveAttribute('aria-pressed', 'false');
    });
  });
});
