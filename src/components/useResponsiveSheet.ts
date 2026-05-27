import { useEffect, useRef, useState } from 'react';
import type { TouchEvent as ReactTouchEvent } from 'react';
import { useIsDesktopViewport } from './useIsDesktopViewport';

export const MOBILE_SHEET_TRANSITION_MS = 320;
export const DESKTOP_PANEL_TRANSITION_MS = 220;
const MOBILE_SHEET_DEFAULT_RATIO = 0.42;
const MOBILE_SHEET_MINIMIZED_HEIGHT = 110;
const MOBILE_SHEET_MAX_RATIO = 0.72;
const MOBILE_SHEET_MIN_HEIGHT = 100;
const MOBILE_SHEET_DRAG_THRESHOLD = 48;

export type MobileSheetPosition = 'minimized' | 'mid' | 'full';

function getMobileSnapHeights() {
  if (typeof window === 'undefined') {
    return {
      minimized: MOBILE_SHEET_MINIMIZED_HEIGHT,
      mid: 360,
      full: 640
    };
  }

  const minimized = MOBILE_SHEET_MINIMIZED_HEIGHT;
  const mid = Math.max(minimized + 72, Math.round(window.innerHeight * MOBILE_SHEET_DEFAULT_RATIO));
  const full = Math.max(mid + 72, Math.round(window.innerHeight * MOBILE_SHEET_MAX_RATIO));

  return {
    minimized,
    mid,
    full
  };
}

function getSheetHeight(position: MobileSheetPosition) {
  return getMobileSnapHeights()[position];
}

function clampSheetHeight(height: number) {
  const { full } = getMobileSnapHeights();
  return Math.min(full, Math.max(MOBILE_SHEET_MIN_HEIGHT, Math.round(height)));
}

interface UseResponsiveSheetOptions {
  isOpen: boolean;
  onClose: () => void;
}

