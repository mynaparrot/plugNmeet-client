import React from 'react';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../../store';
import { updateAllowPlayAudioNotification } from '../../../store/slices/roomSettingsSlice';
import SettingsSwitch from '../../../helpers/ui/settingsSwitch';

const Notification = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const allowPlayAudioNotification = useAppSelector(
    (state) => state.roomSettings.allowPlayAudioNotification,
  );

  const toggleAudioNotification = () => {
    dispatch(updateAllowPlayAudioNotification(!allowPlayAudioNotification));
  };

  return (
    <div className="mt-2">
      <SettingsSwitch
        label={t('header.room-settings.allow-audio-notification')}
        enabled={allowPlayAudioNotification}
        onChange={toggleAudioNotification}
      />
    </div>
  );
};

export default Notification;
