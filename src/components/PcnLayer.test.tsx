import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PcnLayer } from './PcnLayer';
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

describe('PcnLayer', () => {
  it('registers the PCN source and route layers on mount', () => {
    const map = createMapMock();

    render(
      <PcnLayer
        data={pcnFixture}
        map={map as never}
        selectedObjectId={null}
        onSelect={vi.fn()}
        onClearSelection={vi.fn()}
      />
    );

    expect(map.addSource).toHaveBeenCalledWith(
      'pcn-source',
      expect.objectContaining({ type: 'geojson', data: pcnFixture })
    );
    expect(map.addLayer).toHaveBeenCalledTimes(3);
    expect(map.on).toHaveBeenCalledWith('click', 'pcn-route-layer', expect.any(Function));
  });

  it('updates the selected route filter when a connector is selected', () => {
    const map = createMapMock();

    const { rerender } = render(
      <PcnLayer
        data={pcnFixture}
        map={map as never}
        selectedObjectId={null}
        onSelect={vi.fn()}
        onClearSelection={vi.fn()}
      />
    );

    rerender(
      <PcnLayer
        data={pcnFixture}
        map={map as never}
        selectedObjectId={202}
        onSelect={vi.fn()}
        onClearSelection={vi.fn()}
      />
    );

    expect(map.setFilter).toHaveBeenLastCalledWith(
      'pcn-selected-inner-layer',
      ['==', ['get', 'OBJECTID'], 202]
    );
  });
});
