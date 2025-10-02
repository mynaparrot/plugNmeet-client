import React from 'react';
import { useTranslation } from 'react-i18next';

import languages from '../../../helpers/languages';
import { useAppDispatch, useAppSelector } from '../../../store';
import {
  updateFocusActiveSpeakerWebcam,
  updateTheme,
} from '../../../store/slices/roomSettingsSlice';
import SettingsSwitch from '../../../helpers/ui/settingsSwitch';
import Dropdown from '../../../helpers/ui/dropdown';

const ApplicationSettings = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.roomSettings.theme);
  const focusActiveSpeakerWebcam = useAppSelector(
    (state) => state.roomSettings.focusActiveSpeakerWebcam,
  );

  const toggleTheme = () => {
    dispatch(updateTheme(theme === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className="s">
      <Dropdown
        label={t('header.room-settings.language')}
        id="language"
        value={i18n.languages[0]}
        onChange={(e) => i18n.changeLanguage(e as string)}
        options={languages.map((l) => {
          return {
            value: l.code,
            text: l.text,
          };
        })}
        direction="horizontal"
      />
      <SettingsSwitch
        label={t('header.room-settings.enable-dark-theme')}
        enabled={theme === 'dark'}
        onChange={toggleTheme}
        customCss="my-4"
      />
      <SettingsSwitch
        label={t('header.room-settings.focus-active-speaker-webcam')}
        enabled={!!focusActiveSpeakerWebcam}
        onChange={() =>
          dispatch(updateFocusActiveSpeakerWebcam(!focusActiveSpeakerWebcam))
        }
      />
    </div>
  );
};

export default ApplicationSettings;
