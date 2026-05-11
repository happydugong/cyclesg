import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ExpressionSpecification, Marker, Map } from 'maplibre-gl';
import { CenterOnMeButton } from '../components/CenterOnMeButton';
import { LocationStatus } from '../components/LocationStatus';
import { MapViewport } from '../components/MapViewport';
import { RouteOverlayLayer } from '../components/RouteOverlayLayer';
import { useGeolocation } from '../hooks/useGeolocation';
import { trackEvent } from '../services/analytics/googleAnalytics';
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
  const authorUrl = 'https://huishun98.github.io/';
  const repositoryUrl = 'https://github.com/huishun98/cyclesg';
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const userMarkerRef = useRef<Marker | null>(null);
  const hasAutoCenteredRef = useRef(false);
  const geolocation = useGeolocation();
  const [mapReady, setMapReady] = useState(false);
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [followNotice, setFollowNotice] = useState<string | null>(null);
  const [isFollowNoticeVisible, setIsFollowNoticeVisible] = useState(false);
  const [pcnData, setPcnData] = useState<PcnGeoJson | null>(null);
  const [cyclingPathData, setCyclingPathData] = useState<CyclingPathGeoJson | null>(null);
  const [pcnError, setPcnError] = useState<string | null>(null);
  const [cyclingPathError, setCyclingPathError] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<UnifiedRouteProperties | null>(null);
  const [displayedRoute, setDisplayedRoute] = useState<UnifiedRouteProperties | null>(null);
  const [isRouteCardVisible, setIsRouteCardVisible] = useState(false);
  const followNoticeTimeoutRef = useRef<number | null>(null);
  const clearFollowNoticeTimeoutRef = useRef<number | null>(null);
  const clearSelectedRoute = useCallback(() => {
    setSelectedRoute(null);
  }, []);
  const showFollowNotice = useCallback((message: string) => {
    setFollowNotice(message);
    setIsFollowNoticeVisible(true);

    if (followNoticeTimeoutRef.current) {
      window.clearTimeout(followNoticeTimeoutRef.current);
    }

    if (clearFollowNoticeTimeoutRef.current) {
      window.clearTimeout(clearFollowNoticeTimeoutRef.current);
    }

    followNoticeTimeoutRef.current = window.setTimeout(() => {
      setIsFollowNoticeVisible(false);
      followNoticeTimeoutRef.current = null;
    }, 1500);
  }, []);
  const toggleFollowUser = useCallback(() => {
    setIsFollowingUser((current) => {
      if (current) {
        trackEvent('toggle_follow_user', {
          enabled: false
        });
        return false;
      }

      if (mapRef.current && geolocation.location) {
        hasAutoCenteredRef.current = true;
        flyToLocation(
          mapRef.current,
          geolocation.location.longitude,
          geolocation.location.latitude
        );
      }

      showFollowNotice('Following your location');
      trackEvent('toggle_follow_user', {
        enabled: true
      });
      return true;
    });
  }, [geolocation.location, showFollowNotice]);
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
    if (!followNotice || isFollowNoticeVisible) {
      return;
    }

    clearFollowNoticeTimeoutRef.current = window.setTimeout(() => {
      setFollowNotice(null);
      clearFollowNoticeTimeoutRef.current = null;
    }, 240);

    return () => {
      if (clearFollowNoticeTimeoutRef.current) {
        window.clearTimeout(clearFollowNoticeTimeoutRef.current);
        clearFollowNoticeTimeoutRef.current = null;
      }
    };
  }, [followNotice, isFollowNoticeVisible]);

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
      if (followNoticeTimeoutRef.current) {
        window.clearTimeout(followNoticeTimeoutRef.current);
      }

      if (clearFollowNoticeTimeoutRef.current) {
        window.clearTimeout(clearFollowNoticeTimeoutRef.current);
      }

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

    if (isFollowingUser) {
      map.easeTo({
        center: [location.longitude, location.latitude],
        duration: 600,
        essential: true
      });
      return;
    }

    if (!hasAutoCenteredRef.current) {
      flyToLocation(map, location.longitude, location.latitude);
      hasAutoCenteredRef.current = true;
    }
  }, [geolocation.location, isFollowingUser]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    const stopFollowingOnManualNavigation = (event: { originalEvent?: unknown }) => {
      if (!event.originalEvent) {
        return;
      }

      setIsFollowingUser(false);
    };

    map.on('dragstart', stopFollowingOnManualNavigation);
    map.on('zoomstart', stopFollowingOnManualNavigation);

    return () => {
      map.off('dragstart', stopFollowingOnManualNavigation);
      map.off('zoomstart', stopFollowingOnManualNavigation);
    };
  }, []);

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
        trackEvent('overlay_load_error', {
          overlay_type: 'pcn'
        });
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
        trackEvent('overlay_load_error', {
          overlay_type: 'cycling_path'
        });
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

  useEffect(() => {
    if (!selectedRoute) {
      return;
    }

    trackEvent('select_route', {
      route_id: selectedRoute.routeId,
      route_type: selectedRoute.routeType,
      route_name: selectedRoute.routeName
    });
  }, [selectedRoute]);

  return (
    <main className="relative h-screen overflow-hidden bg-slate-950">
      <MapViewport ref={mapContainerRef} />
      <LocationStatus state={geolocation} />
      {followNotice ? (
        <div className="pointer-events-none absolute inset-x-0 top-24 z-20 flex justify-center px-4">
          <div
            className={`animate-followNoticeIn min-w-[12.5rem] rounded-full border border-white/35 bg-slate-100/90 px-5 py-2 text-center text-sm text-slate-700 shadow-floating backdrop-blur-md transition-all duration-220 ease-out motion-reduce:transition-none ${
              isFollowNoticeVisible
                ? 'translate-y-0 scale-100 opacity-100'
                : '-translate-y-2 scale-95 opacity-0'
            }`}
          >
            {followNotice}
          </div>
        </div>
      ) : null}
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
        <div className="rounded-full border border-white/15 bg-slate-950/55 px-4 py-2 text-sm text-slate-100 shadow-floating backdrop-blur-md">
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
                <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-slate-500">
                  <span
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 rounded-full ${
                      displayedRoute.routeType === 'pcn' ? 'bg-[#2FA66A]' : 'bg-[#BE93D4]'
                    }`}
                  />
                  <span>
                    {displayedRoute.routeType === 'pcn' ? 'Park Connector' : 'Cycling Path'}
                  </span>
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
            <div className="mt-4 border-t border-slate-200/80 pt-3 text-xs text-slate-500">
              <span>By </span>
              <a
                href={authorUrl}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-slate-300 underline-offset-2 transition hover:text-slate-900"
              >
                Hui Shun
              </a>
              <span className="px-2 text-slate-300">•</span>
              <a
                href={repositoryUrl}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-slate-300 underline-offset-2 transition hover:text-slate-900"
              >
                Open source
              </a>
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
        isFollowing={isFollowingUser}
        isRaised={Boolean(displayedRoute)}
        onClick={toggleFollowUser}
      />
    </main>
  );
}
