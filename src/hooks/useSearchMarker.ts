import { useCallback, useEffect, useRef, useState } from 'react';
import type { Map as MapLibreMap, Marker } from 'maplibre-gl';
import {
  createSearchLocationMarker,
  flyToSearchLocation
} from '../services/map/mapService';
import type { LocationSearchResult } from '../services/locationSearch/nominatimService';

const MARKER_EXIT_ANIMATION_MS = 180;

export interface SearchMarkerLocation {
  longitude: number;
  latitude: number;
}

function getMarkerElement(marker: Marker) {
  const element = (marker as Marker & { getElement?: () => HTMLElement }).getElement?.() ?? null;
  return element?.querySelector<HTMLElement>('.search-location-marker-pin') ?? element;
}

export function useSearchMarker(map: MapLibreMap | null) {
  const markerRef = useRef<Marker | null>(null);
  const removalTimeoutRef = useRef<number | null>(null);
  const [searchMarkerLocation, setSearchMarkerLocation] = useState<SearchMarkerLocation | null>(null);

  const clearSearchMarker = useCallback((options: { animate?: boolean } = {}) => {
    const { animate = true } = options;
    const marker = markerRef.current;

    if (!marker) {
      setSearchMarkerLocation(null);
      return;
    }

    const markerElement = getMarkerElement(marker);

    if (removalTimeoutRef.current) {
      window.clearTimeout(removalTimeoutRef.current);
      removalTimeoutRef.current = null;
    }

    markerRef.current = null;
    setSearchMarkerLocation(null);

    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!animate || !markerElement || prefersReducedMotion) {
      marker.remove();
      return;
    }

    markerElement.classList.remove('search-location-marker-drop');
    markerElement.classList.add('search-location-marker-exit');
    removalTimeoutRef.current = window.setTimeout(() => {
      marker.remove();
      removalTimeoutRef.current = null;
    }, MARKER_EXIT_ANIMATION_MS);
  }, []);

  const focusSearchResult = useCallback(
    (result: LocationSearchResult) => {
      if (!map) {
        return;
      }

      if (!markerRef.current) {
        markerRef.current = createSearchLocationMarker();
      }

      const markerElement = getMarkerElement(markerRef.current);

      if (removalTimeoutRef.current) {
        window.clearTimeout(removalTimeoutRef.current);
        removalTimeoutRef.current = null;
      }

      if (markerElement) {
        markerElement.classList.remove('search-location-marker-exit', 'search-location-marker-drop');
      }

      markerRef.current.setLngLat([result.longitude, result.latitude]).addTo(map);

      if (markerElement) {
        // Restart the drop animation when an existing marker moves to a new result.
        void markerElement.offsetWidth;
        markerElement.classList.add('search-location-marker-drop');
      }

      setSearchMarkerLocation({
        longitude: result.longitude,
        latitude: result.latitude
      });
      flyToSearchLocation(map, result.longitude, result.latitude);
    },
    [map]
  );

  useEffect(() => {
    return () => {
      if (removalTimeoutRef.current) {
        window.clearTimeout(removalTimeoutRef.current);
        removalTimeoutRef.current = null;
      }

      clearSearchMarker({ animate: false });
    };
  }, [clearSearchMarker]);

  return {
    clearSearchMarker,
    focusSearchResult,
    searchMarkerLocation
  };
}
