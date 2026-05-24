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
    section: 'routes',
    defaultVisible: true,
    description: 'Official NParks connectors.',
    indicatorColor: '#2FA66A',
    activeBackgroundColor: '#DCFCE7',
    activeTextColor: '#166534'
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
        onOpen={vi.fn()}
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
        onOpen={vi.fn()}
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
        onOpen={vi.fn()}
        onToggle={vi.fn()}
      />
    );

    expect(
      getByRole('link', { name: /suggest a route/i })
    ).toHaveAttribute('href', MAP_SUGGESTION_ISSUE_URL);
  });
});
