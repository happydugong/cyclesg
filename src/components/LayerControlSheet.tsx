import { useEffect, useRef, useState } from 'react';
import { LayerControlSheetContent } from './LayerControlSheetContent';

export type OverlayContentType = 'route' | 'poi' | 'route-poi';

export interface OverlayControlItem {
  id: string;
  label: string;
  contentType: OverlayContentType;
  defaultVisible: boolean;
  description: string;
  indicatorColor: string;
  activeBackgroundColor: string;
  activeTextColor: string;
}

const MOBILE_SHEET_DEFAULT_RATIO = 0.42;
const MOBILE_SHEET_MAX_RATIO = 0.8;
const MOBILE_SHEET_CLOSE_THRESHOLD = 170;
const MOBILE_SHEET_TRANSITION_MS = 320;
const DESKTOP_PANEL_TRANSITION_MS = 220;
const DESKTOP_MEDIA_QUERY = '(min-width: 640px)';

function getDefaultMobileSheetHeight() {
  if (typeof window === 'undefined') {
    return 360;
  }

  return Math.round(window.innerHeight * MOBILE_SHEET_DEFAULT_RATIO);
}

interface LayerControlSheetProps {
  items: OverlayControlItem[];
  isOpen: boolean;
  isVisible: (item: OverlayControlItem) => boolean;
  onClose: () => void;
  onOpen: () => void;
  onToggle: (id: string, defaultVisible: boolean) => void;
}

