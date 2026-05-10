import { forwardRef } from 'react';

export const MapViewport = forwardRef<HTMLDivElement>(function MapViewport(_, ref) {
  return <div ref={ref} className="absolute inset-0" aria-label="Singapore cycling map" />;
});
