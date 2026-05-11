import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Marker, Map } from 'maplibre-gl';
import { CenterOnMeButton } from '../components/CenterOnMeButton';
import { LocationStatus } from '../components/LocationStatus';
import { MapViewport } from '../components/MapViewport';
import { PcnLayer } from '../components/PcnLayer';
import { useGeolocation } from '../hooks/useGeolocation';
import { createMap, createUserLocationMarker, flyToLocation } from '../services/map/mapService';
import { loadPcnGeoJson } from '../services/pcn/pcnService';
import type { PcnGeoJson, PcnProperties } from '../types/pcn';

export function MapPage() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const userMarkerRef = useRef<Marker | null>(null);
  const hasAutoCenteredRef = useRef(false);
  const geolocation = useGeolocation();
  const [mapReady, setMapReady] = useState(false);
  const [pcnData, setPcnData] = useState<PcnGeoJson | null>(null);
  const [pcnError, setPcnError] = useState<string | null>(null);
  const [selectedConnector, setSelectedConnector] = useState<PcnProperties | null>(null);
  const clearSelectedConnector = useCallback(() => {
    setSelectedConnector(null);
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = createMap(mapContainerRef.current);
    mapRef.current = map;

    map.once('load', () => {
      setMapReady(true);
    });

    return () => {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const location = geolocation.location;

    if (!map || !location) {
      return;
    }

    if (!userMarkerRef.current) {
      userMarkerRef.current = createUserLocationMarker();
      userMarkerRef.current.setLngLat([location.longitude, location.latitude]).addTo(map);
      return;
    }

    userMarkerRef.current.setLngLat([location.longitude, location.latitude]);

    if (!hasAutoCenteredRef.current) {
      flyToLocation(map, location.longitude, location.latitude);
      hasAutoCenteredRef.current = true;
    }
  }, [geolocation.location]);

  useEffect(() => {
    let active = true;

    void loadPcnGeoJson()
      .then((data) => {
        if (!active) {
          return;
        }

        setPcnData(data);
        setPcnError(null);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setPcnError('Unable to load Park Connector overlays.');
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="relative h-screen overflow-hidden bg-slate-950">
      <MapViewport ref={mapContainerRef} />
      <LocationStatus state={geolocation} />
      {mapReady && pcnData ? (
        <PcnLayer
          data={pcnData}
          map={mapRef.current}
          selectedObjectId={selectedConnector?.OBJECTID ?? null}
          onSelect={setSelectedConnector}
          onClearSelection={clearSelectedConnector}
        />
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start p-4">
        <div className="rounded-full border border-slate-900/10 bg-white/84 px-4 py-2 text-sm text-slate-700 shadow-floating backdrop-blur-md">
          CycleSG
        </div>
      </div>

      {selectedConnector ? (
        <div className="absolute inset-x-0 bottom-0 z-20 p-4">
          <div className="mx-auto max-w-md rounded-[28px] border border-slate-900/10 bg-white/90 p-4 text-slate-700 shadow-floating backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">
                  Park Connector
                </p>
                <h2 className="mt-1 text-base font-semibold text-slate-900">
                  {selectedConnector.PARK}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedConnector(null)}
                aria-label="Close selected park connector details"
                className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500"
              >
                <span className="text-lg leading-none">×</span>
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-600">{selectedConnector.PCN_LOOP}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>Segment ID {selectedConnector.OBJECTID}</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>{Math.round(selectedConnector['SHAPE.LEN'])}m mapped length</span>
            </div>
          </div>
        </div>
      ) : null}

      <CenterOnMeButton
        disabled={!geolocation.location}
        isRaised={Boolean(selectedConnector)}
        onClick={() => {
          if (mapRef.current && geolocation.location) {
            flyToLocation(
              mapRef.current,
              geolocation.location.longitude,
              geolocation.location.latitude
            );
          }
        }}
      />
    </main>
  );
}
