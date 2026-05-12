import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Marker, Map } from 'maplibre-gl';
import { CenterOnMeButton } from '../components/CenterOnMeButton';
import { CuratedPoiLayer } from '../components/CuratedPoiLayer';
import {
  LayerControlSheet,
  type OverlayControlItem
} from '../components/LayerControlSheet';
import { LocationStatus } from '../components/LocationStatus';
import { MapViewport } from '../components/MapViewport';
import { RouteOverlayLayer } from '../components/RouteOverlayLayer';
import { SelectedRouteCard } from '../components/SelectedRouteCard';
import myMapsOverlaysConfig from '../config/mymaps-overlays.json';
import { useGeolocation } from '../hooks/useGeolocation';
import { trackEvent } from '../services/analytics/googleAnalytics';
import { loadCyclingPathGeoJson } from '../services/cyclingPath/cyclingPathService';
import { loadCuratedRoutesGeoJson } from '../services/curatedRoutes/curatedRoutesService';
import { createMap, createUserLocationMarker, flyToLocation } from '../services/map/mapService';
import { loadPcnGeoJson } from '../services/pcn/pcnService';
import type { CyclingPathGeoJson } from '../types/cyclingPath';
import type { PcnGeoJson } from '../types/pcn';
import type { CuratedRoutesGeoJson } from '../types/curatedRoutes';
import type { UnifiedRouteProperties } from '../types/routes';
import {
  buildCyclingPathRoutes,
  buildMyMapsOverlayLayerViewModels,
  buildPcnRoutes,
  getOverlayContentType,
  getOverlayRouteLayerIds,
  getRoutePresentation,
  isUnifiedRouteFeature,
  loadOverlayData,
  normalizeUnifiedRouteProperties,
  type MyMapsOverlayConfig,
  type MyMapsOverlayLayerViewModel,
  type StaticOverlayViewModel
} from './mapPageOverlayUtils';

const MYMAPS_OVERLAYS = myMapsOverlaysConfig as MyMapsOverlayConfig[];
const OVERLAY_VISIBILITY_STORAGE_KEY = 'cyclesg.curatedOverlayVisibility.v1';
const LAYER_PANEL_MEDIA_QUERY = '(min-width: 640px)';

function readInitialLayerPanelOpen() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }

  return window.matchMedia(LAYER_PANEL_MEDIA_QUERY).matches;
}

