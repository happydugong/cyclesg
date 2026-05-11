/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string;
  readonly VITE_GA_MEASUREMENT_ID?: string;
  readonly VITE_MAP_STYLE_URL?: string;
  readonly VITE_SINGAPORE_CENTER_LAT?: string;
  readonly VITE_SINGAPORE_CENTER_LNG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
