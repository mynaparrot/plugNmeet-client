import { useEffect, useState, useRef } from 'react';
import MobileDetect from 'mobile-detect';
import type { Room } from 'livekit-client';
import NoSleep from 'nosleep.js';

import {
  updateDeviceOrientation,
  updateIsActiveChatPanel,
  updateIsActiveParticipantsPanel,
  updateScreenHeight,
  updateScreenWidth,
} from '../../store/slices/bottomIconsActivitySlice';
import { store, useAppDispatch } from '../../store';
import { updateUserDeviceType } from '../../store/slices/sessionSlice';
import { UserDeviceType } from '../../store/slices/interfaces/session';
import useStorePreviousInt from './useStorePreviousInt';
import { doRefreshWhiteboard } from '../../store/slices/whiteboard';

const useWatchWindowSize = (currentRoom: Room | undefined) => {
  const dispatch = useAppDispatch();
  const noSleep = new NoSleep();
  const initialRef = useRef(false);

  const [deviceClass, setDeviceClass] = useState<string>('');
  const [orientationClass, setOrientationClass] =
    useState<string>('landscape-device');
  const [screenHeight, setScreenHeight] = useState<string>('');
  const [screenWidth, setScreenWidth] = useState<number>(0);
  const preScreenWidth = useStorePreviousInt(screenWidth);

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

  useEffect(() => {
    if (preScreenWidth && preScreenWidth !== screenWidth) {
      dispatch(updateScreenWidth(window.innerWidth));
      if (store.getState().bottomIconsActivity.isActiveWhiteboard) {
        dispatch(doRefreshWhiteboard());
      }
    }
    //eslint-disable-next-line
  }, [preScreenWidth, screenWidth]);

  useEffect(() => {
    if (initialRef.current) {
      return;
    }
    initialRef.current = true;

    window.addEventListener('resize', () => {
      setScreenWidth(window.innerWidth);
      dispatch(updateScreenHeight(window.innerHeight));
      adjustScreenSize();

      const isActiveChatPanel =
        store.getState().bottomIconsActivity.isActiveChatPanel;
      const isActiveParticipantsPanel =
        store.getState().bottomIconsActivity.isActiveParticipantsPanel;
      if (
        window.innerWidth < 1024 &&
        isActiveChatPanel &&
        isActiveParticipantsPanel
      ) {
        // if both open better to close one
        dispatch(updateIsActiveParticipantsPanel(false));
      }
    });

    setScreenWidth(window.innerWidth);
    dispatch(updateScreenWidth(window.innerWidth));
    dispatch(updateScreenHeight(window.innerHeight));

    if (window.innerWidth < 1024) {
      dispatch(updateIsActiveParticipantsPanel(false));
      dispatch(updateIsActiveChatPanel(false));
    }

    let deviceClass = 'is-pc',
      isSmallDevice = false;
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
      noSleep.enable().then();
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

    mql.addEventListener('change', (m) => {
      if (m.matches) {
        setOrientationClass('portrait-device');
        dispatch(updateDeviceOrientation('portrait'));
      } else {
        setOrientationClass('landscape-device');
        dispatch(updateDeviceOrientation('landscape'));
      }
    });
    //eslint-disable-next-line
  }, []);

  return {
    deviceClass,
    orientationClass,
    screenHeight,
  };
};

export default useWatchWindowSize;
