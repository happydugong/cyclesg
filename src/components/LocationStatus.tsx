import type { GeolocationController } from '../types/geolocation';

interface LocationStatusProps {
  state: GeolocationController;
}

export function LocationStatus({ state }: LocationStatusProps) {
  const isLoading = state.status === 'requesting' && !state.location;
  const isError = state.status === 'error' && state.errorMessage;

  if (!isLoading && !isError) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-20 z-20 flex justify-center p-4 sm:top-24">
      <div className="max-w-sm rounded-2xl border border-white/15 bg-slate-950/85 px-4 py-3 text-sm text-slate-100 shadow-floating backdrop-blur">
        {isLoading ? (
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-brand-500 animate-pulse" />
            <span>Finding your GPS location…</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <p className="flex-1">{state.errorMessage}</p>
            <button
              type="button"
              onClick={state.refresh}
              className="pointer-events-auto shrink-0 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
