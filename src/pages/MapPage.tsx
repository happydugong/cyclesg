import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Marker, Map as MapLibreMap } from 'maplibre-gl';
import { CuratedPoiLayer } from '../components/CuratedPoiLayer';
import { FloatingControlDock } from '../components/FloatingControlDock';
import {
  LayerControlSheet,
  type OverlayControlItem
} from '../components/LayerControlSheet';
import { LocationStatus } from '../components/LocationStatus';
import { MapViewport } from '../components/MapViewport';
import { PreferencesSheet } from '../components/PreferencesSheet';
import { RouteOverlayLayer } from '../components/RouteOverlayLayer';
import { SearchLocationBar } from '../components/SearchLocationBar';
import { SearchMarkerOffscreenIndicator } from '../components/SearchMarkerOffscreenIndicator';
import { SelectedRouteCard } from '../components/SelectedRouteCard';
import {
  readIsDesktopViewport,
  useIsDesktopViewport
} from '../components/useIsDesktopViewport';
import {
  OVERLAY_SOURCES,
  isCuratedFileOverlaySource,
  isDataGovOverlaySource,
  loadOverlaySourceGeoJson,
  type OverlaySourceConfig,
  type OverlaySourceGeoJson
} from '../config/overlaySources';
import { useLocationSearch } from '../hooks/useLocationSearch';
import { useMapLongPressPin } from '../hooks/useMapLongPressPin';
import { useSearchMarker } from '../hooks/useSearchMarker';
import { useGeolocation } from '../hooks/useGeolocation';
import { trackEvent } from '../services/analytics/googleAnalytics';
import { createMap, createUserLocationMarker, flyToLocation } from '../services/map/mapService';
import {
  CONTROL_DOCK_PLACEMENT_OPTIONS,
  readStoredAppPreferences,
  writeStoredAppPreferences
} from '../services/preferences/preferences';
import type { LocationSearchResult } from '../services/locationSearch/nominatimService';
import type { OverlayPoiProperties } from '../types/curatedRoutes';
import type { UnifiedRouteProperties } from '../types/routes';
import {
  buildOverlayLayerViewModels,
  getOverlayContentType,
  getRoutePresentation,
  isUnifiedRouteFeature,
  normalizePoiProperties,
  normalizeUnifiedRouteProperties,
  type OverlayLayerViewModel,
  type OverlaySourceRuntimeState
} from './mapPageOverlayUtils';

const OVERLAY_VISIBILITY_STORAGE_KEY = 'cyclesg.curatedOverlayVisibility.v1';

