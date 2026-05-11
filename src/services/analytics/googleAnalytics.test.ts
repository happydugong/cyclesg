import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('googleAnalytics', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST123456');
    document.head.innerHTML = '';
    Reflect.deleteProperty(window, 'gtag');
    Reflect.deleteProperty(window, 'dataLayer');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    Reflect.deleteProperty(window, 'gtag');
    Reflect.deleteProperty(window, 'dataLayer');
    document.head.innerHTML = '';
  });

  it('queues commands using the standard gtag arguments object shape', async () => {
    const appendChildSpy = vi.spyOn(document.head, 'appendChild').mockImplementation((node) => node);
    const { initializeAnalytics, trackPageView } = await import('./googleAnalytics');

    initializeAnalytics();
    trackPageView('/test-page');

    expect(appendChildSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'google-analytics',
        src: 'https://www.googletagmanager.com/gtag/js?id=G-TEST123456'
      })
    );
    expect(window.dataLayer).toHaveLength(3);

    const jsCommand = window.dataLayer?.[0] as IArguments;
    const configCommand = window.dataLayer?.[1] as IArguments;
    const pageViewCommand = window.dataLayer?.[2] as IArguments;

    expect(Array.isArray(jsCommand)).toBe(false);
    expect(Array.from(jsCommand)).toEqual(['js', expect.any(Date)]);
    expect(Array.from(configCommand)).toEqual([
      'config',
      'G-TEST123456',
      expect.objectContaining({ send_page_view: false })
    ]);
    expect(Array.from(pageViewCommand)).toEqual([
      'event',
      'page_view',
      expect.objectContaining({ page_path: '/test-page' })
    ]);
  });
});
