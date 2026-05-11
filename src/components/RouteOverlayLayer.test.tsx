import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RouteOverlayLayer } from './RouteOverlayLayer';
import { pcnFixture } from '../test/fixtures/pcnFixture';

function createMapMock() {
  const layers = new Set<string>();
  const sources = new Set<string>();
  const sourceApi = { setData: vi.fn() };

  return {
    addSource: vi.fn((id: string) => {
      sources.add(id);
    }),
    getSource: vi.fn((id: string) => {
      return sources.has(id) ? sourceApi : undefined;
    }),
    addLayer: vi.fn((layer: { id: string }) => {
      layers.add(layer.id);
    }),
    getLayer: vi.fn((id: string) => {
      return layers.has(id) ? { id } : undefined;
    }),
    removeLayer: vi.fn((id: string) => {
      layers.delete(id);
    }),
    removeSource: vi.fn((id: string) => {
      sources.delete(id);
    }),
    isStyleLoaded: vi.fn(() => true),
    once: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    queryRenderedFeatures: vi.fn(() => []),
    getCanvas: vi.fn(() => ({ style: { cursor: '' } })),
    setFilter: vi.fn()
  };
}

describe('RouteOverlayLayer', () => {
  const routeLayerProps = {
    data: pcnFixture,
    ids: {
      source: 'routes-source',
      route: 'routes-route-layer',
      selected: 'routes-selected-layer',
      hitArea: 'routes-hit-area-layer'
    },
    isFeature: (feature: unknown): feature is never => Boolean(feature),
    normalizeProperties: <TProperties,>(properties: TProperties) => properties,
    objectIdKey: 'OBJECTID',
    onClearSelection: vi.fn(),
    onSelect: vi.fn(),
    palette: {
      routeColor: '#22c55e',
      selectedColor: '#374151'
    }
  };

  it('registers a route source and layers on mount', () => {
    const map = createMapMock();

    render(
      <RouteOverlayLayer
        {...routeLayerProps}
        map={map as never}
        selectedObjectId={null}
      />
    );

    expect(map.addSource).toHaveBeenCalledWith(
      'routes-source',
      expect.objectContaining({ type: 'geojson', data: pcnFixture })
    );
    expect(map.addLayer).toHaveBeenCalledTimes(3);
    expect(map.on).toHaveBeenCalledWith('click', 'routes-hit-area-layer', expect.any(Function));
  });

  it('keeps the hit-area layer invisible and wider than the visible route', () => {
    const map = createMapMock();

    render(
      <RouteOverlayLayer
        {...routeLayerProps}
        map={map as never}
        selectedObjectId={null}
      />
    );

    expect(map.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'routes-hit-area-layer',
        paint: expect.objectContaining({
          'line-opacity': 0,
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 16, 13, 20, 16, 26]
        })
      })
    );
  });

  it('updates the selected route filter when a route is selected', () => {
    const map = createMapMock();

    const { rerender } = render(
      <RouteOverlayLayer
        {...routeLayerProps}
        map={map as never}
        selectedObjectId={null}
      />
    );

    rerender(
      <RouteOverlayLayer
        {...routeLayerProps}
        map={map as never}
        selectedObjectId={202}
      />
    );

    expect(map.setFilter).toHaveBeenLastCalledWith(
      'routes-selected-layer',
      ['==', ['get', 'OBJECTID'], 202]
    );
  });
});
