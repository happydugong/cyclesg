import maplibregl, { LngLatBoundsLike, Map, Marker } from 'maplibre-gl';

const DEFAULT_STYLE_URL =
  import.meta.env.VITE_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/liberty';

const DEFAULT_CENTER: [number, number] = [
  Number(import.meta.env.VITE_SINGAPORE_CENTER_LNG ?? 103.8198),
  Number(import.meta.env.VITE_SINGAPORE_CENTER_LAT ?? 1.3521)
];

export const SINGAPORE_BOUNDS: LngLatBoundsLike = [
  [103.58, 1.19],
  [104.1, 1.48]
];

export function createMap(container: HTMLDivElement) {
  const map = new Map({
    container,
    style: DEFAULT_STYLE_URL,
    center: DEFAULT_CENTER,
    zoom: 11.4,
    minZoom: 9,
    maxZoom: 18,
    maxBounds: SINGAPORE_BOUNDS,
    attributionControl: {},
    dragRotate: false,
    touchPitch: false
  });

  map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'top-right');

  return map;
}

export function createUserLocationMarker() {
  const element = document.createElement('div');
  element.className = 'user-location-marker';

  return new Marker({
    element,
    anchor: 'center'
  });
}

export function createSearchLocationMarker() {
  const element = document.createElement('div');
  element.className = 'search-location-marker';
  const pin = document.createElement('div');
  pin.className = 'search-location-marker-pin';
  pin.innerHTML = `
    <svg aria-hidden="true" viewBox="0 0 32 40" focusable="false">
      <path
        d="M16 1.75C8.6 1.75 3 7.35 3 14.7C3 24.35 16 38.25 16 38.25C16 38.25 29 24.35 29 14.7C29 7.35 23.4 1.75 16 1.75Z"
        fill="#ea580c"
        stroke="#ffffff"
        stroke-width="0"
        stroke-linejoin="round"
      />
      <circle cx="16" cy="14.75" r="5.8" fill="#ffffff" />
    </svg>
  `;
  element.append(pin);

  return new Marker({
    element,
    anchor: 'bottom'
  });
}

export function flyToLocation(map: Map, longitude: number, latitude: number) {
  map.flyTo({
    center: [longitude, latitude],
    zoom: Math.max(map.getZoom(), 14.5),
    speed: 1.1,
    curve: 1.3,
    essential: true
  });
}

export function flyToSearchLocation(map: Map, longitude: number, latitude: number) {
  map.flyTo({
    center: [longitude, latitude],
    zoom: 16,
    duration: 1500,
    essential: true
  });
}
