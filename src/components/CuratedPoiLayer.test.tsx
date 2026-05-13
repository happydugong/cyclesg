import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CuratedPoiLayer } from './CuratedPoiLayer';
import { curatedRoutesFixture } from '../test/fixtures/curatedRoutesFixture';

class MockImage {
  crossOrigin = '';
  height = 64;
  naturalHeight = 64;
  naturalWidth = 64;
  onerror: (() => void) | null = null;
  onload: (() => void) | null = null;
  width = 64;

  set src(_value: string) {
    queueMicrotask(() => {
      this.onload?.();
    });
  }
}

class MockImageData {
  constructor(
    public width: number,
    public height: number
  ) {}
}

function createMapMock() {
  const layers = new Set<string>();
  const sources = new Set<string>();
  const sourceApi = { setData: vi.fn() };
  const handlers = new Map<string, Map<string, Set<(event: unknown) => void>>>();

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
    hasImage: vi.fn(() => false),
    loadImage: vi.fn(() =>
      Promise.resolve({
        data: {} as HTMLImageElement
      })
    ),
    addImage: vi.fn(),
    setFilter: vi.fn(),
    getCanvas: vi.fn(() => ({ style: { cursor: '' } })),
    queryRenderedFeatures: vi.fn(() => []),
    isStyleLoaded: vi.fn(() => true),
    once: vi.fn(),
    on: vi.fn((event: string, layerOrHandler: string | ((event: unknown) => void), maybeHandler?: (event: unknown) => void) => {
      if (typeof layerOrHandler !== 'string' || !maybeHandler) {
        return;
      }

      const layerHandlers = handlers.get(event) ?? new Map<string, Set<(event: unknown) => void>>();
      const currentHandlers = layerHandlers.get(layerOrHandler) ?? new Set<(event: unknown) => void>();
      currentHandlers.add(maybeHandler);
      layerHandlers.set(layerOrHandler, currentHandlers);
      handlers.set(event, layerHandlers);
    }),
    off: vi.fn(),
    emitLayerEvent(event: string, layerId: string, payload: unknown) {
      handlers.get(event)?.get(layerId)?.forEach((handler) => handler(payload));
    }
  };
}

