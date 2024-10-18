import { useEffect, useState } from 'react';
import { isURL } from 'validator';

import { useAppSelector } from '../../store';

interface CustomLogo {
  main_logo_light?: string;
  main_logo_dark?: string;
  waiting_room_logo_light?: string;
  waiting_room_logo_dark?: string;
}

export type logoType = 'main' | 'waiting-room';

const useLogo = (logo_type: logoType = 'main') => {
  const assetPath = (window as any).STATIC_ASSETS_PATH ?? './assets';
  const theme = useAppSelector((state) => state.roomSettings.theme);
  const [logo, setLogo] = useState<string>(`${assetPath}/imgs/main-logo.png`);

  useEffect(() => {
    const logo: string | CustomLogo = (window as any).CUSTOM_LOGO;
    const validUrlOptions = {
      protocols: ['http', 'https'],
      require_protocol: true,
    };

    if (typeof logo === 'undefined') {
      return;
    }
    if (typeof logo === 'string' && isURL(logo, validUrlOptions)) {
      setLogo(logo);
      return;
    }

    if (typeof logo !== 'object') {
      return;
    }

    if (logo_type === 'waiting-room') {
      if (
        theme === 'dark' &&
        logo.waiting_room_logo_dark &&
        isURL(logo.waiting_room_logo_dark, validUrlOptions)
      ) {
        setLogo(logo.waiting_room_logo_dark);
      } else if (
        logo.waiting_room_logo_light &&
        isURL(logo.waiting_room_logo_light, validUrlOptions)
      ) {
        setLogo(logo.waiting_room_logo_light);
      }
    } else {
      if (
        theme === 'dark' &&
        logo.main_logo_dark &&
        isURL(logo.main_logo_dark, validUrlOptions)
      ) {
        setLogo(logo.main_logo_dark);
      } else if (
        logo.main_logo_light &&
        isURL(logo.main_logo_light, validUrlOptions)
      ) {
        setLogo(logo.main_logo_light);
      }
    }
  }, [theme, logo_type]);

  return logo;
};

export default useLogo;
