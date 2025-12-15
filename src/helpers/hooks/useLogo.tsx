import { useEffect, useState } from 'react';

import { useAppSelector } from '../../store';
import { getConfigValue, isValidHttpUrl } from '../utils';

interface CustomLogo {
  main_logo_light?: string;
  main_logo_dark?: string;
  waiting_room_logo_light?: string;
  waiting_room_logo_dark?: string;
}

const useLogo = () => {
  const theme = useAppSelector((state) => state.roomSettings.theme);

  const assetPath = getConfigValue(
    'staticAssetsPath',
    './assets',
    'STATIC_ASSETS_PATH',
  );

  const [logo, setLogo] = useState<string>(`${assetPath}/imgs/main-logo.png`);
  const [darkLogo, setDarkLogo] = useState<string>(
    `${assetPath}/imgs/PlugNmeet-Dark.png`,
  );

  useEffect(() => {
    const customLogo = getConfigValue<string | CustomLogo>(
      'customLogo',
      '',
      'CUSTOM_LOGO',
    );

    if (!customLogo) {
      return;
    }

    if (typeof customLogo === 'string' && isValidHttpUrl(customLogo)) {
      setLogo(customLogo);
      setDarkLogo(customLogo);
      return;
    }

    if (typeof customLogo !== 'object') {
      return;
    }

    // Set light logo
    if (
      customLogo.main_logo_light &&
      isValidHttpUrl(customLogo.main_logo_light)
    ) {
      setLogo(customLogo.main_logo_light);
    }

    // Set dark logo
    if (
      customLogo.main_logo_dark &&
      isValidHttpUrl(customLogo.main_logo_dark)
    ) {
      setDarkLogo(customLogo.main_logo_dark);
    }
  }, []);

  // Return the appropriate logo based on theme
  return theme === 'dark' ? darkLogo : logo;
};

export default useLogo;
