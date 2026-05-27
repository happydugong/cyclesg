import { useEffect, useRef } from 'react';
import type { LocationSearchController } from '../hooks/useLocationSearch';
import type { LocationSearchResult } from '../services/locationSearch/nominatimService';

interface SearchLocationBarProps {
  isVisible: boolean;
  onSelect: (result: LocationSearchResult) => void;
  search: LocationSearchController;
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <circle cx="8.5" cy="8.5" r="5.25" />
      <path d="m12.5 12.5 4 4" strokeLinecap="round" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current stroke-2">
      <path d="M5 5 15 15" strokeLinecap="round" />
      <path d="M15 5 5 15" strokeLinecap="round" />
    </svg>
  );
}

function LoadingSpinner() {
  return <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" aria-hidden="true" />;
}

export function SearchLocationBar({ isVisible, onSelect, search }: SearchLocationBarProps) {
  const {
    clear,
    close,
    errorMessage,
    highlightedIndex,
    isOpen,
    open,
    query,
    results,
    selectedResultId,
    setHighlightedIndex,
    setQuery,
    status
  } = search;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const shouldShowDropdown =
    isOpen &&
    query.trim().length >= 2 &&
    (status === 'loading' || status === 'error' || status === 'empty' || results.length > 0);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        close();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [close]);

  return (
    <div
      aria-hidden={!isVisible}
      className={`mobile-safe-top mobile-safe-x pointer-events-none absolute inset-x-0 top-0 z-30 transform-gpu transition-all duration-[250ms] ease-out motion-reduce:transition-none sm:px-4 sm:pt-4 ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-5 opacity-0'
      }`}
    >
      <div ref={containerRef} className="mx-auto w-full max-w-2xl">
        <div className={`${isVisible ? 'pointer-events-auto' : 'pointer-events-none'} overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white/95 shadow-floating backdrop-blur-md`}>
          <div className="flex h-14 items-center gap-3 px-4 py-2">
            <span className="shrink-0 text-slate-500">
              <SearchIcon />
            </span>
            <input
              ref={inputRef}
              type="text"
              role="searchbox"
              inputMode="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              onFocus={() => {
                open();
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  if (results.length > 0) {
                    setHighlightedIndex(Math.min(highlightedIndex + 1, results.length - 1));
                  }
                  return;
                }

                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  if (results.length > 0) {
                    setHighlightedIndex(Math.max(highlightedIndex - 1, 0));
                  }
                  return;
                }

                if (event.key === 'Enter' && highlightedIndex >= 0 && highlightedIndex < results.length) {
                  event.preventDefault();
                  const selectedResult = results[highlightedIndex];
                  onSelect(selectedResult);
                  inputRef.current?.blur();
                  close();
                  return;
                }

                if (event.key === 'Escape') {
                  close();
                  inputRef.current?.blur();
                }
              }}
              placeholder="Search location"
              aria-label="Search location"
              aria-autocomplete="list"
              aria-expanded={shouldShowDropdown}
              aria-controls="location-search-results"
              tabIndex={isVisible ? undefined : -1}
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-base leading-6 text-slate-900 outline-none placeholder:text-slate-400"
            />
            {status === 'loading' ? <LoadingSpinner /> : null}
            {query.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  clear();
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
                tabIndex={isVisible ? undefined : -1}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
              >
                <ClearIcon />
              </button>
            ) : null}
          </div>

          {shouldShowDropdown ? (
            <div className="border-t border-slate-200/80 bg-white" role="presentation">
              {status === 'loading' ? (
                <p className="px-4 py-3 text-sm text-slate-500">Searching Singapore…</p>
              ) : null}
              {status === 'error' ? (
                <p className="px-4 py-3 text-sm text-rose-600">{errorMessage}</p>
              ) : null}
              {status === 'empty' ? (
                <p className="px-4 py-3 text-sm text-slate-500">No locations found</p>
              ) : null}
              {results.length > 0 ? (
                <ul id="location-search-results" role="listbox" className="m-0 list-none p-1">
                  {results.map((result, index) => {
                    const isActive = selectedResultId === result.id || highlightedIndex === index;

                    return (
                      <li key={result.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          onMouseEnter={() => {
                            setHighlightedIndex(index);
                          }}
                          onMouseDown={(event) => {
                            event.preventDefault();
                          }}
                          onClick={() => {
                            onSelect(result);
                            inputRef.current?.blur();
                            close();
                          }}
                          tabIndex={isVisible ? undefined : -1}
                          className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${
                            isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{result.primaryText}</span>
                            <span className="mt-0.5 block text-xs text-slate-500">{result.secondaryText}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
