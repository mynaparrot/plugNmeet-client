import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { debounce } from 'es-toolkit';
import type { Room } from 'livekit-client';
import MobileDetect from 'mobile-detect';
import NoSleep from 'nosleep.js';

import {
  setActiveSidePanel,
  updateDeviceOrientation,
  updateScreenHeight,
  updateScreenWidth,
} from '../../store/slices/bottomIconsActivitySlice';
import { store, useAppDispatch } from '../../store';
import { updateUserDeviceType } from '../../store/slices/sessionSlice';
import { UserDeviceType } from '../../store/slices/interfaces/session';
import { triggerRefreshWhiteboard } from '../../store/slices/whiteboard';

const RESIZE_DEBOUNCE_DELAY_MS = 150;
const SCREEN_HEIGHT_DEBOUNCE_DELAY_MS = 500;
const SIDE_PANEL_BREAKPOINT_PX = 1024;

const useWatchWindowSize = (currentRoom: Room | undefined) => {
  const dispatch = useAppDispatch();
  const noSleepRef = useRef<NoSleep | null>(null);

  const [deviceClass, setDeviceClass] = useState<string>('');
  const [orientationClass, setOrientationClass] =
    useState<string>('landscape-device');
  const [screenHeight, setScreenHeight] = useState<string>('');

  const adjustScreenSize = useCallback(() => {
    setScreenHeight(`${window.innerHeight}px`);
  }, []);

  const debouncedAdjustScreenSize = useMemo(
    () => debounce(adjustScreenSize, SCREEN_HEIGHT_DEBOUNCE_DELAY_MS),
    [adjustScreenSize],
  );

  const debouncedDispatchWidth = useMemo(
    () =>
      debounce((width: number) => {
        dispatch(updateScreenWidth(width));

        const isActiveWhiteboard =
          store.getState().bottomIconsActivity.isActiveWhiteboard;

        if (isActiveWhiteboard) {
          dispatch(triggerRefreshWhiteboard());
        }
      }, RESIZE_DEBOUNCE_DELAY_MS),
    [dispatch],
  );

  useEffect(() => {
    debouncedAdjustScreenSize();

    return () => {
      debouncedAdjustScreenSize.cancel();
    };
  }, [debouncedAdjustScreenSize, currentRoom?.state]);

  useEffect(() => {
    const handleResize = (width: number, height: number) => {
      dispatch(updateScreenHeight(height));
      adjustScreenSize();
      debouncedDispatchWidth(width);

      const activeSidePanel =
        store.getState().bottomIconsActivity.activeSidePanel;

      if (width < SIDE_PANEL_BREAKPOINT_PX && activeSidePanel) {
        dispatch(setActiveSidePanel(null));
      }
    };

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      const { width, height } = entry.contentRect;

      handleResize(Math.round(width), Math.round(height));
    });

    resizeObserver.observe(document.body);

    dispatch(updateScreenHeight(window.innerHeight));

    if (window.innerWidth < SIDE_PANEL_BREAKPOINT_PX) {
      dispatch(setActiveSidePanel(null));
    }

    return () => {
      debouncedDispatchWidth.cancel();
      resizeObserver.disconnect();
    };
  }, [adjustScreenSize, debouncedDispatchWidth, dispatch]);

  useEffect(() => {
    const md = new MobileDetect(window.navigator.userAgent);

    const isIpad =
      /Macintosh/i.test(window.navigator.userAgent) &&
      navigator.maxTouchPoints > 1;

    const classes: string[] = [];
    let isSmallDevice = false;

    if (isIpad || md.tablet()) {
      classes.push('is-tablet');
      isSmallDevice = true;
      dispatch(updateUserDeviceType(UserDeviceType.TABLET));
    } else if (md.mobile()) {
      classes.push('is-mobile');
      isSmallDevice = true;
      dispatch(updateUserDeviceType(UserDeviceType.MOBILE));
    } else {
      classes.push('is-pc');
    }

    const os = md.os();

    if (os === 'AndroidOS') {
      classes.push('is-android');
    } else if (os === 'iOS' || os === 'iPadOS' || (!os && isIpad)) {
      classes.push('is-ios');
    }

    setDeviceClass(classes.join(' '));

    if (isSmallDevice) {
      if (!noSleepRef.current) {
        noSleepRef.current = new NoSleep();
      }

      void noSleepRef.current.enable();
    }

    return () => {
      noSleepRef.current?.disable();
    };
  }, [dispatch]);

  useEffect(() => {
    const mediaQueryList = window.matchMedia('(orientation: portrait)');

    const applyOrientation = (isPortrait: boolean) => {
      const nextOrientation = isPortrait ? 'portrait' : 'landscape';

      setOrientationClass(`${nextOrientation}-device`);
      dispatch(updateDeviceOrientation(nextOrientation));
    };

    const handleOrientationChange = (event: MediaQueryListEvent) => {
      applyOrientation(event.matches);
    };

    applyOrientation(mediaQueryList.matches);

    mediaQueryList.addEventListener('change', handleOrientationChange);

    return () => {
      mediaQueryList.removeEventListener('change', handleOrientationChange);
    };
  }, [dispatch]);

  return {
    deviceClass,
    orientationClass,
    screenHeight,
  };
};

export default useWatchWindowSize;
