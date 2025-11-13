import { useAppSelector } from '../../../../store';

// breakpoints for responsive design
const TABLET_BREAKPOINT = 768;
const DESKTOP_BREAKPOINT = 1024;

export const useDeviceInfo = () => {
  const screenWidth = useAppSelector(
    (state) => state.bottomIconsActivity.screenWidth,
  );
  const isSidebarOpen = useAppSelector(
    (state) => state.roomSettings.isSidePanelOpened,
  );
  const deviceOrientation = useAppSelector(
    (state) => state.bottomIconsActivity.deviceOrientation,
  );

  return {
    isSidebarOpen,
    isMobile: screenWidth < TABLET_BREAKPOINT,
    isTablet:
      screenWidth >= TABLET_BREAKPOINT && screenWidth < DESKTOP_BREAKPOINT,
    isDesktop: screenWidth >= DESKTOP_BREAKPOINT,
    isPortrait: deviceOrientation === 'portrait',
  };
};