interface OverlaySourceState extends OverlaySourceRuntimeState {
  error: string | null;
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

function getOverlayLoadErrorMessage(source: OverlaySourceConfig) {
  switch (source.featureAdapter) {
    case 'pcn':
      return 'Unable to load Park Connector overlays.';
    case 'cycling-path':
      return 'Unable to load cycling path overlays.';
    case 'rail-station':
      return 'Unable to load MRT/LRT station overlays.';
    case 'my-maps':
    case 'strava-gpx':
      return 'Unable to load curated route overlays.';
  }
}

function getOverlaySection(source: OverlaySourceConfig, contentType: ReturnType<typeof getOverlayContentType>) {
  if (isDataGovOverlaySource(source)) {
    return 'official-routes' as const;
  }

  if (contentType === 'poi') {
    return 'pois' as const;
  }

  if (contentType !== 'route') {
    return 'others' as const;
  }

  if (source.sourceKind === 'google-my-maps') {
    return 'compiled-routes' as const;
  }

  if (isCuratedFileOverlaySource(source)) {
    return 'themed-routes' as const;
  }

  return 'others' as const;
}

function createInitialOverlayStates(): OverlaySourceState[] {
  return OVERLAY_SOURCES.map((source) => ({
    sourceId: source.id,
    data: null,
    error: null
  }));
}

function updateOverlayState(
  overlayStates: OverlaySourceState[],
  sourceId: string,
  patch: Partial<OverlaySourceState>
) {
  return overlayStates.map((overlayState) =>
    overlayState.sourceId === sourceId ? { ...overlayState, ...patch } : overlayState
  );
}

export function MapPage() {
  const authorUrl = 'https://happydugong.github.io/';
  const repositoryUrl = 'https://github.com/happydugong/cyclesg';
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const userMarkerRef = useRef<Marker | null>(null);
  const hasAutoCenteredRef = useRef(false);
  const geolocation = useGeolocation();
  const locationSearch = useLocationSearch();
  const isDesktopViewport = useIsDesktopViewport();
  const [preferences, setPreferences] = useState(readStoredAppPreferences);
  const [mapReady, setMapReady] = useState(false);
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [followNotice, setFollowNotice] = useState<string | null>(null);
  const [isFollowNoticeVisible, setIsFollowNoticeVisible] = useState(false);
  const [overlayStates, setOverlayStates] = useState(createInitialOverlayStates);
  const [overlayLayerVisibility, setOverlayLayerVisibility] = useState(readStoredOverlayVisibility);
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(readIsDesktopViewport);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<UnifiedRouteProperties | null>(null);
  const [displayedRoute, setDisplayedRoute] = useState<UnifiedRouteProperties | null>(null);
  const [isRouteCardVisible, setIsRouteCardVisible] = useState(false);
  const followNoticeTimeoutRef = useRef<number | null>(null);
  const clearFollowNoticeTimeoutRef = useRef<number | null>(null);
  const {
    clearSearchMarker,
    focusSearchResult,
    placeSearchMarker,
    searchMarkerLocation
  } = useSearchMarker(mapRef.current);
  const {
    clearSelection: clearSearchSelection,
    close: closeSearch,
    selectResult: selectSearchResult
  } = locationSearch;

  const clearSelectedRoute = useCallback(() => {
    setSelectedRoute(null);
  }, []);

  const selectCuratedPoi = useCallback(
    (
      properties: OverlayPoiProperties,
      overlayLayerId: string
    ) => {
      setSelectedRoute(normalizePoiProperties(properties, overlayLayerId));
    },
    []
  );

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

  const overlayLayerViewModels = useMemo<OverlayLayerViewModel[]>(
    () => buildOverlayLayerViewModels(OVERLAY_SOURCES, overlayStates),
    [overlayStates]
  );

  const overlayPills = useMemo<OverlayControlItem[]>(
    () =>
      overlayLayerViewModels.map((overlayLayer) => ({
        id: overlayLayer.id,
        label: overlayLayer.label,
        contentType: getOverlayContentType(overlayLayer),
        section: getOverlaySection(overlayLayer.source, getOverlayContentType(overlayLayer)),
        defaultVisible: overlayLayer.defaultVisible,
        description: overlayLayer.description,
        indicatorColor:
          typeof overlayLayer.palette.routeColor === 'string'
            ? overlayLayer.palette.routeColor
            : '#CBD5E1',
        activeBackgroundColor: overlayLayer.activeBackgroundColor,
        activeTextColor: overlayLayer.activeTextColor
      })),
    [overlayLayerViewModels]
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

  const visibleOverlayLayerViewModels = useMemo(
    () =>
      overlayLayerViewModels.filter((overlayLayer) =>
        isOverlayLayerVisible({
          id: overlayLayer.id,
          defaultVisible: overlayLayer.defaultVisible
        })
      ),
    [isOverlayLayerVisible, overlayLayerViewModels]
  );

  const displayedOverlayLayer = useMemo(
    () =>
      displayedRoute?.overlayLayerId
        ? overlayLayerViewModels.find((overlayLayer) => overlayLayer.id === displayedRoute.overlayLayerId) ?? null
        : null,
    [displayedRoute, overlayLayerViewModels]
  );

  const displayedRoutePresentation = useMemo(() => {
    if (!displayedRoute) {
      return null;
    }

    const presentation = getRoutePresentation(displayedRoute);

    if (!displayedOverlayLayer) {
      return presentation;
    }

    const color =
      displayedRoute.routeType === 'curated-poi'
        ? displayedOverlayLayer.palette.poiColor
        : displayedOverlayLayer.palette.routeColor;

    return {
      ...presentation,
      color: typeof color === 'string' ? color : undefined
    };
  }, [displayedOverlayLayer, displayedRoute]);

  const overlayErrors = useMemo(
    () =>
      Array.from(
        new Set(
          overlayStates
            .map((overlayState) => overlayState.error)
            .filter((error): error is string => Boolean(error))
        )
      ),
    [overlayStates]
  );
  const isLayerSheetVisible = isLayerPanelOpen && overlayPills.length > 0;
  const shouldHideDock =
    !isDesktopViewport && (isLayerSheetVisible || isPreferencesOpen || Boolean(displayedRoute));

  const toggleOverlayVisibility = useCallback((overlayLayerId: string, defaultVisible: boolean) => {
    setOverlayLayerVisibility((current) => ({
      ...current,
      [overlayLayerId]:
        typeof current[overlayLayerId] === 'boolean'
          ? !current[overlayLayerId]
          : !defaultVisible
    }));
  }, []);

  const openLayerPanel = useCallback(() => {
    setSelectedRoute(null);
    setIsPreferencesOpen(false);
    setIsLayerPanelOpen(true);
  }, []);

  const openPreferencesPanel = useCallback(() => {
    setSelectedRoute(null);
    setIsLayerPanelOpen(false);
    setIsPreferencesOpen(true);
  }, []);

  const toggleLayerPanel = useCallback(() => {
    if (isLayerPanelOpen) {
      setIsLayerPanelOpen(false);
      return;
    }

    openLayerPanel();
  }, [isLayerPanelOpen, openLayerPanel]);

  const togglePreferencesPanel = useCallback(() => {
    if (isPreferencesOpen) {
      setIsPreferencesOpen(false);
      return;
    }

    openPreferencesPanel();
  }, [isPreferencesOpen, openPreferencesPanel]);

  const toggleSearchVisibility = useCallback(() => {
    setIsSearchVisible((current) => {
      if (current && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      if (current) {
        closeSearch();
      }

      return !current;
    });
  }, [closeSearch]);

  const removeSearchPin = useCallback(() => {
    clearSearchMarker();
    clearSearchSelection();
  }, [clearSearchMarker, clearSearchSelection]);

  const dropPinAtMapLocation = useCallback(
    (longitude: number, latitude: number) => {
      setSelectedRoute(null);
      setIsFollowingUser(false);
      clearSearchSelection();
      placeSearchMarker({ longitude, latitude });
    },
    [clearSearchSelection, placeSearchMarker]
  );

  const selectSearchLocation = useCallback((result: LocationSearchResult) => {
    setSelectedRoute(null);
    setIsFollowingUser(false);
    focusSearchResult(result);
    selectSearchResult(result);

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [focusSearchResult, selectSearchResult]);

  useEffect(() => {
    window.localStorage.setItem(
      OVERLAY_VISIBILITY_STORAGE_KEY,
      JSON.stringify(overlayLayerVisibility)
    );
  }, [overlayLayerVisibility]);

  useEffect(() => {
    writeStoredAppPreferences(preferences);
  }, [preferences]);

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
    setIsPreferencesOpen(false);
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
      const userMarker = createUserLocationMarker();
      userMarkerRef.current = userMarker;
      userMarker.setLngLat([location.longitude, location.latitude]).addTo(map);
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

  useMapLongPressPin({
    map: mapReady ? mapRef.current : null,
    onLongPress: dropPinAtMapLocation
  });

  useEffect(() => {
    let active = true;
    const dataCache = new globalThis.Map<string, Promise<OverlaySourceGeoJson>>();

    for (const source of OVERLAY_SOURCES) {
      let loader = dataCache.get(source.asset.geoJson);

      if (!loader) {
        loader = loadOverlaySourceGeoJson(source);
        dataCache.set(source.asset.geoJson, loader);
      }

      void loader
        .then((data) => {
          if (!active) {
            return;
          }

          setOverlayStates((current) =>
            updateOverlayState(current, source.id, {
              data,
              error: null
            })
          );
        })
        .catch(() => {
          if (!active) {
            return;
          }

          setOverlayStates((current) =>
            updateOverlayState(current, source.id, {
              error: getOverlayLoadErrorMessage(source)
            })
          );
          trackEvent('overlay_load_error', {
            overlay_type: source.id
          });
        });
    }

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

  useEffect(() => {
    if (!mapReady) {
      return;
    }

    const map = mapRef.current;

    if (!map) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const orderedRouteLayerIds = visibleOverlayLayerViewModels.flatMap((overlayLayer) =>
        overlayLayer.routeData
          ? [
              overlayLayer.routeLayerIds.route,
              overlayLayer.routeLayerIds.hitArea,
              overlayLayer.routeLayerIds.selected
            ]
          : []
      );
      const orderedPoiLayerIds = visibleOverlayLayerViewModels.flatMap((overlayLayer) =>
        overlayLayer.poiData
          ? [
              overlayLayer.poiLayerIds.circle,
              overlayLayer.poiLayerIds.icon,
              overlayLayer.poiLayerIds.label
            ]
          : []
      );
      const orderedLayerIds = [...orderedRouteLayerIds, ...orderedPoiLayerIds];

      for (const layerId of orderedLayerIds) {
        if (map.getLayer(layerId)) {
          map.moveLayer(layerId);
        }
      }
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [mapReady, visibleOverlayLayerViewModels]);

  return (
    <main className="relative h-screen overflow-hidden bg-slate-950">
      <MapViewport ref={mapContainerRef} />
      {preferences.showOffscreenMarkerIndicator ? (
        <SearchMarkerOffscreenIndicator map={mapRef.current} target={searchMarkerLocation} />
      ) : null}
      <SearchLocationBar
        isVisible={isSearchVisible}
        onSelect={selectSearchLocation}
        search={locationSearch}
      />
      <LocationStatus state={geolocation} />
      {followNotice ? (
        <div className="mobile-safe-top mobile-safe-x pointer-events-none absolute inset-x-0 top-[5.5rem] z-20 flex justify-center">
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
        ? visibleOverlayLayerViewModels.map((overlayLayer) => (
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
                    routeColor: overlayLayer.palette.routeColor,
                    selectedColor: overlayLayer.palette.selectedColor
                  }}
                  selectedObjectId={selectedRoute?.routeId ?? null}
                />
              ) : null}
              {overlayLayer.poiData ? (
                <CuratedPoiLayer
                  data={overlayLayer.poiData}
                  ids={overlayLayer.poiLayerIds}
                  map={mapRef.current}
                  onClearSelection={clearSelectedRoute}
                  onSelect={(properties) => {
                    selectCuratedPoi(properties, overlayLayer.id);
                  }}
                  palette={{
                    circleColor: overlayLayer.palette.poiColor ?? overlayLayer.source.presentation.routeColor,
                    iconScale: overlayLayer.palette.iconScale,
                    textColor: overlayLayer.palette.poiTextColor ?? overlayLayer.source.presentation.activeTextColor,
                    textHaloColor:
                      overlayLayer.palette.poiHaloColor ?? overlayLayer.source.presentation.activeBackgroundColor
                  }}
                />
              ) : null}
            </Fragment>
          ))
        : null}

      <LayerControlSheet
        items={overlayPills}
        isOpen={isLayerPanelOpen}
        isVisible={isOverlayLayerVisible}
        onClose={() => setIsLayerPanelOpen(false)}
        onToggle={toggleOverlayVisibility}
      />

      <PreferencesSheet
        isOpen={isPreferencesOpen}
        options={CONTROL_DOCK_PLACEMENT_OPTIONS}
        placement={preferences.controlDockPlacement}
        showOffscreenMarkerIndicator={preferences.showOffscreenMarkerIndicator}
        onClose={() => setIsPreferencesOpen(false)}
        onPlacementChange={(controlDockPlacement) => {
          setPreferences((current) => ({
            ...current,
            controlDockPlacement
          }));
        }}
        onShowOffscreenMarkerIndicatorChange={(showOffscreenMarkerIndicator) => {
          setPreferences((current) => ({
            ...current,
            showOffscreenMarkerIndicator
          }));
        }}
      />

      {!shouldHideDock ? (
        <FloatingControlDock
          hasSearchMarker={Boolean(searchMarkerLocation)}
          isFollowing={isFollowingUser}
          isLayerPanelOpen={isLayerPanelOpen}
          isPreferencesOpen={isPreferencesOpen}
          isSearchVisible={isSearchVisible}
          locationDisabled={!geolocation.location}
          onLayerClick={toggleLayerPanel}
          onLocationClick={toggleFollowUser}
          onPreferencesClick={togglePreferencesPanel}
          onRemovePinClick={removeSearchPin}
          onSearchToggleClick={toggleSearchVisibility}
          placement={preferences.controlDockPlacement}
        />
      ) : null}

      <SelectedRouteCard
        authorUrl={authorUrl}
        attribution={displayedOverlayLayer?.source.attribution ?? null}
        isVisible={isRouteCardVisible}
        onClose={() => setSelectedRoute(null)}
        presentation={displayedRoutePresentation}
        repositoryUrl={repositoryUrl}
        route={displayedRoute}
      />

      {overlayErrors.length > 0 ? (
        <div className="mobile-safe-bottom mobile-safe-x pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center">
          <div className="rounded-full border border-rose-200/70 bg-white/90 px-4 py-2 text-xs text-rose-700 shadow-floating backdrop-blur-md">
            {overlayErrors.join(' ')}
          </div>
        </div>
      ) : null}

    </main>
  );
}
