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
    color?: string;
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

  const isPoi = route.routeType === 'curated-poi';
  const details = [
    `${isPoi ? 'POI' : 'Segment'} ID ${route.routeId}`,
    isPoi
      ? null
      : route.routeLength !== null
        ? `${Math.round(route.routeLength)}m mapped length`
        : 'Length unavailable',
    route.layerName,
    route.overlayName
  ].filter((detail): detail is string => Boolean(detail));

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 p-4 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none sm:inset-x-auto sm:bottom-4 sm:left-4 sm:top-20 sm:flex sm:w-[22rem] sm:max-w-[22rem] sm:p-0 ${
        isVisible
          ? 'translate-y-0 opacity-100 sm:translate-x-0'
          : 'translate-y-5 opacity-0 sm:-translate-x-4 sm:translate-y-0'
      }`}
    >
      <div className="pointer-events-auto mx-auto flex max-w-md flex-col overflow-hidden rounded-[28px] border border-slate-900/10 bg-white/90 text-slate-700 shadow-floating backdrop-blur-md sm:mx-0 sm:h-full sm:w-full sm:max-w-none sm:border-slate-200/80">
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-slate-500">
                <span
                  aria-hidden="true"
                  className={`h-2.5 w-2.5 rounded-full ${presentation?.colorClass ?? 'bg-slate-400'}`}
                  style={presentation?.color ? { backgroundColor: presentation.color } : undefined}
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
            {details.map((detail, index) => (
              <span key={detail} className="contents">
                {index > 0 ? (
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                ) : null}
                <span>{detail}</span>
              </span>
            ))}
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
        </div>
        <div className="border-t border-slate-200/80 px-4 py-3 text-center text-xs text-slate-500">
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
