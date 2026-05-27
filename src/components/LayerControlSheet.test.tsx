import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LayerControlSheet, type OverlayControlItem } from './LayerControlSheet';

const MAP_SUGGESTION_ISSUE_URL =
  'https://github.com/happydugong/cyclesg/issues/new?template=map_suggestion.yml';

function mockMobileViewport() {
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn()
  })));

  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: 1000
  });
}

const items: OverlayControlItem[] = [
  {
    id: 'official-pcn',
    label: 'PCN',
    contentType: 'route',
    section: 'official-routes',
    defaultVisible: true,
    description: 'Official NParks connectors.',
    indicatorColor: '#2FA66A',
    activeBackgroundColor: '#DCFCE7',
    activeTextColor: '#166534'
  },
  {
    id: 'jonathan-route',
    label: 'Scenic Connectors',
    contentType: 'route',
    section: 'compiled-routes',
    defaultVisible: false,
    description: 'Compiled from Google My Maps.',
    indicatorColor: '#F97316',
    activeBackgroundColor: '#FFF7ED',
    activeTextColor: '#7C2D12'
  },
  {
    id: 'cny-rabbit-route',
    label: 'Rabbit Ride',
    contentType: 'route',
    section: 'themed-routes',
    defaultVisible: false,
    description: 'Themed route import.',
    indicatorColor: '#EA580C',
    activeBackgroundColor: '#FFEDD5',
    activeTextColor: '#9A3412'
  },
  {
    id: 'snack-stop',
    label: 'Food POIs',
    contentType: 'poi',
    section: 'pois',
    defaultVisible: false,
    description: 'Rest and food stops.',
    indicatorColor: '#16A34A',
    activeBackgroundColor: '#DCFCE7',
    activeTextColor: '#166534'
  },
  {
    id: 'misc-overlay',
    label: 'Misc Overlay',
    contentType: 'route-poi',
    section: 'others',
    defaultVisible: false,
    description: 'Miscellaneous overlay.',
    indicatorColor: '#64748B',
    activeBackgroundColor: '#E2E8F0',
    activeTextColor: '#334155'
  }
];

describe('LayerControlSheet', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockMobileViewport();
  });

  it('snaps to full height when the mobile handle is dragged upward', async () => {
    const { container } = render(
      <LayerControlSheet
        items={items}
        isOpen
        isVisible={() => true}
        onClose={vi.fn()}
        onToggle={vi.fn()}
      />
    );

    const handle = container.querySelector('.cursor-ns-resize');
    const sheet = container.querySelector('div[style*="height:"]') as HTMLDivElement | null;

    expect(handle).not.toBeNull();
    expect(sheet?.style.height).toBe('420px');

    fireEvent.pointerDown(handle as Element, { pointerId: 1, clientY: 500 });
    fireEvent.pointerMove(window, { pointerId: 1, clientY: 300 });
    fireEvent.pointerUp(window, { pointerId: 1, clientY: 300 });

    await waitFor(() => {
      expect(sheet?.style.height).toBe('800px');
    });
  });

  it('calls onClose when the mobile sheet is dragged down past the close threshold', async () => {
    const onClose = vi.fn();
    const { container } = render(
      <LayerControlSheet
        items={items}
        isOpen
        isVisible={() => true}
        onClose={onClose}
        onToggle={vi.fn()}
      />
    );

    const handle = container.querySelector('.cursor-ns-resize');

    fireEvent.pointerDown(handle as Element, { pointerId: 2, clientY: 300 });
    fireEvent.pointerMove(window, { pointerId: 2, clientY: 700 });
    fireEvent.pointerUp(window, { pointerId: 2, clientY: 700 });

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('renders a footer link to the map suggestion issue template', () => {
    const { getByRole } = render(
      <LayerControlSheet
        items={items}
        isOpen
        isVisible={() => true}
        onClose={vi.fn()}
        onToggle={vi.fn()}
      />
    );

    expect(
      getByRole('link', { name: /suggest a route or poi/i })
    ).toHaveAttribute('href', MAP_SUGGESTION_ISSUE_URL);
  });

  it('renders the updated section headings', () => {
    const { getByText } = render(
      <LayerControlSheet
        items={items}
        isOpen
        isVisible={() => true}
        onClose={vi.fn()}
        onToggle={vi.fn()}
      />
    );

    expect(getByText('Official Routes / POIs')).toBeInTheDocument();
    expect(getByText('Compiled Routes')).toBeInTheDocument();
    expect(getByText('Themed Routes')).toBeInTheDocument();
    expect(getByText('POIs')).toBeInTheDocument();
    expect(getByText('Others')).toBeInTheDocument();
  });
});