export function useResponsiveSheet({ isOpen, onClose }: UseResponsiveSheetOptions) {
  const isDesktop = useIsDesktopViewport();
  const [mobileSheetPosition, setMobileSheetPosition] = useState<MobileSheetPosition>('mid');
  const [mobileSheetHeight, setMobileSheetHeight] = useState(() => getSheetHeight('mid'));
  const [isDesktopPanelRendered, setIsDesktopPanelRendered] = useState(isOpen);
  const [isDesktopPanelVisible, setIsDesktopPanelVisible] = useState(isOpen);
  const [isMobileSheetRendered, setIsMobileSheetRendered] = useState(isOpen);
  const [isMobileSheetVisible, setIsMobileSheetVisible] = useState(isOpen);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const mobileSheetRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number | null;
    lastY: number;
    startHeight: number;
    startPosition: MobileSheetPosition;
    startY: number;
  } | null>(null);
  const touchStateRef = useRef<{
    lastY: number;
    startHeight: number;
    startPosition: MobileSheetPosition;
    startY: number;
  } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!isDesktop) {
      setIsDesktopPanelRendered(false);
      setIsDesktopPanelVisible(false);
      return;
    }

    if (isOpen) {
      setIsDesktopPanelRendered(true);
      setIsDesktopPanelVisible(false);

      let frameId = 0;
      let nestedFrameId = 0;
      frameId = window.requestAnimationFrame(() => {
        nestedFrameId = window.requestAnimationFrame(() => {
          setIsDesktopPanelVisible(true);
        });
      });

      return () => {
        window.cancelAnimationFrame(frameId);
        window.cancelAnimationFrame(nestedFrameId);
      };
    }

    setIsDesktopPanelVisible(false);

    const timeoutId = window.setTimeout(() => {
      setIsDesktopPanelRendered(false);
    }, DESKTOP_PANEL_TRANSITION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isDesktop, isOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (isDesktop) {
      setIsMobileSheetRendered(false);
      setIsMobileSheetVisible(false);
      return;
    }

    if (isOpen) {
      setMobileSheetPosition('mid');
      setMobileSheetHeight(getSheetHeight('mid'));
      setIsMobileSheetRendered(true);
      setIsMobileSheetVisible(false);

      let frameId = 0;
      let nestedFrameId = 0;
      frameId = window.requestAnimationFrame(() => {
        nestedFrameId = window.requestAnimationFrame(() => {
          setIsMobileSheetVisible(true);
        });
      });

      return () => {
        window.cancelAnimationFrame(frameId);
        window.cancelAnimationFrame(nestedFrameId);
      };
    }

    setIsMobileSheetVisible(false);

    const timeoutId = window.setTimeout(() => {
      setIsMobileSheetRendered(false);
      setIsDraggingSheet(false);
      dragStateRef.current = null;
      touchStateRef.current = null;
    }, MOBILE_SHEET_TRANSITION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isDesktop, isOpen]);

  const snapSheetTo = (position: MobileSheetPosition) => {
    setMobileSheetPosition(position);
    setMobileSheetHeight(getSheetHeight(position));
  };

  useEffect(() => {
    if (!isOpen || isDesktop) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) {
        return;
      }

      dragStateRef.current.lastY = event.clientY;
      const deltaY = event.clientY - dragStateRef.current.startY;
      setMobileSheetHeight(clampSheetHeight(dragStateRef.current.startHeight - deltaY));
    };

    const finishPointerDrag = (event: PointerEvent) => {
      if (dragStateRef.current?.pointerId !== event.pointerId) {
        return;
      }

      const deltaY = dragStateRef.current.lastY - dragStateRef.current.startY;
      settleSheetDrag(
        deltaY,
        dragStateRef.current.startHeight,
        dragStateRef.current.startPosition
      );
      setIsDraggingSheet(false);
      dragStateRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', finishPointerDrag);
    window.addEventListener('pointercancel', finishPointerDrag);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finishPointerDrag);
      window.removeEventListener('pointercancel', finishPointerDrag);
      setIsDraggingSheet(false);
      dragStateRef.current = null;
    };
  }, [isDesktop, isOpen]);

  useEffect(() => {
    if (typeof window === 'undefined' || isDesktop || !isOpen || isDraggingSheet) {
      return;
    }

    const handleResize = () => {
      setMobileSheetHeight(getSheetHeight(mobileSheetPosition));
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isDesktop, isDraggingSheet, isOpen, mobileSheetPosition]);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      isDesktop ||
      !isOpen ||
      mobileSheetPosition === 'minimized'
    ) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (isDraggingSheet) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (mobileSheetRef.current?.contains(target)) {
        return;
      }

      snapSheetTo('minimized');
    };

    window.addEventListener('pointerdown', handlePointerDown, true);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [isDesktop, isDraggingSheet, isOpen, mobileSheetPosition]);

  const settleSheetDrag = (
    deltaY: number,
    startHeight: number,
    startPosition: MobileSheetPosition
  ) => {
    if (Math.abs(deltaY) < MOBILE_SHEET_DRAG_THRESHOLD) {
      snapSheetTo(startPosition);
      return;
    }

    const { minimized, mid, full } = getMobileSnapHeights();
    const endHeight = clampSheetHeight(startHeight - deltaY);
    const minimizedMidpoint = (minimized + mid) / 2;
    const midFullMidpoint = (mid + full) / 2;

    if (deltaY > 0) {
      if (startPosition === 'full') {
        snapSheetTo(endHeight < minimizedMidpoint ? 'minimized' : 'mid');
        return;
      }

      if (startPosition === 'mid') {
        if (endHeight < minimizedMidpoint) {
          onClose();
          return;
        }

        snapSheetTo('minimized');
        return;
      }

      onClose();
      return;
    }

    if (startPosition === 'minimized') {
      snapSheetTo(endHeight > midFullMidpoint ? 'full' : 'mid');
      return;
    }

    snapSheetTo('full');
  };

  const beginSheetDrag = (pointerId: number | null, clientY: number) => {
    if (isDesktop) {
      return;
    }

    setIsDraggingSheet(true);
    dragStateRef.current = {
      pointerId,
      lastY: clientY,
      startHeight: mobileSheetHeight,
      startPosition: mobileSheetPosition,
      startY: clientY
    };
  };

  const handleContentTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (isDesktop || (contentScrollRef.current?.scrollTop ?? 0) > 0) {
      touchStateRef.current = null;
      return;
    }

    const touch = event.touches[0];

    if (!touch) {
      return;
    }

    touchStateRef.current = {
      lastY: touch.clientY,
      startHeight: mobileSheetHeight,
      startPosition: mobileSheetPosition,
      startY: touch.clientY
    };
  };

  const handleContentTouchMove = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (isDesktop || !touchStateRef.current || !contentScrollRef.current) {
      return;
    }

    if (contentScrollRef.current.scrollTop > 0) {
      touchStateRef.current = null;
      return;
    }

    const touch = event.touches[0];

    if (!touch) {
      return;
    }

    touchStateRef.current.lastY = touch.clientY;
    const deltaY = touch.clientY - touchStateRef.current.startY;

    if (deltaY <= 0) {
      return;
    }

    if (event.cancelable) {
      event.preventDefault();
    }

    setIsDraggingSheet(true);
    setMobileSheetHeight(clampSheetHeight(touchStateRef.current.startHeight - deltaY));
  };

  const handleContentTouchEnd = (event?: ReactTouchEvent<HTMLDivElement>) => {
    if (isDesktop || !touchStateRef.current) {
      return;
    }

    const lastTouch = event?.changedTouches[0];
    const endY = lastTouch ? lastTouch.clientY : touchStateRef.current.lastY;
    const deltaY = endY - touchStateRef.current.startY;
    settleSheetDrag(
      deltaY,
      touchStateRef.current.startHeight,
      touchStateRef.current.startPosition
    );
    setIsDraggingSheet(false);
    touchStateRef.current = null;
  };

  return {
    beginSheetDrag,
    contentScrollRef,
    handleContentTouchEnd,
    handleContentTouchMove,
    handleContentTouchStart,
    isDesktop,
    isDesktopPanelRendered,
    isDesktopPanelVisible,
    isDraggingSheet,
    isMobileSheetRendered,
    isMobileSheetVisible,
    mobileSheetHeight,
    mobileSheetPosition,
    mobileSheetRef,
    snapSheetTo
  };
}
