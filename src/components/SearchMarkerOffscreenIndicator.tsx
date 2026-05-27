import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { SearchMarkerLocation } from '../hooks/useSearchMarker';

interface OffscreenMarkerIndicatorState {
  isVisible: boolean;
  left: number;
  top: number;
  rotation: number;
}

export function SearchMarkerOffscreenIndicator({
  map,
  target
}: {
  map: MapLibreMap | null;
  target: SearchMarkerLocation | null;
}) {
  const frameRef = useRef<number | null>(null);
  const [indicator, setIndicator] = useState<OffscreenMarkerIndicatorState>({
    isVisible: false,
    left: 0,
    top: 0,
    rotation: 0
  });

  useEffect(() => {
    if (!map || !target) {
      setIndicator((current) => (current.isVisible ? { ...current, isVisible: false } : current));
      return;
    }

    const mapWithProjection = map as MapLibreMap & {
      getBounds?: MapLibreMap['getBounds'];
      getContainer?: MapLibreMap['getContainer'];
      project?: MapLibreMap['project'];
    };

    if (!mapWithProjection.getBounds || !mapWithProjection.getContainer || !mapWithProjection.project) {
      return;
    }

    const updateIndicator = () => {
      frameRef.current = null;

      const bounds = mapWithProjection.getBounds();

      if (bounds.contains([target.longitude, target.latitude])) {
        setIndicator((current) => (current.isVisible ? { ...current, isVisible: false } : current));
        return;
      }

      const container = mapWithProjection.getContainer();
      const width = container.clientWidth;
      const height = container.clientHeight;

      if (width <= 0 || height <= 0) {
        return;
      }

      const centerX = width / 2;
      const centerY = height / 2;
      const targetPoint = mapWithProjection.project([target.longitude, target.latitude]);
      const deltaX = targetPoint.x - centerX;
      const deltaY = targetPoint.y - centerY;

      if (deltaX === 0 && deltaY === 0) {
        setIndicator((current) => (current.isVisible ? { ...current, isVisible: false } : current));
        return;
      }

      const angle = Math.atan2(deltaY, deltaX);
      const indicatorDistance = Math.min(128, Math.max(88, Math.min(width, height) * 0.18));

      setIndicator({
        isVisible: true,
        left: centerX + Math.cos(angle) * indicatorDistance,
        top: centerY + Math.sin(angle) * indicatorDistance,
        rotation: angle * (180 / Math.PI) + 90
      });
    };

    const scheduleUpdate = () => {
      if (frameRef.current !== null) {
        return;
      }

      frameRef.current = window.requestAnimationFrame(updateIndicator);
    };

    scheduleUpdate();
    map.on('move', scheduleUpdate);
    map.on('zoom', scheduleUpdate);
    map.on('resize', scheduleUpdate);

    return () => {
      map.off('move', scheduleUpdate);
      map.off('zoom', scheduleUpdate);
      map.off('resize', scheduleUpdate);

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [map, target]);

  if (!indicator.isVisible) {
    return null;
  }

  const style = {
    left: indicator.left,
    top: indicator.top
  } satisfies CSSProperties;

  return (
    <div
      aria-hidden="true"
      className="offscreen-marker-indicator pointer-events-none absolute z-20 grid h-14 w-14 place-items-center rounded-full border border-white/35 bg-white/60 text-orange-600 opacity-70 shadow-floating backdrop-blur-md"
      style={style}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-8 w-8 drop-shadow-sm transition-transform duration-75 ease-linear motion-reduce:transition-none"
        style={{ transform: `rotate(${indicator.rotation}deg)` }}
      >
        <path
          d="M12 3 20 20 12 16.5 4 20 12 3Z"
          fill="currentColor"
          stroke="white"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}
