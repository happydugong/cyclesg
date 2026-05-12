import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CuratedPoiLayer } from './CuratedPoiLayer';
import { curatedRoutesFixture } from '../test/fixtures/curatedRoutesFixture';

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
    off: vi.fn()
  };
}

describe('CuratedPoiLayer', () => {
  const layerProps = {
    ids: {
      source: 'curated-pois-source',
      circle: 'curated-pois-circle-layer',
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
});
