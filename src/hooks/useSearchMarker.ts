import { useCallback, useEffect, useRef } from 'react';
import type { Map as MapLibreMap, Marker } from 'maplibre-gl';
import {
  createSearchLocationMarker,
  flyToSearchLocation
} from '../services/map/mapService';
import type { LocationSearchResult } from '../services/locationSearch/nominatimService';

export function useSearchMarker(map: MapLibreMap | null) {
  const markerRef = useRef<Marker | null>(null);

  const clearSearchMarker = useCallback(() => {
    markerRef.current?.remove();
    markerRef.current = null;
  }, []);

  const focusSearchResult = useCallback(
    (result: LocationSearchResult) => {
      if (!map) {
        return;
      }

      if (!markerRef.current) {
        markerRef.current = createSearchLocationMarker();
      }

      markerRef.current.setLngLat([result.longitude, result.latitude]).addTo(map);
      flyToSearchLocation(map, result.longitude, result.latitude);
    },
    [map]
  );

  useEffect(() => {
    return () => {
      clearSearchMarker();
    };
  }, [clearSearchMarker]);

  return {
    clearSearchMarker,
    focusSearchResult
  };
}
