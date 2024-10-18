import React from 'react';
import { Field, Label, Switch } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../../store';
import { updateAllowPlayAudioNotification } from '../../../store/slices/roomSettingsSlice';

const Notification = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const allowPlayAudioNotification = useAppSelector(
    (state) => state.roomSettings.allowPlayAudioNotification,
  );

  const toggleAudioNotification = () => {
    dispatch(updateAllowPlayAudioNotification(!allowPlayAudioNotification));
  };

  const render = () => {
    return (
      <Field>
        <div className="flex items-center justify-between mb-2">
          <Label className="pr-4 w-full dark:text-darkText ltr:text-left rtl:text-right">
            {t('header.room-settings.allow-audio-notification')}
          </Label>
          <Switch
            checked={allowPlayAudioNotification}
            onChange={toggleAudioNotification}
            className={`${
              allowPlayAudioNotification
                ? 'bg-primaryColor dark:bg-darkSecondary2'
                : 'bg-gray-200 dark:bg-secondaryColor'
            } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            <span
              className={`${
                allowPlayAudioNotification
                  ? 'ltr:translate-x-6 rtl:-translate-x-6'
                  : 'ltr:translate-x-1 rtl:translate-x-0'
              } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
          </Switch>
        </div>
      </Field>
    );
  };

  return <div className="mt-2">{render()}</div>;
};

export default Notification;
