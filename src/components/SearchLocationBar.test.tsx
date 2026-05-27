import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LocationSearchController } from '../hooks/useLocationSearch';
import { SearchLocationBar } from './SearchLocationBar';

function createSearchController(
  overrides: Partial<LocationSearchController> = {}
): LocationSearchController {
  return {
    clear: vi.fn(),
    clearSelection: vi.fn(),
    close: vi.fn(),
    errorMessage: null,
    highlightedIndex: -1,
    isOpen: false,
    open: vi.fn(),
    query: '',
    results: [],
    selectResult: vi.fn(),
    selectedResultId: null,
    setHighlightedIndex: vi.fn(),
    setQuery: vi.fn(),
    status: 'idle',
    ...overrides
  };
}

describe('SearchLocationBar', () => {
  it('keeps the search row fixed-height and uses 16px input text for iPhone focus', () => {
    const { container } = render(
      <SearchLocationBar
        isVisible
        onSelect={vi.fn()}
        search={createSearchController({ query: 'Marina' })}
      />
    );

    const searchInput = screen.getByRole('searchbox', { name: /search location/i });
    const searchRow = container.querySelector('.h-14');

    expect(searchRow).not.toBeNull();
    expect(searchInput).toHaveClass('text-base', 'leading-6');
    expect(searchInput).not.toHaveClass('text-[15px]');
  });

  it('removes hidden search controls from tab order while preserving the query', () => {
    render(
      <SearchLocationBar
        isVisible={false}
        onSelect={vi.fn()}
        search={createSearchController({ query: 'Orchard' })}
      />
    );

    const searchInput = screen.getByRole('searchbox', { hidden: true, name: /search location/i });

    expect(searchInput).toHaveValue('Orchard');
    expect(searchInput).toHaveAttribute('tabindex', '-1');
  });
});
