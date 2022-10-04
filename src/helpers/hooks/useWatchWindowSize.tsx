import { useEffect, useState } from 'react';
import MobileDetect from 'mobile-detect';
import { Room } from 'livekit-client';

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

const useWatchWindowSize = (currentRoom: Room | undefined) => {
  const dispatch = useAppDispatch();
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
    //eslint-disable-next-line
  }, [currentRoom?.state]);

  useEffect(() => {
    window.onresize = () => {
      dispatch(updateScreenWidth(window.innerWidth));
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
    };

    dispatch(updateScreenWidth(window.innerWidth));
    dispatch(updateScreenHeight(window.innerHeight));

    if (window.innerWidth < 1024) {
      dispatch(updateIsActiveParticipantsPanel(false));
      dispatch(updateIsActiveChatPanel(false));
    }

    let deviceClass = 'is-pc';
    const md = new MobileDetect(window.navigator.userAgent);
    const isIpad =
      /Macintosh/i.test(window.navigator.userAgent) &&
      navigator.maxTouchPoints &&
      navigator.maxTouchPoints > 1;

    if (isIpad || md.tablet()) {
      deviceClass = 'is-tablet ';
      dispatch(updateUserDeviceType(UserDeviceType.TABLET));
    } else if (md.mobile()) {
      deviceClass = 'is-mobile ';
      dispatch(updateUserDeviceType(UserDeviceType.MOBILE));
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
