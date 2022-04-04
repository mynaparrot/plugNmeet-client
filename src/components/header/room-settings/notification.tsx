import React from 'react';
import { Switch } from '@headlessui/react';
import { createSelector } from '@reduxjs/toolkit';
import { useTranslation } from 'react-i18next';

import { RootState, useAppDispatch, useAppSelector } from '../../../store';
import { updateAllowPlayAudioNotification } from '../../../store/slices/roomSettingsSlice';

const allowPlayAudioNotificationSelector = createSelector(
  (state: RootState) => state.roomSettings.allowPlayAudioNotification,
  (allowPlayAudioNotification) => allowPlayAudioNotification,
);
const Notification = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const allowPlayAudioNotification = useAppSelector(
    allowPlayAudioNotificationSelector,
  );

  const toggleAudioNotification = () => {
    dispatch(updateAllowPlayAudioNotification(!allowPlayAudioNotification));
  };

  const render = () => {
    return (
      <Switch.Group>
        <div className="flex items-center justify-between mb-2">
          <Switch.Label className="pr-4 w-full">
            {t('header.room-settings.allow-audio-notification')}
          </Switch.Label>
          <Switch
            checked={allowPlayAudioNotification}
            onChange={toggleAudioNotification}
            className={`${
              allowPlayAudioNotification ? 'bg-brandColor1' : 'bg-gray-200'
            } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:bg-brandColor2`}
          >
            <span
              className={`${
                allowPlayAudioNotification ? 'translate-x-6' : 'translate-x-1'
              } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
          </Switch>
        </div>
      </Switch.Group>
    );
  };

  return <div className="mt-2">{render()}</div>;
};

export default Notification;