function readStoredOverlayVisibility() {
  try {
    const storedValue = window.localStorage.getItem(OVERLAY_VISIBILITY_STORAGE_KEY);

    if (!storedValue) {
      return {};
    }

    const storedVisibility = JSON.parse(storedValue) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(storedVisibility).filter((entry): entry is [string, boolean] => {
        return typeof entry[1] === 'boolean';
      })
    );
  } catch {
    return {};
  }
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
  const [curatedRoutesData, setCuratedRoutesData] = useState<CuratedRoutesGeoJson | null>(null);
  const [pcnError, setPcnError] = useState<string | null>(null);
  const [cyclingPathError, setCyclingPathError] = useState<string | null>(null);
  const [curatedRoutesError, setCuratedRoutesError] = useState<string | null>(null);
  const [overlayLayerVisibility, setOverlayLayerVisibility] = useState(readStoredOverlayVisibility);
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(readInitialLayerPanelOpen);
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
  const pcnRoutes = useMemo(() => buildPcnRoutes(pcnData), [pcnData]);
  const cyclingPathRoutes = useMemo(() => buildCyclingPathRoutes(cyclingPathData), [cyclingPathData]);
  const myMapsOverlayLayerViewModels = useMemo<MyMapsOverlayLayerViewModel[]>(
    () =>
      buildMyMapsOverlayLayerViewModels(curatedRoutesData, MYMAPS_OVERLAYS),
    [curatedRoutesData]
  );
  const officialOverlayViewModels = useMemo<StaticOverlayViewModel[]>(
    () => [
      {
        id: 'official-pcn',
        label: 'PCN',
        routeData: pcnRoutes,
        routeLayerIds: getOverlayRouteLayerIds('official-pcn'),
        palette: {
          routeColor: '#2FA66A',
          selectedColor: '#526072'
        }
      },
      {
        id: 'official-cycling-path',
        label: 'Cycling Path',
        routeData: cyclingPathRoutes,
        routeLayerIds: getOverlayRouteLayerIds('official-cycling-path'),
        palette: {
          routeColor: '#BE93D4',
          selectedColor: '#526072'
        }
      }
    ],
    [cyclingPathRoutes, pcnRoutes]
  );
  const overlayPills = useMemo<OverlayControlItem[]>(
    () => [
      ...officialOverlayViewModels.map((overlayLayer) => ({
        id: overlayLayer.id,
        label: overlayLayer.label,
        contentType: getOverlayContentType({ routeData: overlayLayer.routeData }),
        defaultVisible: true,
        description:
          overlayLayer.id === 'official-pcn'
            ? 'Official NParks park connector routes.'
            : 'Official LTA cycling path routes.',
        indicatorColor:
          typeof overlayLayer.palette.routeColor === 'string'
            ? overlayLayer.palette.routeColor
            : '#CBD5E1',
        activeBackgroundColor:
          overlayLayer.id === 'official-pcn' ? '#DCFCE7' : '#F3E8FF',
        activeTextColor:
          overlayLayer.id === 'official-pcn' ? '#166534' : '#6B21A8'
      })),
      ...myMapsOverlayLayerViewModels.map((overlayLayer) => ({
        id: overlayLayer.id,
        label: overlayLayer.label,
        contentType: getOverlayContentType(overlayLayer),
        defaultVisible: overlayLayer.config.defaultVisible !== false,
        description: `${overlayLayer.config.name} Google My Maps layer.`,
        indicatorColor: overlayLayer.colors.route,
        activeBackgroundColor: overlayLayer.colors.poiHalo,
        activeTextColor: overlayLayer.colors.selected
      }))
    ],
    [myMapsOverlayLayerViewModels, officialOverlayViewModels]
  );
  const isOverlayLayerVisible = useCallback(
    (overlayLayer: { id: string; defaultVisible?: boolean }) => {
      const storedValue = overlayLayerVisibility[overlayLayer.id];

      if (typeof storedValue === 'boolean') {
        return storedValue;
      }

      return overlayLayer.defaultVisible !== false;
    },
    [overlayLayerVisibility]
  );
  const visibleOfficialOverlayViewModels = useMemo(
    () =>
      officialOverlayViewModels.filter((overlayLayer) =>
        isOverlayLayerVisible({ id: overlayLayer.id, defaultVisible: true })
      ),
    [isOverlayLayerVisible, officialOverlayViewModels]
  );
  const visibleMyMapsOverlayLayerViewModels = useMemo(
    () =>
      myMapsOverlayLayerViewModels.filter((overlayLayer) =>
        isOverlayLayerVisible({
          id: overlayLayer.id,
          defaultVisible: overlayLayer.config.defaultVisible !== false
        })
      ),
    [isOverlayLayerVisible, myMapsOverlayLayerViewModels]
  );
  const displayedRoutePresentation = displayedRoute ? getRoutePresentation(displayedRoute) : null;
  const displayedRouteOverlayConfig = useMemo(
    () =>
      displayedRoute?.overlayId
        ? MYMAPS_OVERLAYS.find((overlay) => overlay.id === displayedRoute.overlayId) ?? null
        : null,
    [displayedRoute]
  );

  const toggleOverlayVisibility = useCallback((overlayLayerId: string, defaultVisible: boolean) => {
    setOverlayLayerVisibility((current) => ({
      ...current,
      [overlayLayerId]:
        typeof current[overlayLayerId] === 'boolean'
          ? !current[overlayLayerId]
          : !defaultVisible
    }));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      OVERLAY_VISIBILITY_STORAGE_KEY,
      JSON.stringify(overlayLayerVisibility)
    );
  }, [overlayLayerVisibility]);

  useEffect(() => {
    if (!selectedRoute?.overlayLayerId) {
      return;
    }

    const selectedOverlayPill = overlayPills.find(
      (overlayLayer) => overlayLayer.id === selectedRoute.overlayLayerId
    );

    if (!selectedOverlayPill || isOverlayLayerVisible(selectedOverlayPill)) {
      return;
    }

    setSelectedRoute(null);
  }, [isOverlayLayerVisible, overlayPills, selectedRoute]);

  useEffect(() => {
    if (!displayedRoute) {
      return;
    }

    setIsLayerPanelOpen(false);
  }, [displayedRoute]);

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
    return loadOverlayData(
      loadPcnGeoJson,
      (data) => {
        setPcnData(data);
        setPcnError(null);
      },
      () => {
        setPcnError('Unable to load Park Connector overlays.');
        trackEvent('overlay_load_error', {
          overlay_type: 'pcn'
        });
      }
    );
  }, []);

  useEffect(() => {
    return loadOverlayData(
      loadCyclingPathGeoJson,
      (data) => {
        setCyclingPathData(data);
        setCyclingPathError(null);
      },
      () => {
        setCyclingPathError('Unable to load cycling path overlays.');
        trackEvent('overlay_load_error', {
          overlay_type: 'cycling_path'
        });
      }
    );
  }, []);

  useEffect(() => {
    return loadOverlayData(
      loadCuratedRoutesGeoJson,
      (data) => {
        setCuratedRoutesData(data);
        setCuratedRoutesError(null);
      },
      () => {
        setCuratedRoutesError('Unable to load curated route overlays.');
        trackEvent('overlay_load_error', {
          overlay_type: 'curated_routes'
        });
      }
    );
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

  useEffect(() => {
    if (!mapReady) {
      return;
    }

    const map = mapRef.current;

    if (!map) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const orderedLayerIds = [
        ...visibleOfficialOverlayViewModels.flatMap((overlayLayer) => [
          overlayLayer.routeLayerIds.route,
          overlayLayer.routeLayerIds.hitArea,
          overlayLayer.routeLayerIds.selected
        ]),
        ...visibleMyMapsOverlayLayerViewModels.flatMap((overlayLayer) => [
          overlayLayer.routeLayerIds.route,
          overlayLayer.routeLayerIds.hitArea,
          overlayLayer.routeLayerIds.selected,
          overlayLayer.poiLayerIds.circle,
          overlayLayer.poiLayerIds.label
        ])
      ];

      for (const layerId of orderedLayerIds) {
        if (map.getLayer(layerId)) {
          map.moveLayer(layerId);
        }
      }
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [mapReady, visibleMyMapsOverlayLayerViewModels, visibleOfficialOverlayViewModels]);

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
      {mapReady
        ? visibleOfficialOverlayViewModels.map((overlayLayer) =>
          overlayLayer.routeData ? (
            <RouteOverlayLayer
              key={overlayLayer.id}
              data={overlayLayer.routeData}
              ids={overlayLayer.routeLayerIds}
              isFeature={isUnifiedRouteFeature}
              map={mapRef.current}
              normalizeProperties={normalizeUnifiedRouteProperties}
              objectIdKey="routeId"
              onClearSelection={clearSelectedRoute}
              onSelect={setSelectedRoute}
              palette={overlayLayer.palette}
              selectedObjectId={selectedRoute?.routeId ?? null}
            />
          ) : null
        )
        : null}
      {mapReady
        ? visibleMyMapsOverlayLayerViewModels.map((overlayLayer) => (
          <Fragment key={overlayLayer.id}>
            {overlayLayer.routeData ? (
              <RouteOverlayLayer
                data={overlayLayer.routeData}
                ids={overlayLayer.routeLayerIds}
                isFeature={isUnifiedRouteFeature}
                map={mapRef.current}
              normalizeProperties={normalizeUnifiedRouteProperties}
              objectIdKey="routeId"
              onClearSelection={clearSelectedRoute}
              onSelect={setSelectedRoute}
              palette={{
                routeColor: overlayLayer.colors.route,
                selectedColor: overlayLayer.colors.selected
              }}
              selectedObjectId={selectedRoute?.routeId ?? null}
            />
          ) : null}
            {overlayLayer.poiData ? (
              <CuratedPoiLayer
                data={overlayLayer.poiData}
                ids={overlayLayer.poiLayerIds}
                map={mapRef.current}
                palette={{
                  circleColor: overlayLayer.colors.poi,
                  textColor: overlayLayer.colors.poiText,
                  textHaloColor: overlayLayer.colors.poiHalo
                }}
              />
            ) : null}
          </Fragment>
        ))
        : null}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start p-4">
        <div className="rounded-[22px] border border-white/15 bg-slate-950/55 px-4 py-3 text-sm text-slate-100 shadow-floating backdrop-blur-md">
          <div>CycleSG</div>
        </div>
      </div>

      {!displayedRoute ? (
        <LayerControlSheet
          items={overlayPills}
          isOpen={isLayerPanelOpen}
          isVisible={isOverlayLayerVisible}
          onClose={() => setIsLayerPanelOpen(false)}
          onOpen={() => setIsLayerPanelOpen(true)}
          onToggle={toggleOverlayVisibility}
        />
      ) : null}

      <SelectedRouteCard
        authorUrl={authorUrl}
        attribution={displayedRouteOverlayConfig?.attribution ?? null}
        isVisible={isRouteCardVisible}
        onClose={() => setSelectedRoute(null)}
        presentation={displayedRoutePresentation}
        repositoryUrl={repositoryUrl}
        route={displayedRoute}
      />

      {pcnError || cyclingPathError || curatedRoutesError ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-4">
          <div className="rounded-full border border-rose-200/70 bg-white/90 px-4 py-2 text-xs text-rose-700 shadow-floating backdrop-blur-md">
            {[pcnError, cyclingPathError, curatedRoutesError].filter(Boolean).join(' ')}
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
