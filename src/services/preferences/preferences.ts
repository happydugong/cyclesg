export const APP_PREFERENCES_STORAGE_KEY = 'cyclesg.preferences.v1';

export type ControlDockPlacement = 'right-bottom' | 'top' | 'bottom' | 'left-bottom';

export interface AppPreferences {
  controlDockPlacement: ControlDockPlacement;
  showOffscreenMarkerIndicator: boolean;
}

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  controlDockPlacement: 'right-bottom',
  showOffscreenMarkerIndicator: true
};

export interface ControlDockPlacementOption {
  label: string;
  value: ControlDockPlacement;
}

export const CONTROL_DOCK_PLACEMENT_OPTIONS: ControlDockPlacementOption[] = [
  {
    label: 'Right bottom',
    value: 'right-bottom'
  },
  {
    label: 'Top',
    value: 'top'
  },
  {
    label: 'Bottom',
    value: 'bottom'
  },
  {
    label: 'Left bottom',
    value: 'left-bottom'
  }
];

function isControlDockPlacement(value: unknown): value is ControlDockPlacement {
  return (
    value === 'right-bottom' ||
    value === 'top' ||
    value === 'bottom' ||
    value === 'left-bottom'
  );
}

export function mergeAppPreferences(
  storedPreferences: Partial<Record<keyof AppPreferences, unknown>> | null | undefined
) {
  return {
    ...DEFAULT_APP_PREFERENCES,
    controlDockPlacement: isControlDockPlacement(storedPreferences?.controlDockPlacement)
      ? storedPreferences.controlDockPlacement
      : DEFAULT_APP_PREFERENCES.controlDockPlacement,
    showOffscreenMarkerIndicator:
      typeof storedPreferences?.showOffscreenMarkerIndicator === 'boolean'
        ? storedPreferences.showOffscreenMarkerIndicator
        : DEFAULT_APP_PREFERENCES.showOffscreenMarkerIndicator
  };
}

export function readStoredAppPreferences() {
  if (typeof window === 'undefined') {
    return DEFAULT_APP_PREFERENCES;
  }

  try {
    const storedValue = window.localStorage.getItem(APP_PREFERENCES_STORAGE_KEY);

    if (!storedValue) {
      return DEFAULT_APP_PREFERENCES;
    }

    return mergeAppPreferences(
      JSON.parse(storedValue) as Partial<Record<keyof AppPreferences, unknown>>
    );
  } catch {
    return DEFAULT_APP_PREFERENCES;
  }
}

export function writeStoredAppPreferences(preferences: AppPreferences) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(APP_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}
