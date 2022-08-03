import React from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@headlessui/react';
import { createSelector } from '@reduxjs/toolkit';

import languages from '../../../helpers/languages';
import { RootState, useAppDispatch, useAppSelector } from '../../../store';
import { updateEnabledDarkMode } from '../../../store/slices/roomSettingsSlice';

const enabledDarkModeSelector = createSelector(
  (state: RootState) => state.roomSettings.enabledDarkMode,
  (enabledDarkMode) => enabledDarkMode,
);

const ApplicationSettings = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const enabledDarkMode = useAppSelector(enabledDarkModeSelector);

  const toggleEnabledDarkMode = () => {
    dispatch(updateEnabledDarkMode(!enabledDarkMode));
  };

  const render = () => {
    return (
      <div className="s">
        <div className="grid">
          <div className="flex items-center justify-start">
            <label
              htmlFor="language"
              className="w-2/5 block text-sm font-medium text-gray-700 mr-5"
            >
              {t('header.room-settings.language')}
            </label>
            <select
              id="language"
              name="language"
              value={i18n.languages[0]}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              className="mt-1 block w-3/5 py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              {languages.map(({ code, text }) => {
                return (
                  <option key={code} value={code}>
                    {text}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
        <Switch.Group>
          <div className="flex items-center justify-between mb-2">
            <Switch.Label className="pr-4 w-full">
              {t('header.room-settings.enable-dark-theme')}
            </Switch.Label>
            <Switch
              checked={enabledDarkMode}
              onChange={toggleEnabledDarkMode}
              className={`${
                enabledDarkMode ? 'bg-primaryColor' : 'bg-gray-200'
              } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
            >
              <span
                className={`${
                  enabledDarkMode ? 'translate-x-6' : 'translate-x-1'
                } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
              />
            </Switch>
          </div>
        </Switch.Group>
      </div>
    );
  };

  return <>{render()}</>;
};

export default ApplicationSettings;
