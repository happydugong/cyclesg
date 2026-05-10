import { useEffect, useState } from 'react';
import type { GeolocationState, UserLocation } from '../types/geolocation';

const DEFAULT_STATE: GeolocationState = {
  status: 'idle',
  location: null,
  errorMessage: null
};

function toUserLocation(position: GeolocationPosition): UserLocation {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    heading: position.coords.heading,
    speed: position.coords.speed,
    timestamp: position.timestamp
  };
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>(DEFAULT_STATE);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setState({
        status: 'error',
        location: null,
        errorMessage: 'Geolocation is not supported in this browser.'
      });
      return;
    }

    setState((current) => ({
      ...current,
      status: 'requesting',
      errorMessage: null
    }));

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setState({
          status: 'ready',
          location: toUserLocation(position),
          errorMessage: null
        });
      },
      (error) => {
        const errorMessage =
          error.code === error.PERMISSION_DENIED
            ? 'Location permission was denied. Enable GPS access to center the map on your ride.'
            : 'Unable to read your GPS position right now. Please try again outdoors or with stronger signal.';

        setState((current) => ({
          status: 'error',
          location: current.location,
          errorMessage
        }));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5_000,
        timeout: 15_000
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return state;
}
