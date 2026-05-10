import type { GeolocationState } from '../types/geolocation';

interface LocationStatusProps {
  state: GeolocationState;
}

export function LocationStatus({ state }: LocationStatusProps) {
  const isLoading = state.status === 'requesting' && !state.location;
  const isError = state.status === 'error' && state.errorMessage;

  if (!isLoading && !isError) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center p-4">
      <div className="max-w-sm rounded-2xl border border-white/15 bg-slate-950/85 px-4 py-3 text-sm text-slate-100 shadow-floating backdrop-blur">
        {isLoading ? (
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-brand-500 animate-pulse" />
            <span>Finding your GPS location…</span>
          </div>
        ) : (
          <p>{state.errorMessage}</p>
        )}
      </div>
    </div>
  );
}
