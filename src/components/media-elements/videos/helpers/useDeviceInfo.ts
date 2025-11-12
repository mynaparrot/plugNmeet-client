import { useAppSelector } from '../../../../store';
import { UserDeviceType } from '../../../../store/slices/interfaces/session';

export const useDeviceInfo = () => {
  const userDeviceType = useAppSelector(
    (state) => state.session.userDeviceType,
  );
  const isSidebarOpen = useAppSelector(
    (state) => state.roomSettings.isSidePanelOpened,
  );
  const deviceOrientation = useAppSelector(
    (state) => state.bottomIconsActivity.deviceOrientation,
  );

  return {
    isSidebarOpen,
    isMobile: userDeviceType === UserDeviceType.MOBILE,
    isTablet: userDeviceType === UserDeviceType.TABLET,
    isDesktop: userDeviceType === UserDeviceType.DESKTOP,
    isPortrait: deviceOrientation === 'portrait',
  };
};
