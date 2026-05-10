export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export type GeolocationStatus = 'idle' | 'requesting' | 'ready' | 'error';

export interface GeolocationState {
  status: GeolocationStatus;
  location: UserLocation | null;
  errorMessage: string | null;
}
