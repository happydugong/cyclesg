import type {
  PointerEvent as ReactPointerEvent,
  Ref,
  TouchEvent as ReactTouchEvent
} from 'react';
import { useMemo } from 'react';
import type { OverlayContentType, OverlayControlItem } from './LayerControlSheet';

const MAP_SUGGESTION_ISSUE_URL =
  'https://github.com/happydugong/cyclesg/issues/new?template=map_suggestion.yml';

function getOverlayContentLabel(contentType: OverlayContentType) {
  switch (contentType) {
    case 'poi':
      return 'POI';
    case 'route-poi':
      return 'Route + POI';
    default:
      return 'Route';
  }
}

interface LayerControlSheetContentProps {
  contentScrollRef?: Ref<HTMLDivElement>;
  items: OverlayControlItem[];
  isVisible: (item: OverlayControlItem) => boolean;
  onContentTouchEnd?: (event: ReactTouchEvent<HTMLDivElement>) => void;
  onContentTouchMove?: (event: ReactTouchEvent<HTMLDivElement>) => void;
  onContentTouchStart?: (event: ReactTouchEvent<HTMLDivElement>) => void;
  onClose: () => void;
  onHeaderPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onToggle: (id: string, defaultVisible: boolean) => void;
}

export function LayerControlSheetContent({
  contentScrollRef,
  items,
  isVisible,
  onContentTouchEnd,
  onContentTouchMove,
  onContentTouchStart,
  onClose,
  onHeaderPointerDown,
  onToggle
}: LayerControlSheetContentProps) {
  const officialItems = useMemo(
    () => items.filter((item) => item.section === 'official-routes'),
    [items]
  );
  const compiledRouteItems = useMemo(
    () => items.filter((item) => item.section === 'compiled-routes'),
    [items]
  );
  const themedRouteItems = useMemo(
    () => items.filter((item) => item.section === 'themed-routes'),
    [items]
  );
  const poiItems = useMemo(
    () => items.filter((item) => item.section === 'pois'),
    [items]
  );
  const otherItems = useMemo(
    () => items.filter((item) => item.section === 'others'),
    [items]
  );

  const renderItems = (sectionItems: OverlayControlItem[]) =>
    sectionItems.map((item) => {
      const itemVisible = isVisible(item);

      return (
        <button
          key={item.id}
          type="button"
          aria-label={`${item.label} ${getOverlayContentLabel(item.contentType)}`}
          aria-pressed={itemVisible}
          onClick={() => onToggle(item.id, item.defaultVisible)}
          className={`flex min-h-[4.5rem] w-full items-start gap-4 rounded-3xl border px-4 py-4 text-left transition ${
            itemVisible
              ? 'border-transparent text-slate-950 shadow-sm'
              : 'border-white/15 bg-white/[0.03] text-slate-100 sm:border-slate-200 sm:bg-slate-50 sm:text-slate-900'
          }`}
          style={
            itemVisible
              ? {
                  backgroundColor: item.activeBackgroundColor,
                  color: item.activeTextColor
                }
              : undefined
          }
        >
          <span
            aria-hidden="true"
            className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: item.indicatorColor }}
          />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">{item.label}</span>
              <span
                className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.06em] ${
                  itemVisible
                    ? 'border-slate-900/10 bg-white/45'
                    : 'border-white/15 bg-white/10 text-slate-300 sm:border-slate-200 sm:bg-slate-100 sm:text-slate-500'
                }`}
              >
                {getOverlayContentLabel(item.contentType)}
              </span>
            </span>
            <span
              className={`mt-1 block text-xs ${
                itemVisible ? 'text-current/75' : 'text-slate-400 sm:text-slate-500'
              }`}
            >
              {item.description}
            </span>
          </span>
          <span
            className={`mt-0.5 shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${
              itemVisible
                ? 'bg-slate-950/10'
                : 'bg-white/10 text-slate-300 sm:bg-slate-100 sm:text-slate-500'
            }`}
          >
            {itemVisible ? 'On' : 'Off'}
          </span>
        </button>
      );
    });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="touch-none px-4 py-3" onPointerDown={onHeaderPointerDown}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.08em] text-slate-400 dark:text-slate-300 ">Map Layers</p>
            <p className="mt-1 text-xs text-slate-400">
              Toggle route and POI overlays.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 sm:border-slate-200 sm:bg-slate-100 sm:text-slate-600"
            aria-label="Close map layers"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        </div>
      </div>
      <div
        ref={contentScrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:max-h-[calc(100vh-12rem)]"
        onTouchStart={onContentTouchStart}
        onTouchMove={onContentTouchMove}
        onTouchEnd={onContentTouchEnd}
        onTouchCancel={onContentTouchEnd}
      >
        <div className="space-y-4">
          <section>
            <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 sm:text-slate-500">
              Official Routes / POIs
            </p>
            <div className="space-y-2">{renderItems(officialItems)}</div>
          </section>
          {compiledRouteItems.length > 0 ? (
            <section>
              <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 sm:text-slate-500">
                Compiled Routes
              </p>
              <div className="space-y-2">{renderItems(compiledRouteItems)}</div>
            </section>
          ) : null}
          {themedRouteItems.length > 0 ? (
            <section>
              <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 sm:text-slate-500">
                Themed Routes
              </p>
              <div className="space-y-2">{renderItems(themedRouteItems)}</div>
            </section>
          ) : null}
          {poiItems.length > 0 ? (
            <section>
              <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 sm:text-slate-500">
                POIs
              </p>
              <div className="space-y-2">{renderItems(poiItems)}</div>
            </section>
          ) : null}
          {otherItems.length > 0 ? (
            <section>
              <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 sm:text-slate-500">
                Others
              </p>
              <div className="space-y-2">{renderItems(otherItems)}</div>
            </section>
          ) : null}
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-3 text-center sm:border-slate-200">
        <a
          href={MAP_SUGGESTION_ISSUE_URL}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-slate-400 underline decoration-white/30 underline-offset-2 transition hover:text-slate-200 hover:decoration-white/60 sm:text-slate-500 sm:decoration-slate-300 sm:hover:text-slate-700 sm:hover:decoration-slate-500"
        >
          Suggest a route or POI
        </a>
      </div>
    </div>
  );
}
