const GA_SCRIPT_ID = 'google-analytics';
const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() ?? '';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let initialized = false;

function isAnalyticsEnabled() {
  return measurementId.length > 0;
}

function ensureDataLayer() {
  window.dataLayer = window.dataLayer ?? [];
}

function ensureGtag() {
  if (window.gtag) {
    return window.gtag;
  }

  window.gtag = (...args: unknown[]) => {
    ensureDataLayer();
    window.dataLayer.push(args);
  };

  return window.gtag;
}

function injectAnalyticsScript() {
  if (document.getElementById(GA_SCRIPT_ID)) {
    return;
  }

  const script = document.createElement('script');
  script.id = GA_SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);
}

export function initializeAnalytics() {
  if (!isAnalyticsEnabled() || initialized) {
    return;
  }

  ensureDataLayer();
  injectAnalyticsScript();

  const gtag = ensureGtag();
  gtag('js', new Date());
  gtag('config', measurementId, {
    send_page_view: false
  });

  initialized = true;
}

export function trackPageView(pagePath = window.location.pathname) {
  if (!isAnalyticsEnabled()) {
    return;
  }

  ensureGtag()('event', 'page_view', {
    page_path: pagePath,
    page_location: window.location.href,
    page_title: document.title
  });
}

export function trackEvent(eventName: string, params: Record<string, string | number | boolean | null>) {
  if (!isAnalyticsEnabled()) {
    return;
  }

  ensureGtag()('event', eventName, params);
}
