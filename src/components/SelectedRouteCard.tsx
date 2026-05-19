import { useEffect, useState } from 'react';
import type { UnifiedRouteProperties } from '../types/routes';
import { CommentsSection } from './comments/CommentsSection';
import {
  DESKTOP_PANEL_TRANSITION_MS,
  MOBILE_SHEET_TRANSITION_MS,
  useResponsiveSheet
} from './useResponsiveSheet';

interface SelectedRouteCardProps {
  authorUrl: string;
  attribution?: {
    message?: string;
    sourceLabel?: string;
    sourceUrl?: string;
  } | null;
  isVisible: boolean;
  onClose: () => void;
  presentation: {
    color?: string;
    colorClass: string;
    label: string;
  } | null;
  repositoryUrl: string;
  route: UnifiedRouteProperties | null;
}

interface ActiveRouteState {
  attribution?: SelectedRouteCardProps['attribution'];
  presentation: SelectedRouteCardProps['presentation'];
  route: UnifiedRouteProperties;
}

export function SelectedRouteCard({
  authorUrl,
  attribution,
  isVisible,
  onClose,
  presentation,
  repositoryUrl,
  route
}: SelectedRouteCardProps) {
  const isOpen = isVisible && Boolean(route);
  const {
    beginSheetDrag,
    contentScrollRef,
    handleContentTouchEnd,
    handleContentTouchMove,
    handleContentTouchStart,
    isDesktop,
    isDesktopPanelRendered,
    isDesktopPanelVisible,
    isDraggingSheet,
    isMobileSheetRendered,
    isMobileSheetVisible,
    mobileSheetHeight,
    mobileSheetPosition,
    mobileSheetRef,
    snapSheetTo
  } = useResponsiveSheet({ isOpen, onClose });
  const [activeRouteState, setActiveRouteState] = useState<ActiveRouteState | null>(
    route
      ? {
          attribution,
          presentation,
          route
        }
      : null
  );

  useEffect(() => {
    if (!route) {
      return;
    }

    setActiveRouteState({
      attribution,
      presentation,
      route
    });
  }, [attribution, presentation, route]);

  useEffect(() => {
    if (isOpen || isDesktopPanelRendered || isMobileSheetRendered) {
      return;
    }

    setActiveRouteState(null);
  }, [isDesktopPanelRendered, isMobileSheetRendered, isOpen]);

  const displayedRoute = activeRouteState?.route ?? null;
  const displayedAttribution = activeRouteState?.attribution ?? null;
  const displayedPresentation = activeRouteState?.presentation ?? null;

  if (!displayedRoute) {
    return null;
  }

  const formattedRouteLength =
    displayedRoute.routeLength === null
      ? null
      : displayedRoute.routeLength >= 1000
        ? `${Number((displayedRoute.routeLength / 1000).toFixed(displayedRoute.routeLength % 1000 === 0 ? 0 : 1))}km mapped length`
        : `${Math.round(displayedRoute.routeLength)}m mapped length`;

  const isPoi = displayedRoute.routeType === 'curated-poi';
  const isCuratedOverlay =
    displayedRoute.routeSource === 'curated-my-maps' || displayedRoute.routeType === 'curated-poi';
  const details = [
    `${isPoi ? 'POI' : 'Segment'} ID ${displayedRoute.routeId}`,
    isPoi ? null : formattedRouteLength ?? 'Length unavailable',
    isCuratedOverlay ? null : displayedRoute.layerName,
    isCuratedOverlay ? null : displayedRoute.overlayName
  ].filter((detail): detail is string => Boolean(detail));
  const shouldShowDesktopPanel = isDesktop && isDesktopPanelRendered;
  const shouldShowMobilePanel = !isDesktop && isMobileSheetRendered;

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-slate-500">
            <span
              aria-hidden="true"
              className={`h-2.5 w-2.5 rounded-full ${displayedPresentation?.colorClass ?? 'bg-slate-400'}`}
              style={displayedPresentation?.color ? { backgroundColor: displayedPresentation.color } : undefined}
            />
            <span>{displayedPresentation?.label ?? 'Route'}</span>
          </p>
          <h2 className="mt-1 text-base font-semibold text-slate-900">
            {displayedRoute.routeName}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close selected route details"
          className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500"
        >
          <span className="text-lg leading-none">×</span>
        </button>
      </div>
      <p className="mt-2 text-sm text-slate-600">{displayedRoute.routeGroup}</p>
      {displayedRoute.description ? (
        <p className="mt-2 text-sm text-slate-600">{displayedRoute.description}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {details.map((detail, index) => (
          <span key={detail} className="contents">
            {index > 0 ? (
              <span className="h-1 w-1 rounded-full bg-slate-300" />
            ) : null}
            <span>{detail}</span>
          </span>
        ))}
      </div>
      {displayedRoute.routeSource === 'curated-my-maps' && displayedAttribution ? (
        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {displayedAttribution.message ? <span>{displayedAttribution.message} </span> : null}
          {displayedAttribution.sourceUrl ? (
            <a
              href={displayedAttribution.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-amber-300 underline-offset-2 transition hover:text-amber-950"
            >
              {displayedAttribution.sourceLabel ?? 'Source'}
            </a>
          ) : null}
        </div>
      ) : null}
      <CommentsSection key={displayedRoute.routeId} routeId={displayedRoute.routeId} />
    </>
  );

  return (
    <>
      {shouldShowDesktopPanel ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-4 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none sm:inset-x-auto sm:bottom-4 sm:left-4 sm:top-20 sm:flex sm:w-[22rem] sm:max-w-[22rem] sm:p-0">
          <div
            className={`pointer-events-auto mx-auto flex max-w-md flex-col overflow-hidden rounded-[28px] border border-slate-900/10 bg-white/90 text-slate-700 shadow-floating backdrop-blur-md will-change-transform transition-[transform,opacity] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] sm:mx-0 sm:h-full sm:w-full sm:max-w-none sm:border-slate-200/80 ${
              isDesktopPanelVisible
                ? 'translate-x-0 opacity-100'
                : '-translate-x-4 opacity-0'
            }`}
            style={{ transitionDuration: `${DESKTOP_PANEL_TRANSITION_MS}ms` }}
          >
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {content}
            </div>
          </div>
        </div>
      ) : null}

      {shouldShowMobilePanel ? (
        <div className="pointer-events-none absolute inset-0 z-20">
          <div className="absolute inset-x-0 bottom-6 px-4 pb-4 sm:bottom-0">
            <div
              ref={mobileSheetRef}
              className={`pointer-events-auto mx-auto flex w-full max-w-[32rem] flex-col overflow-hidden rounded-[28px] border border-slate-900/10 bg-white/90 text-slate-700 shadow-floating backdrop-blur-md will-change-transform transition-[height,transform,opacity] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] ${
                isMobileSheetVisible
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-10 opacity-0'
              }`}
              onClick={(event) => {
                if (mobileSheetPosition !== 'minimized' || isDraggingSheet) {
                  return;
                }

                if (
                  event.target instanceof Element &&
                  event.target.closest('button, a, input, select, textarea, label')
                ) {
                  return;
                }

                snapSheetTo('mid');
              }}
              style={{
                height: `${mobileSheetHeight}px`,
                transitionDuration: isDraggingSheet ? '0ms' : `${MOBILE_SHEET_TRANSITION_MS}ms`
              }}
            >
              <div
                className="flex cursor-ns-resize justify-center px-4 pb-1 pt-3 touch-none"
                onPointerDown={(event) => {
                  beginSheetDrag(event.pointerId, event.clientY);
                }}
              >
                <span className="h-1.5 w-12 rounded-full bg-slate-300" aria-hidden="true" />
              </div>
              <div
                ref={contentScrollRef}
                className="min-h-0 flex-1 overflow-y-auto p-4"
                onTouchEnd={handleContentTouchEnd}
                onTouchMove={handleContentTouchMove}
                onTouchStart={handleContentTouchStart}
              >
                {content}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
