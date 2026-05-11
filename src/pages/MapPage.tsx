import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ExpressionSpecification, Marker, Map } from 'maplibre-gl';
import { CenterOnMeButton } from '../components/CenterOnMeButton';
import { LocationStatus } from '../components/LocationStatus';
import { MapViewport } from '../components/MapViewport';
import { RouteOverlayLayer } from '../components/RouteOverlayLayer';
import { useGeolocation } from '../hooks/useGeolocation';
import { loadCyclingPathGeoJson } from '../services/cyclingPath/cyclingPathService';
import { createMap, createUserLocationMarker, flyToLocation } from '../services/map/mapService';
import { loadPcnGeoJson } from '../services/pcn/pcnService';
import type { CyclingPathGeoJson } from '../types/cyclingPath';
import type { PcnGeoJson } from '../types/pcn';
import type { UnifiedRouteGeoJson, UnifiedRouteProperties } from '../types/routes';

function buildUnifiedRoutes(
  pcnData: PcnGeoJson | null,
  cyclingPathData: CyclingPathGeoJson | null
): UnifiedRouteGeoJson | null {
  if (!pcnData && !cyclingPathData) {
    return null;
  }

  return {
    type: 'FeatureCollection',
    features: [
      ...(pcnData?.features.map((feature) => ({
        ...feature,
        properties: {
          routeId: `pcn-${feature.properties.OBJECTID}`,
          routeType: 'pcn' as const,
          routeName: feature.properties.PARK,
          routeGroup: feature.properties.PCN_LOOP,
          routeLength: feature.properties['SHAPE.LEN']
        }
      })) ?? []),
      ...(cyclingPathData?.features.map((feature) => ({
        ...feature,
        properties: {
          routeId: `cycling-${feature.properties.OBJECTID_1}`,
          routeType: 'cycling-path' as const,
          routeName: feature.properties.CYL_PATH ?? 'LTA Cycling Path',
          routeGroup:
            feature.properties.AGENCY_MAINT ?? 'Land Transport Authority cycling path network',
          routeLength: feature.properties['SHAPE_1.LEN']
        }
      })) ?? [])
    ]
  };
}

function isUnifiedRouteFeature(
  feature: import('maplibre-gl').MapGeoJSONFeature | undefined
): feature is import('maplibre-gl').MapGeoJSONFeature & {
  properties: UnifiedRouteProperties;
} {
  const properties = feature?.properties as Record<string, unknown> | undefined;

  if (!properties) {
    return false;
  }

  return typeof properties.routeId === 'string' && typeof properties.routeName === 'string';
}

function normalizeUnifiedRouteProperties(
  properties: UnifiedRouteProperties
): UnifiedRouteProperties {
  return {
    ...properties,
    routeId: String(properties.routeId),
    routeName: String(properties.routeName),
    routeGroup: String(properties.routeGroup),
    routeLength:
      typeof properties.routeLength === 'number'
        ? properties.routeLength
        : properties.routeLength
          ? Number(properties.routeLength)
          : null
  };
}

export function MapPage() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const userMarkerRef = useRef<Marker | null>(null);
  const hasAutoCenteredRef = useRef(false);
  const geolocation = useGeolocation();
  const [mapReady, setMapReady] = useState(false);
  const [pcnData, setPcnData] = useState<PcnGeoJson | null>(null);
  const [cyclingPathData, setCyclingPathData] = useState<CyclingPathGeoJson | null>(null);
  const [pcnError, setPcnError] = useState<string | null>(null);
  const [cyclingPathError, setCyclingPathError] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<UnifiedRouteProperties | null>(null);
  const [displayedRoute, setDisplayedRoute] = useState<UnifiedRouteProperties | null>(null);
  const [isRouteCardVisible, setIsRouteCardVisible] = useState(false);
  const clearSelectedRoute = useCallback(() => {
    setSelectedRoute(null);
  }, []);
  const unifiedRoutes = useMemo(() => buildUnifiedRoutes(pcnData, cyclingPathData), [pcnData, cyclingPathData]);
  const routeLayerIds = useMemo(
    () => ({
      source: 'routes-source',
      route: 'routes-route-layer',
      selected: 'routes-selected-layer',
      hitArea: 'routes-hit-area-layer'
    }),
    []
  );
  const routePalette = useMemo(
    () => ({
      routeColor: [
        'match',
        ['get', 'routeType'],
        'pcn',
        '#2FA66A',
        'cycling-path',
        '#BE93D4',
        '#2FA66A'
      ] as ExpressionSpecification,
      selectedColor: '#526072'
    }),
    []
  );

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

  useEffect(() => {
    let active = true;

    void loadCyclingPathGeoJson()
      .then((data) => {
        if (!active) {
          return;
        }

        setCyclingPathData(data);
        setCyclingPathError(null);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setCyclingPathError('Unable to load cycling path overlays.');
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (selectedRoute) {
      setIsRouteCardVisible(false);
      setDisplayedRoute(selectedRoute);
      return;
    }

    setIsRouteCardVisible(false);

    const timeoutId = window.setTimeout(() => {
      setDisplayedRoute(null);
    }, 220);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [selectedRoute]);

  useEffect(() => {
    if (!displayedRoute || !selectedRoute) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsRouteCardVisible(true);
    }, 30);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [displayedRoute, selectedRoute]);

  return (
    <main className="relative h-screen overflow-hidden bg-slate-950">
      <MapViewport ref={mapContainerRef} />
      <LocationStatus state={geolocation} />
      {mapReady && unifiedRoutes ? (
        <RouteOverlayLayer
          data={unifiedRoutes}
          ids={routeLayerIds}
          isFeature={isUnifiedRouteFeature}
          map={mapRef.current}
          normalizeProperties={normalizeUnifiedRouteProperties}
          objectIdKey="routeId"
          onClearSelection={clearSelectedRoute}
          onSelect={setSelectedRoute}
          palette={routePalette}
          selectedObjectId={selectedRoute?.routeId ?? null}
        />
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start p-4">
        <div className="rounded-full border border-slate-900/10 bg-white/84 px-4 py-2 text-sm text-slate-700 shadow-floating backdrop-blur-md">
          CycleSG
        </div>
      </div>

      {displayedRoute ? (
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 p-4 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none ${
            isRouteCardVisible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
          }`}
        >
          <div className="pointer-events-auto mx-auto max-w-md rounded-[28px] border border-slate-900/10 bg-white/90 p-4 text-slate-700 shadow-floating backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">
                  {displayedRoute.routeType === 'pcn' ? 'Park Connector' : 'Cycling Path'}
                </p>
                <h2 className="mt-1 text-base font-semibold text-slate-900">
                  {displayedRoute.routeName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRoute(null)}
                aria-label="Close selected route details"
                className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500"
              >
                <span className="text-lg leading-none">×</span>
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {displayedRoute.routeGroup}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>Segment ID {displayedRoute.routeId}</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>
                {displayedRoute.routeLength !== null
                  ? `${Math.round(displayedRoute.routeLength)}m mapped length`
                  : 'Length unavailable'}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {pcnError || cyclingPathError ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-4">
          <div className="rounded-full border border-rose-200/70 bg-white/90 px-4 py-2 text-xs text-rose-700 shadow-floating backdrop-blur-md">
            {[pcnError, cyclingPathError].filter(Boolean).join(' ')}
          </div>
        </div>
      ) : null}

      <CenterOnMeButton
        disabled={!geolocation.location}
        isRaised={Boolean(displayedRoute)}
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
