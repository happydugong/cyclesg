import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FloatingControlDock } from './FloatingControlDock';

function renderDock(overrides: Partial<Parameters<typeof FloatingControlDock>[0]> = {}) {
  return render(
    <FloatingControlDock
      hasSearchMarker={false}
      isFollowing={false}
      isLayerPanelOpen={false}
      isPreferencesOpen={false}
      isSearchVisible={false}
      locationDisabled={false}
      onLayerClick={vi.fn()}
      onLocationClick={vi.fn()}
      onPreferencesClick={vi.fn()}
      onRemovePinClick={vi.fn()}
      onSearchToggleClick={vi.fn()}
      placement="right-bottom"
      {...overrides}
    />
  );
}

describe('FloatingControlDock', () => {
  it('shows active search styling without inactive dock colors when search is visible', () => {
    renderDock({ isSearchVisible: true });

    const searchButton = screen.getByRole('button', { name: /hide search/i });

    expect(searchButton).toHaveClass(
      'border-emerald-700/25',
      'bg-emerald-600/90',
      'shadow-followPulse',
      'hover:bg-emerald-500'
    );
    expect(searchButton).not.toHaveClass(
      'border-white/20',
      'bg-slate-950/90',
      'shadow-floating',
      'hover:bg-slate-900'
    );
  });

  it('places remove pin before search and only renders it when a pin exists', () => {
    const { rerender } = renderDock({ hasSearchMarker: false });

    expect(screen.queryByRole('button', { name: /remove pin/i })).not.toBeInTheDocument();

    rerender(
      <FloatingControlDock
        hasSearchMarker
        isFollowing={false}
        isLayerPanelOpen={false}
        isPreferencesOpen={false}
        isSearchVisible={false}
        locationDisabled={false}
        onLayerClick={vi.fn()}
        onLocationClick={vi.fn()}
        onPreferencesClick={vi.fn()}
        onRemovePinClick={vi.fn()}
        onSearchToggleClick={vi.fn()}
        placement="right-bottom"
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveAccessibleName(/remove pin/i);
    expect(buttons[1]).toHaveAccessibleName(/show search/i);
  });

  it('calls the search toggle action from the search button', () => {
    const onSearchToggleClick = vi.fn();
    renderDock({ onSearchToggleClick });

    fireEvent.click(screen.getByRole('button', { name: /show search/i }));

    expect(onSearchToggleClick).toHaveBeenCalledTimes(1);
  });
});
