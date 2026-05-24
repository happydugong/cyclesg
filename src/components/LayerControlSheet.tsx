import { Settings } from './icons/Settings';
import { LayerControlSheetContent } from './LayerControlSheetContent';
import {
  DESKTOP_PANEL_TRANSITION_MS,
  MOBILE_SHEET_TRANSITION_MS,
  useResponsiveSheet
} from './useResponsiveSheet';

export type OverlayContentType = 'route' | 'poi' | 'route-poi';
export type OverlaySection =
  | 'official-routes'
  | 'compiled-routes'
  | 'themed-routes'
  | 'pois'
  | 'others';

export interface OverlayControlItem {
  id: string;
  label: string;
  contentType: OverlayContentType;
  section: OverlaySection;
  defaultVisible: boolean;
  description: string;
  indicatorColor: string;
  activeBackgroundColor: string;
  activeTextColor: string;
}

interface LayerControlSheetProps {
  items: OverlayControlItem[];
  isOpen: boolean;
  isVisible: (item: OverlayControlItem) => boolean;
  hideMobileTrigger?: boolean;
  onClose: () => void;
  onOpen: () => void;
  onToggle: (id: string, defaultVisible: boolean) => void;
}

export function LayerControlSheet({
  items,
  isOpen,
  isVisible,
  hideMobileTrigger = false,
  onClose,
  onOpen,
  onToggle
}: LayerControlSheetProps) {
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

  if (items.length === 0) {
    return null;
  }

  const shouldShowDesktopTrigger = isDesktop;
  const shouldShowDesktopPanel = isDesktop && isDesktopPanelRendered;
  const shouldShowMobileTrigger = !isDesktop && !isOpen && !hideMobileTrigger;
  const shouldShowMobilePanel = !isDesktop && isMobileSheetRendered;

  const content = (
    <LayerControlSheetContent
      items={items}
      isVisible={isVisible}
      onClose={onClose}
      onToggle={onToggle}
    />
  );

  return (
    <>
      {shouldShowDesktopTrigger ? (
        <div className="pointer-events-none absolute bottom-12 right-4 z-10 sm:right-8">
          <button
            type="button"
            onClick={() => {
              if (isOpen) {
                onClose();
                return;
              }

              onOpen();
            }}
            className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-slate-950/90 text-white shadow-floating backdrop-blur transition duration-200 hover:bg-slate-700"
            aria-label={isOpen ? 'Close map layers' : 'Open map layers'}
            aria-pressed={isOpen}
          >
            <Settings />
          </button>
        </div>
      ) : null}

      {shouldShowMobileTrigger ? (
        <div className="pointer-events-none absolute bottom-14 right-4 z-10">
          <button
            type="button"
            onClick={onOpen}
            className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-slate-950/90 text-white shadow-floating backdrop-blur transition hover:bg-slate-900"
            aria-label="Open map layers"
          >
            <Settings />
          </button>
        </div>
      ) : null}

      {shouldShowDesktopPanel ? (
        <div className="pointer-events-none absolute bottom-4 left-4 top-20 z-10">
          <div
            className={`pointer-events-auto flex h-full w-[22rem] max-w-[22rem] flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 text-slate-900 shadow-floating backdrop-blur-md will-change-transform transition-[transform,opacity] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] ${
              isDesktopPanelVisible
                ? 'translate-x-0 opacity-100'
                : '-translate-x-4 opacity-0'
            }`}
            style={{ transitionDuration: `${DESKTOP_PANEL_TRANSITION_MS}ms` }}
          >
            {content}
          </div>
        </div>
      ) : null}

      {shouldShowMobilePanel ? (
        <div className="pointer-events-none absolute inset-0 z-10">
          <div className="absolute inset-x-0 bottom-6 px-4 pb-4 sm:bottom-0">
            <div
              ref={mobileSheetRef}
              className={`pointer-events-auto mx-auto flex w-full max-w-[32rem] flex-col overflow-hidden rounded-[28px] border border-white/15 bg-slate-950/70 text-slate-100 shadow-floating backdrop-blur-md will-change-transform transition-[height,transform,opacity] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] ${
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
                <span className="h-1.5 w-12 rounded-full bg-white/20" aria-hidden="true" />
              </div>
              <LayerControlSheetContent
                contentScrollRef={contentScrollRef}
                items={items}
                isVisible={isVisible}
                onContentTouchEnd={handleContentTouchEnd}
                onContentTouchMove={handleContentTouchMove}
                onContentTouchStart={handleContentTouchStart}
                onClose={onClose}
                onHeaderPointerDown={(event) => {
                  if (
                    event.target instanceof Element &&
                    event.target.closest('button')
                  ) {
                    return;
                  }

                  beginSheetDrag(event.pointerId, event.clientY);
                }}
                onToggle={onToggle}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
