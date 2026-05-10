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

export function flyToLocation(map: Map, longitude: number, latitude: number) {
  map.flyTo({
    center: [longitude, latitude],
    zoom: Math.max(map.getZoom(), 14.5),
    speed: 1.1,
    curve: 1.3,
    essential: true
  });
}