export function LayerControlSheet({
  items,
  isOpen,
  isVisible,
  onClose,
  onOpen,
  onToggle
}: LayerControlSheetProps) {
  if (items.length === 0) {
    return null;
  }

  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return true;
    }

    return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
  });
  const [mobileSheetHeight, setMobileSheetHeight] = useState(getDefaultMobileSheetHeight);
  const [isDesktopPanelRendered, setIsDesktopPanelRendered] = useState(isOpen);
  const [isDesktopPanelVisible, setIsDesktopPanelVisible] = useState(isOpen);
  const [isMobileSheetRendered, setIsMobileSheetRendered] = useState(isOpen);
  const [isMobileSheetVisible, setIsMobileSheetVisible] = useState(isOpen);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);
  const dragStateRef = useRef<{
    pointerId: number;
    active: boolean;
    shouldClose: boolean;
  } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };

    setIsDesktop(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!isDesktop) {
      setIsDesktopPanelRendered(false);
      setIsDesktopPanelVisible(false);
      return;
    }

    if (isOpen) {
      setIsDesktopPanelRendered(true);
      setIsDesktopPanelVisible(false);

      let frameId = 0;
      let nestedFrameId = 0;
      frameId = window.requestAnimationFrame(() => {
        nestedFrameId = window.requestAnimationFrame(() => {
          setIsDesktopPanelVisible(true);
        });
      });

      return () => {
        window.cancelAnimationFrame(frameId);
        window.cancelAnimationFrame(nestedFrameId);
      };
    }

    setIsDesktopPanelVisible(false);

    const timeoutId = window.setTimeout(() => {
      setIsDesktopPanelRendered(false);
    }, DESKTOP_PANEL_TRANSITION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isDesktop, isOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (isDesktop) {
      setIsMobileSheetRendered(false);
      setIsMobileSheetVisible(false);
      return;
    }

    if (isOpen) {
      setMobileSheetHeight(getDefaultMobileSheetHeight());
      setIsMobileSheetRendered(true);
      setIsMobileSheetVisible(false);

      let frameId = 0;
      let nestedFrameId = 0;
      frameId = window.requestAnimationFrame(() => {
        nestedFrameId = window.requestAnimationFrame(() => {
          setIsMobileSheetVisible(true);
        });
      });

      return () => {
        window.cancelAnimationFrame(frameId);
        window.cancelAnimationFrame(nestedFrameId);
      };
    }

    setIsMobileSheetVisible(false);

    const timeoutId = window.setTimeout(() => {
      setIsMobileSheetRendered(false);
    }, MOBILE_SHEET_TRANSITION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isDesktop, isOpen]);

  useEffect(() => {
    if (!isOpen || isDesktop) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!dragStateRef.current?.active) {
        return;
      }

      const maxHeight = window.innerHeight * MOBILE_SHEET_MAX_RATIO;
      const rawHeight = window.innerHeight - event.clientY - 16;
      const shouldClose = rawHeight < MOBILE_SHEET_CLOSE_THRESHOLD;
      const nextHeight = Math.min(maxHeight, Math.max(120, rawHeight));

      if (dragStateRef.current) {
        dragStateRef.current.shouldClose = shouldClose;
      }

      setMobileSheetHeight(Math.round(nextHeight));
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (dragStateRef.current?.pointerId !== event.pointerId) {
        return;
      }

      if (dragStateRef.current.shouldClose) {
        onClose();
      }

      setIsDraggingSheet(false);
      dragStateRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      setIsDraggingSheet(false);
      dragStateRef.current = null;
    };
  }, [isDesktop, isOpen, onClose]);

  const shouldShowDesktopTrigger = isDesktop && !isOpen;
  const shouldShowDesktopPanel = isDesktop && isDesktopPanelRendered;
  const shouldShowMobileTrigger = !isDesktop && !isMobileSheetRendered;
  const shouldShowMobilePanel = !isDesktop && isMobileSheetRendered;

  return (
    <>
      {shouldShowDesktopTrigger ? (
        <div className="pointer-events-none absolute left-4 top-20 z-10">
          <button
            type="button"
            onClick={onOpen}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/70 px-4 py-2 text-sm text-slate-100 shadow-floating backdrop-blur-md"
            aria-label="Open map layers"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-slate-100/90" aria-hidden="true" />
            <span>Layers</span>
          </button>
        </div>
      ) : null}

      {shouldShowMobileTrigger ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pb-4">
          <div className="pointer-events-auto mx-auto flex max-w-[20rem] justify-center">
            <button
              type="button"
              onClick={onOpen}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/70 px-4 py-2 text-sm text-slate-100 shadow-floating backdrop-blur-md"
              aria-label="Open map layers"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-slate-100/90" aria-hidden="true" />
              <span>Layers</span>
            </button>
          </div>
        </div>
      ) : null}

      {shouldShowDesktopPanel ? (
        <div className="pointer-events-none absolute left-4 top-20 bottom-4 z-10">
          <div
            className={`pointer-events-auto flex h-full w-[22rem] max-w-[22rem] flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 text-slate-900 shadow-floating backdrop-blur-md will-change-transform transition-[transform,opacity] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] ${
              isDesktopPanelVisible
                ? 'translate-x-0 opacity-100'
                : '-translate-x-4 opacity-0'
            }`}
            style={{ transitionDuration: `${DESKTOP_PANEL_TRANSITION_MS}ms` }}
          >
            <LayerControlSheetContent
              items={items}
              isVisible={isVisible}
              onClose={onClose}
              onToggle={onToggle}
            />
          </div>
        </div>
      ) : null}

      {shouldShowMobilePanel ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pb-4">
            <div
              className={`pointer-events-auto mx-auto flex w-full max-w-[32rem] flex-col overflow-hidden rounded-[28px] border border-white/15 bg-slate-950/70 text-slate-100 shadow-floating backdrop-blur-md will-change-transform transition-[transform,opacity] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] ${
                isMobileSheetVisible
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-10 opacity-0'
              }`}
              style={{
                height: `${mobileSheetHeight}px`,
                transitionDuration: isDraggingSheet ? '0ms' : `${MOBILE_SHEET_TRANSITION_MS}ms`
              }}
            >
              <div
                className="flex cursor-ns-resize justify-center px-4 pt-3 pb-1 touch-none"
                onPointerDown={(event) => {
                  setIsDraggingSheet(true);
                  dragStateRef.current = {
                    pointerId: event.pointerId,
                    active: true,
                    shouldClose: false
                  };
                }}
              >
                <span className="h-1.5 w-12 rounded-full bg-white/20" aria-hidden="true" />
              </div>
              <LayerControlSheetContent
                items={items}
                isVisible={isVisible}
                onClose={onClose}
                onToggle={onToggle}
              />
            </div>
          </div>
      ) : null}
    </>
  );
}
