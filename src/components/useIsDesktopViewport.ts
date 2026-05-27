import { useEffect, useState } from 'react';

export const DESKTOP_MEDIA_QUERY = '(min-width: 640px)';

export function readIsDesktopViewport() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }

  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

export function useIsDesktopViewport() {
  const [isDesktop, setIsDesktop] = useState(readIsDesktopViewport);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };

    setIsDesktop(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return isDesktop;
}
