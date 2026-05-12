import type { UnifiedRouteProperties } from '../types/routes';

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
    colorClass: string;
    label: string;
  } | null;
  repositoryUrl: string;
  route: UnifiedRouteProperties | null;
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
  if (!route) {
    return null;
  }

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 p-4 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
      }`}
    >
      <div className="pointer-events-auto mx-auto max-w-md rounded-[28px] border border-slate-900/10 bg-white/90 p-4 text-slate-700 shadow-floating backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-slate-500">
              <span
                aria-hidden="true"
                className={`h-2.5 w-2.5 rounded-full ${presentation?.colorClass ?? 'bg-slate-400'}`}
              />
              <span>{presentation?.label ?? 'Route'}</span>
            </p>
            <h2 className="mt-1 text-base font-semibold text-slate-900">
              {route.routeName}
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
        <p className="mt-2 text-sm text-slate-600">{route.routeGroup}</p>
        {route.description ? (
          <p className="mt-2 text-sm text-slate-600">{route.description}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>Segment ID {route.routeId}</span>
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          <span>
            {route.routeLength !== null
              ? `${Math.round(route.routeLength)}m mapped length`
              : 'Length unavailable'}
          </span>
          {route.layerName ? (
            <>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>{route.layerName}</span>
            </>
          ) : null}
          {route.overlayName ? (
            <>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>{route.overlayName}</span>
            </>
          ) : null}
        </div>
        {route.routeSource === 'curated-my-maps' && attribution ? (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {attribution.message ? <span>{attribution.message} </span> : null}
            {attribution.sourceUrl ? (
              <a
                href={attribution.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-amber-300 underline-offset-2 transition hover:text-amber-950"
              >
                {attribution.sourceLabel ?? 'Source'}
              </a>
            ) : null}
          </div>
        ) : null}
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
  );
}
