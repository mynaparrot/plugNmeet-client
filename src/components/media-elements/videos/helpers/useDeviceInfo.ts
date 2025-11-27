import { useEffect, useMemo } from 'react';

import { useAppDispatch, useAppSelector } from '../../../../store';
import { UserDeviceType } from '../../../../store/slices/interfaces/session';
import { updateIsEnabledExtendedVerticalCamView } from '../../../../store/slices/bottomIconsActivitySlice';

// breakpoints for responsive design
const TABLET_BREAKPOINT = 768;
const DESKTOP_BREAKPOINT = 1024;

export const useDeviceInfo = () => {
  const dispatch = useAppDispatch();

  const screenWidth = useAppSelector(
    (state) => state.bottomIconsActivity.screenWidth,
  );
  const isSidebarOpen = useAppSelector(
    (state) => state.roomSettings.isSidePanelOpened,
  );
  const deviceOrientation = useAppSelector(
    (state) => state.bottomIconsActivity.deviceOrientation,
  );
  const userDeviceType = useAppSelector(
    (state) => state.session.userDeviceType,
  );

  const isUserAgentMobile = useMemo(
    () => userDeviceType === UserDeviceType.MOBILE,
    [userDeviceType],
  );
  const isUserAgentTablet = useMemo(
    () => userDeviceType === UserDeviceType.TABLET,
    [userDeviceType],
  );

  const isDesktopAgent = !isUserAgentMobile && !isUserAgentTablet;
  const isMobile =
    isUserAgentMobile || (isDesktopAgent && screenWidth < TABLET_BREAKPOINT);
  const isTablet =
    isUserAgentTablet ||
    (isDesktopAgent &&
      screenWidth >= TABLET_BREAKPOINT &&
      screenWidth < DESKTOP_BREAKPOINT);

  useEffect(() => {
    // Disable extended vertical view on mobile/tablet devices
    if (isMobile || isTablet) {
      dispatch(updateIsEnabledExtendedVerticalCamView(false));
    }
  }, [dispatch, isMobile, isTablet]);

  return {
    isSidebarOpen,
    isMobile,
    isTablet,
    isDesktop: isDesktopAgent && screenWidth >= DESKTOP_BREAKPOINT,
    isPortrait: deviceOrientation === 'portrait',
  };
};
