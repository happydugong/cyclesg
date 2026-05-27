import { useEffect } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';

const MAP_LONG_PRESS_MS = 520;
const MAP_LONG_PRESS_MOVE_TOLERANCE_PX = 10;

interface MapLongPressEvent {
  lngLat?: {
    lng: number;
    lat: number;
  };
  originalEvent?: Event;
  point?: {
    x: number;
    y: number;
  };
}

interface UseMapLongPressPinOptions {
  map: MapLibreMap | null;
  onLongPress: (longitude: number, latitude: number) => void;
}

export function useMapLongPressPin({ map, onLongPress }: UseMapLongPressPinOptions) {
  useEffect(() => {
    if (!map) {
      return;
    }

    let longPressTimeoutId: number | null = null;
    let startPoint: { x: number; y: number } | null = null;

    const clearLongPressTimeout = () => {
      if (longPressTimeoutId) {
        window.clearTimeout(longPressTimeoutId);
        longPressTimeoutId = null;
      }
    };

    const handlePressStart = (event: MapLongPressEvent) => {
      const originalEvent = event.originalEvent;

      if (originalEvent instanceof MouseEvent && originalEvent.button !== 0) {
        return;
      }

      if (!event.lngLat) {
        return;
      }

      clearLongPressTimeout();
      startPoint = event.point ?? null;

      const { lng, lat } = event.lngLat;
      longPressTimeoutId = window.setTimeout(() => {
        originalEvent?.preventDefault();
        onLongPress(lng, lat);
        longPressTimeoutId = null;
      }, MAP_LONG_PRESS_MS);
    };

    const handlePressMove = (event: MapLongPressEvent) => {
      if (!startPoint || !event.point) {
        return;
      }

      const deltaX = event.point.x - startPoint.x;
      const deltaY = event.point.y - startPoint.y;

      if (Math.hypot(deltaX, deltaY) > MAP_LONG_PRESS_MOVE_TOLERANCE_PX) {
        clearLongPressTimeout();
      }
    };

    const handlePressEnd = () => {
      clearLongPressTimeout();
      startPoint = null;
    };

    map.on('mousedown', handlePressStart);
    map.on('touchstart', handlePressStart);
    map.on('mousemove', handlePressMove);
    map.on('touchmove', handlePressMove);
    map.on('mouseup', handlePressEnd);
    map.on('touchend', handlePressEnd);
    map.on('dragstart', handlePressEnd);

    return () => {
      clearLongPressTimeout();
      map.off('mousedown', handlePressStart);
      map.off('touchstart', handlePressStart);
      map.off('mousemove', handlePressMove);
      map.off('touchmove', handlePressMove);
      map.off('mouseup', handlePressEnd);
      map.off('touchend', handlePressEnd);
      map.off('dragstart', handlePressEnd);
    };
  }, [map, onLongPress]);
}
