import {
  DESKTOP_PANEL_TRANSITION_MS,
  MOBILE_SHEET_TRANSITION_MS,
  useResponsiveSheet
} from './useResponsiveSheet';
import type {
  ControlDockPlacement,
  ControlDockPlacementOption
} from '../services/preferences/preferences';

interface PreferencesSheetProps {
  isOpen: boolean;
  options: ControlDockPlacementOption[];
  placement: ControlDockPlacement;
  onClose: () => void;
  onPlacementChange: (placement: ControlDockPlacement) => void;
}

export function PreferencesSheet({
  isOpen,
  options,
  placement,
  onClose,
  onPlacementChange
}: PreferencesSheetProps) {
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

  const shouldShowDesktopPanel = isDesktop && isDesktopPanelRendered;
  const shouldShowMobilePanel = !isDesktop && isMobileSheetRendered;
  const selectedOption =
    options.find((option) => option.value === placement) ?? {
      label: 'Right bottom',
      value: 'right-bottom' as const
    };
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === selectedOption.value)
  );
  const nextOption = options[(selectedIndex + 1) % options.length] ?? selectedOption;

  const content = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="touch-none px-4 py-3" onPointerDown={(event) => {
        if (
          event.target instanceof Element &&
          event.target.closest('button')
        ) {
          return;
        }

        beginSheetDrag(event.pointerId, event.clientY);
      }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.08em] text-slate-400 sm:text-slate-500">
              Preferences
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 sm:border-slate-200 sm:bg-slate-100 sm:text-slate-600"
            aria-label="Close preferences"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        </div>
      </div>
      <div
        ref={contentScrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:max-h-[calc(100vh-12rem)]"
        onTouchStart={handleContentTouchStart}
        onTouchMove={handleContentTouchMove}
        onTouchEnd={handleContentTouchEnd}
        onTouchCancel={handleContentTouchEnd}
      >
        <button
          type="button"
          onClick={() => {
            onPlacementChange(nextOption.value);
          }}
          className="flex min-h-[6.5rem] w-full items-center justify-between gap-4 rounded-[1.5rem] border border-white/15 bg-white/[0.06] px-5 py-4 text-left text-slate-100 shadow-sm transition hover:bg-white/[0.09] sm:border-slate-200 sm:bg-slate-50 sm:text-slate-900 sm:hover:bg-white"
          aria-label={`Floating controls position: ${selectedOption.label}`}
        >
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 sm:text-slate-500">
              Floating controls
            </span>
            <span className="mt-1 block text-lg font-semibold leading-6">
              {selectedOption.label}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="grid h-14 w-14 shrink-0 grid-cols-2 grid-rows-2 gap-1 rounded-2xl border border-white/15 bg-slate-950/45 p-2 sm:border-slate-200 sm:bg-white"
          >
            <span className={placement === 'top' ? 'col-span-2 rounded-full bg-emerald-400' : 'col-span-2 rounded-full bg-slate-500/40 sm:bg-slate-300'} />
            <span className={placement === 'left-bottom' || placement === 'bottom' ? 'rounded-full bg-emerald-400' : 'rounded-full bg-slate-500/40 sm:bg-slate-300'} />
            <span className={placement === 'right-bottom' || placement === 'bottom' ? 'rounded-full bg-emerald-400' : 'rounded-full bg-slate-500/40 sm:bg-slate-300'} />
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {shouldShowDesktopPanel ? (
        <div className="pointer-events-none absolute bottom-4 left-4 top-20 z-20">
          <div
            className={`pointer-events-auto flex h-full w-[22rem] max-w-[22rem] flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 text-slate-900 shadow-floating backdrop-blur-md will-change-transform transition-[transform,opacity] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] ${isDesktopPanelVisible
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
        <div className="pointer-events-none absolute inset-0 z-20">
          <div className="mobile-safe-bottom mobile-safe-x absolute inset-x-0 bottom-0">
            <div
              ref={mobileSheetRef}
              className={`pointer-events-auto mx-auto flex w-full max-w-[32rem] origin-bottom flex-col overflow-hidden rounded-[28px] border border-white/15 bg-slate-950/70 text-slate-100 shadow-floating backdrop-blur-md will-change-transform transition-[height,transform,opacity] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] ${isMobileSheetVisible
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-full opacity-0'
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
              {content}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
