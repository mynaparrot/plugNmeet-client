import { useEffect, useMemo, useRef, useState } from 'react';
import { debounce } from 'es-toolkit';
import MobileDetect from 'mobile-detect';
import type { Room } from 'livekit-client';
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

const useWatchWindowSize = (currentRoom: Room | undefined) => {
  const dispatch = useAppDispatch();
  const noSleepRef = useRef<NoSleep | null>(null);
  const initialRef = useRef(false);

  const [deviceClass, setDeviceClass] = useState<string>('');
  const [orientationClass, setOrientationClass] =
    useState<string>('landscape-device');
  const [screenHeight, setScreenHeight] = useState<string>('');

  const adjustScreenSize = () => {
    setScreenHeight(`${window.innerHeight}px`);
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      adjustScreenSize();
    }, 500);
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [currentRoom?.state]);

  const debouncedDispatchWidth = useMemo(() => {
    return debounce((width: number) => {
      dispatch(updateScreenWidth(width));
      if (store.getState().bottomIconsActivity.isActiveWhiteboard) {
        dispatch(triggerRefreshWhiteboard());
      }
    }, RESIZE_DEBOUNCE_DELAY_MS);
  }, [dispatch]);

  useEffect(() => {
    if (!noSleepRef.current) {
      noSleepRef.current = new NoSleep();
    }
    const noSleep = noSleepRef.current;

    const handleResize = (width: number, height: number) => {
      dispatch(updateScreenHeight(height));
      adjustScreenSize();
      debouncedDispatchWidth(width);

      const activeSidePanel =
        store.getState().bottomIconsActivity.activeSidePanel;
      if (width < 1024 && activeSidePanel) {
        // if both open better to close one
        dispatch(setActiveSidePanel(null));
      }
    };

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      handleResize(Math.round(width), Math.round(height));
    });
    resizeObserver.observe(document.body);

    dispatch(updateScreenHeight(window.innerHeight));

    if (window.innerWidth < 1024) {
      dispatch(setActiveSidePanel(null));
    }

    let deviceClass = 'is-pc',
      isSmallDevice = false;

    if (initialRef.current) {
      deviceClass = 'is-pc'; // Skip duplicate device initialization logic on remount if already computed
    }
    initialRef.current = true;
    const md = new MobileDetect(window.navigator.userAgent);
    const isIpad =
      /Macintosh/i.test(window.navigator.userAgent) &&
      navigator.maxTouchPoints &&
      navigator.maxTouchPoints > 1;

    if (isIpad || md.tablet()) {
      deviceClass = 'is-tablet ';
      isSmallDevice = true;
      dispatch(updateUserDeviceType(UserDeviceType.TABLET));
    } else if (md.mobile()) {
      deviceClass = 'is-mobile ';
      isSmallDevice = true;
      dispatch(updateUserDeviceType(UserDeviceType.MOBILE));
    }

    if (isSmallDevice) {
      // Prevent display sleep for mobile devices
      void noSleep.enable();
    }

    const os = md.os();
    if (os === 'AndroidOS') {
      deviceClass += 'is-android';
    } else if (os === 'iOS' || os === 'iPadOS') {
      deviceClass += 'is-ios';
    } else if (!os && isIpad) {
      deviceClass += 'is-ios';
    }
    setDeviceClass(deviceClass);

    const mql = window.matchMedia('(orientation: portrait)');
    if (mql.matches) {
      setOrientationClass('portrait-device');
      dispatch(updateDeviceOrientation('portrait'));
    } else {
      setOrientationClass('landscape-device');
      dispatch(updateDeviceOrientation('landscape'));
    }

    const handleOrientationChange = (m: MediaQueryListEvent) => {
      if (m.matches) {
        setOrientationClass('portrait-device');
        dispatch(updateDeviceOrientation('portrait'));
      } else {
        setOrientationClass('landscape-device');
        dispatch(updateDeviceOrientation('landscape'));
      }
    };

    mql.addEventListener('change', handleOrientationChange);
    return () => {
      debouncedDispatchWidth.cancel();
      resizeObserver.disconnect();
      mql.removeEventListener('change', handleOrientationChange);
    };
    //eslint-disable-next-line
  }, [dispatch]);

  return {
    deviceClass,
    orientationClass,
    screenHeight,
  };
};

export default useWatchWindowSize;
