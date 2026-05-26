import { useCallback, useEffect, useRef, useState } from 'react';
import {
  searchSingaporeLocations,
  type LocationSearchResult
} from '../services/locationSearch/nominatimService';

const SEARCH_DEBOUNCE_MS = 300;

type SearchStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';

interface UseLocationSearchOptions {
  debounceMs?: number;
}

export interface LocationSearchController {
  clear: () => void;
  close: () => void;
  errorMessage: string | null;
  highlightedIndex: number;
  isOpen: boolean;
  open: () => void;
  query: string;
  results: LocationSearchResult[];
  selectResult: (result: LocationSearchResult) => void;
  selectedResultId: string | null;
  setHighlightedIndex: (index: number) => void;
  setQuery: (value: string) => void;
  status: SearchStatus;
}

export function useLocationSearch(
  options: UseLocationSearchOptions = {}
): LocationSearchController {
  const { debounceMs = SEARCH_DEBOUNCE_MS } = options;
  const [query, setQueryState] = useState('');
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndexState] = useState(-1);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const suppressNextSearchRef = useRef(false);

  const setQuery = useCallback((value: string) => {
    setQueryState(value);
    setSelectedResultId(null);
    setHighlightedIndexState(-1);
    setIsOpen(value.trim().length >= 2);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setHighlightedIndexState(-1);
  }, []);

  const open = useCallback(() => {
    if (query.trim().length >= 2) {
      setIsOpen(true);
    }
  }, [query]);

  const clear = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    requestIdRef.current += 1;
    setQueryState('');
    setResults([]);
    setStatus('idle');
    setErrorMessage(null);
    setIsOpen(false);
    setHighlightedIndexState(-1);
    setSelectedResultId(null);
  }, []);

  const setHighlightedIndex = useCallback((index: number) => {
    setHighlightedIndexState(index);
  }, []);

  const selectResult = useCallback((result: LocationSearchResult) => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    requestIdRef.current += 1;
    suppressNextSearchRef.current = true;
    setQueryState(result.primaryText);
    setResults([]);
    setStatus('idle');
    setErrorMessage(null);
    setIsOpen(false);
    setHighlightedIndexState(-1);
    setSelectedResultId(result.id);
  }, []);

  useEffect(() => {
    const trimmedQuery = query.trim();

    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    if (suppressNextSearchRef.current) {
      suppressNextSearchRef.current = false;
      return;
    }

    if (trimmedQuery.length < 2) {
      setResults([]);
      setStatus('idle');
      setErrorMessage(null);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const timeoutId = window.setTimeout(() => {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      setStatus('loading');
      setErrorMessage(null);

      void searchSingaporeLocations(trimmedQuery, abortController.signal)
        .then((nextResults) => {
          if (requestIdRef.current !== requestId) {
            return;
          }

          setResults(nextResults);
          setStatus(nextResults.length > 0 ? 'success' : 'empty');
          setHighlightedIndexState(nextResults.length > 0 ? 0 : -1);
          setIsOpen(true);
        })
        .catch((error: unknown) => {
          if (
            requestIdRef.current !== requestId ||
            (error instanceof DOMException && error.name === 'AbortError')
          ) {
            return;
          }

          setResults([]);
          setStatus('error');
          setErrorMessage('Unable to search locations right now.');
          setHighlightedIndexState(-1);
          setIsOpen(true);
        });
    }, debounceMs);

    return () => {
      window.clearTimeout(timeoutId);
      abortControllerRef.current?.abort();
    };
  }, [debounceMs, query]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (results.length === 0 && status !== 'loading') {
      setHighlightedIndexState(-1);
      return;
    }

    setHighlightedIndexState((current) => {
      if (current < 0) {
        return 0;
      }

      return Math.min(current, results.length - 1);
    });
  }, [results, status]);

  useEffect(() => {
    if (!isOpen || highlightedIndex < 0 || highlightedIndex >= results.length) {
      return;
    }

    setSelectedResultId(results[highlightedIndex].id);
  }, [highlightedIndex, isOpen, results]);

  return {
    clear,
    close,
    errorMessage,
    highlightedIndex,
    isOpen,
    open,
    query,
    results,
    selectResult,
    selectedResultId,
    setHighlightedIndex,
    setQuery,
    status
  };
}
