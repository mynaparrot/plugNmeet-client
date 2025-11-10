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
  const assetPath = getConfigValue(
    'staticAssetsPath',
    './assets',
    'STATIC_ASSETS_PATH',
  );
  const theme = useAppSelector((state) => state.roomSettings.theme);
  const [logo, setLogo] = useState<string>(`${assetPath}/imgs/main-logo.png`);

  useEffect(() => {
    const logo = getConfigValue<string | CustomLogo>(
      'customLogo',
      '',
      'CUSTOM_LOGO',
    );

    if (!logo) {
      return;
    }

    if (typeof logo === 'string' && isValidHttpUrl(logo)) {
      setLogo(logo);
      return;
    }

    if (typeof logo !== 'object') {
      return;
    }

    if (
      theme === 'dark' &&
      logo.main_logo_dark &&
      isValidHttpUrl(logo.main_logo_dark)
    ) {
      setLogo(logo.main_logo_dark);
    } else if (logo.main_logo_light && isValidHttpUrl(logo.main_logo_light)) {
      setLogo(logo.main_logo_light);
    }
  }, [theme]);

  return logo;
};

export default useLogo;