describe('CuratedPoiLayer', () => {
  beforeEach(() => {
    vi.stubGlobal('Image', MockImage);
    vi.stubGlobal('ImageData', MockImageData);
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: vi.fn(() => ({
            drawImage: vi.fn(),
            getImageData: vi.fn(() => new ImageData(64, 64))
          }))
        } as unknown as HTMLCanvasElement;
      }

      return createElement(tagName);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const layerProps = {
    ids: {
      source: 'curated-pois-source',
      circle: 'curated-pois-circle-layer',
      icon: 'curated-pois-icon-layer',
      label: 'curated-pois-label-layer'
    },
    palette: {
      circleColor: '#F97316',
      textColor: '#7C2D12',
      textHaloColor: '#FFF7ED'
    }
  };

  it('registers a dedicated point source and marker layers', () => {
    const map = createMapMock();
    const pointOnlyGeoJson = {
      ...curatedRoutesFixture,
      features: curatedRoutesFixture.features.filter((feature) => feature.geometry.type === 'Point')
    };

    render(
      <CuratedPoiLayer
        data={pointOnlyGeoJson}
        ids={layerProps.ids}
        map={map as never}
        onClearSelection={vi.fn()}
        onSelect={vi.fn()}
        palette={layerProps.palette}
      />
    );

    expect(map.addSource).toHaveBeenCalledWith(
      'curated-pois-source',
      expect.objectContaining({ type: 'geojson', data: pointOnlyGeoJson })
    );
    expect(map.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'curated-pois-circle-layer',
        type: 'circle'
      })
    );
    expect(map.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'curated-pois-label-layer',
        type: 'symbol'
      })
    );
  });

  it('does not wait on isStyleLoaded before adding layers', () => {
    const map = createMapMock();
    map.isStyleLoaded.mockReturnValue(false);
    const pointOnlyGeoJson = {
      ...curatedRoutesFixture,
      features: curatedRoutesFixture.features.filter((feature) => feature.geometry.type === 'Point')
    };

    render(
      <CuratedPoiLayer
        data={pointOnlyGeoJson}
        ids={layerProps.ids}
        map={map as never}
        onClearSelection={vi.fn()}
        onSelect={vi.fn()}
        palette={layerProps.palette}
      />
    );

    expect(map.addSource).toHaveBeenCalledWith(
      'curated-pois-source',
      expect.objectContaining({ type: 'geojson', data: pointOnlyGeoJson })
    );
    expect(map.isStyleLoaded).not.toHaveBeenCalled();
    expect(map.once).not.toHaveBeenCalledWith('load', expect.any(Function));
    expect(map.once).not.toHaveBeenCalledWith('styledata', expect.any(Function));
  });

  it('uses custom ids and colors for independent My Maps overlays', () => {
    const map = createMapMock();
    const pointOnlyGeoJson = {
      ...curatedRoutesFixture,
      features: curatedRoutesFixture.features.filter((feature) => feature.geometry.type === 'Point')
    };
    const customProps = {
      ids: {
        source: 'mymaps-food-pois-source',
        circle: 'mymaps-food-pois-circle-layer',
        icon: 'mymaps-food-pois-icon-layer',
        label: 'mymaps-food-pois-label-layer'
      },
      palette: {
        circleColor: '#2563EB',
        textColor: '#1E3A8A',
        textHaloColor: '#DBEAFE'
      }
    };

    render(
      <CuratedPoiLayer
        data={pointOnlyGeoJson}
        ids={customProps.ids}
        map={map as never}
        onClearSelection={vi.fn()}
        onSelect={vi.fn()}
        palette={customProps.palette}
      />
    );

    expect(map.addSource).toHaveBeenCalledWith(
      'mymaps-food-pois-source',
      expect.objectContaining({ type: 'geojson', data: pointOnlyGeoJson })
    );
    expect(map.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'mymaps-food-pois-circle-layer',
        paint: expect.objectContaining({
          'circle-color': '#2563EB',
          'circle-stroke-color': '#DBEAFE'
        })
      })
    );
    expect(map.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'mymaps-food-pois-label-layer',
        paint: expect.objectContaining({
          'text-color': '#1E3A8A',
          'text-halo-color': '#DBEAFE'
        })
      })
    );
  });

  it('loads configured custom icons and uses them in the symbol layer', async () => {
    const map = createMapMock();
    const pointOnlyGeoJson = {
      ...curatedRoutesFixture,
      features: curatedRoutesFixture.features
        .filter((feature) => feature.geometry.type === 'Point')
        .map((feature) => ({
          ...feature,
          properties: {
            ...feature.properties,
            poiIconHref: 'https://example.com/poi.png',
            poiIconId: 'curated-poi-icon-custom'
          }
        }))
    };

    render(
      <CuratedPoiLayer
        data={pointOnlyGeoJson}
        ids={layerProps.ids}
        map={map as never}
        onClearSelection={vi.fn()}
        onSelect={vi.fn()}
        palette={layerProps.palette}
      />
    );

    await waitFor(() => {
      expect(map.loadImage).toHaveBeenCalledWith('https://example.com/poi.png');
    });

    expect(map.addImage).toHaveBeenCalledWith('curated-poi-icon-custom', expect.anything());
    expect(map.setFilter).toHaveBeenCalledWith('curated-pois-circle-layer', [
      '!',
      [
        'match',
        ['get', 'poiIconId'],
        ['curated-poi-icon-custom'],
        true,
        false
      ]
    ]);
    expect(map.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'curated-pois-icon-layer',
        layout: expect.objectContaining({
          'icon-image': ['coalesce', ['get', 'poiIconId'], '']
        })
      })
    );
    expect(map.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'curated-pois-label-layer',
        layout: expect.objectContaining({
          'text-field': ['get', 'name']
        })
      })
    );
  });

  it('rasterizes configured svg icons before adding them to the map', async () => {
    const map = createMapMock();
    const pointOnlyGeoJson = {
      ...curatedRoutesFixture,
      features: curatedRoutesFixture.features
        .filter((feature) => feature.geometry.type === 'Point')
        .map((feature) => ({
          ...feature,
          properties: {
            ...feature.properties,
            poiIconHref: '/poi-icons/bicycle-shop.svg',
            poiIconId: 'curated-poi-icon-bike'
          }
        }))
    };

    render(
      <CuratedPoiLayer
        data={pointOnlyGeoJson}
        ids={layerProps.ids}
        map={map as never}
        onClearSelection={vi.fn()}
        onSelect={vi.fn()}
        palette={layerProps.palette}
      />
    );

    await waitFor(() => {
      expect(map.addImage).toHaveBeenCalledWith(
        'curated-poi-icon-bike',
        expect.any(ImageData)
      );
    });
    expect(map.loadImage).not.toHaveBeenCalledWith('/poi-icons/bicycle-shop.svg');
  });

  it('applies configured icon scale to symbol icons', () => {
    const map = createMapMock();
    const pointOnlyGeoJson = {
      ...curatedRoutesFixture,
      features: curatedRoutesFixture.features.filter((feature) => feature.geometry.type === 'Point')
    };

    render(
      <CuratedPoiLayer
        data={pointOnlyGeoJson}
        ids={layerProps.ids}
        map={map as never}
        onClearSelection={vi.fn()}
        onSelect={vi.fn()}
        palette={{ ...layerProps.palette, iconScale: 0.62 }}
      />
    );

    expect(map.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'curated-pois-label-layer',
        layout: expect.objectContaining({
          'text-field': ['get', 'name']
        })
      })
    );
    expect(map.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'curated-pois-icon-layer',
        layout: expect.objectContaining({
          'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.341, 14, 0.434, 17, 0.558]
        })
      })
    );
  });

  it('selects POIs from circle and label layer clicks', () => {
    const map = createMapMock();
    const onSelect = vi.fn();
    const pointOnlyGeoJson = {
      ...curatedRoutesFixture,
      features: curatedRoutesFixture.features.filter((feature) => feature.geometry.type === 'Point')
    };
    const pointProperties = pointOnlyGeoJson.features[0].properties;
    const preventDefault = vi.fn();

    render(
      <CuratedPoiLayer
        data={pointOnlyGeoJson}
        ids={layerProps.ids}
        map={map as never}
        onClearSelection={vi.fn()}
        onSelect={onSelect}
        palette={layerProps.palette}
      />
    );

    map.emitLayerEvent('click', 'curated-pois-circle-layer', {
      features: [{ properties: pointProperties }],
      preventDefault
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(onSelect).toHaveBeenCalledWith(pointProperties);
  });
});
