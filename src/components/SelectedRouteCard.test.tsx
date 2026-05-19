import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UnifiedRouteProperties } from '../types/routes';
import { SelectedRouteCard } from './SelectedRouteCard';

vi.mock('./comments/CommentsSection', () => ({
  CommentsSection: ({ routeId }: { routeId: string }) => (
    <div data-testid="comments-section">{routeId}</div>
  )
}));

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

const route: UnifiedRouteProperties = {
  routeId: 'marina-bay-connector-line-1',
  routeType: 'curated-my-maps',
  routeSource: 'curated-my-maps',
  routeName: 'Marina Bay Connector',
  routeGroup: 'Jonathan Route',
  routeLength: 1450,
  description: 'Scenic curated route segment',
  layerName: 'Scenic connectors',
  overlayId: 'jonathan-route',
  overlayName: 'Jonathan Route',
  overlayLayerId: 'mymaps-jonathan-route-scenic-connectors-routes-route-layer'
};

describe('SelectedRouteCard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
    mockMobileViewport();
  });

  it('renders the mobile drag handle and a scrollable content area', () => {
    const { container } = render(
      <SelectedRouteCard
        authorUrl="https://example.com/author"
        attribution={null}
        isVisible
        onClose={vi.fn()}
        presentation={{
          color: '#F97316',
          colorClass: 'bg-orange-500',
          label: 'Route'
        }}
        repositoryUrl="https://example.com/repo"
        route={route}
      />
    );

    expect(container.querySelector('.cursor-ns-resize')).not.toBeNull();
    expect(container.querySelector('.overflow-y-auto')).not.toBeNull();
    expect(screen.getByText('Marina Bay Connector')).toBeInTheDocument();
  });

  it('keeps the current route content mounted until the close animation finishes', () => {
    const { rerender } = render(
      <SelectedRouteCard
        authorUrl="https://example.com/author"
        attribution={null}
        isVisible
        onClose={vi.fn()}
        presentation={{
          color: '#F97316',
          colorClass: 'bg-orange-500',
          label: 'Route'
        }}
        repositoryUrl="https://example.com/repo"
        route={route}
      />
    );

    rerender(
      <SelectedRouteCard
        authorUrl="https://example.com/author"
        attribution={null}
        isVisible={false}
        onClose={vi.fn()}
        presentation={{
          color: '#F97316',
          colorClass: 'bg-orange-500',
          label: 'Route'
        }}
        repositoryUrl="https://example.com/repo"
        route={null}
      />
    );

    expect(screen.getByText('Marina Bay Connector')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(319);
    });

    expect(screen.getByText('Marina Bay Connector')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.queryByText('Marina Bay Connector')).not.toBeInTheDocument();
  });
});
