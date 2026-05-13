import { useMemo } from 'react';
import type { OverlayContentType, OverlayControlItem } from './LayerControlSheet';

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
  items: OverlayControlItem[];
  isVisible: (item: OverlayControlItem) => boolean;
  onClose: () => void;
  onToggle: (id: string, defaultVisible: boolean) => void;
}

export function LayerControlSheetContent({
  items,
  isVisible,
  onClose,
  onToggle
}: LayerControlSheetContentProps) {
  const routeItems = useMemo(
    () => items.filter((item) => item.section === 'routes'),
    [items]
  );
  const curatedRouteItems = useMemo(
    () => items.filter((item) => item.section === 'curated-routes'),
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
          className={`flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition ${
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
      <div className="px-4 py-3">
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
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 sm:border-slate-200 sm:bg-slate-100 sm:text-slate-600"
            aria-label="Close map layers"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:max-h-[calc(100vh-12rem)]">
        <div className="space-y-4">
          <section>
            <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 sm:text-slate-500">
              Routes
            </p>
            <div className="space-y-2">{renderItems(routeItems)}</div>
          </section>
          {curatedRouteItems.length > 0 ? (
            <section>
              <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 sm:text-slate-500">
                Curated Routes
              </p>
              <div className="space-y-2">{renderItems(curatedRouteItems)}</div>
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
    </div>
  );
}
