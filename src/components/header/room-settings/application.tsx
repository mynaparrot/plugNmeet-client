import React from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@headlessui/react';
import { createSelector } from '@reduxjs/toolkit';

import languages from '../../../helpers/languages';
import { RootState, useAppDispatch, useAppSelector } from '../../../store';
import {
  updateColumnCameraPosition,
  updateColumnCameraWidth,
  updateTheme,
  updateVideoObjectFit,
} from '../../../store/slices/roomSettingsSlice';
import {
  ColumnCameraPosition,
  ColumnCameraWidth,
  VideoObjectFit,
} from '../../../store/slices/interfaces/roomSettings';

const themeSelector = createSelector(
  (state: RootState) => state.roomSettings,
  (roomSettings) => roomSettings.theme,
);
const videoObjectFitSelector = createSelector(
  (state: RootState) => state.roomSettings,
  (roomSettings) => roomSettings.videoObjectFit,
);
const columnCameraWidthSelector = createSelector(
  (state: RootState) => state.roomSettings,
  (roomSettings) => roomSettings.columnCameraWidth,
);
const columnCameraPositionSelector = createSelector(
  (state: RootState) => state.roomSettings,
  (roomSettings) => roomSettings.columnCameraPosition,
);

const ApplicationSettings = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const theme = useAppSelector(themeSelector);
  const videoObjectFit = useAppSelector(videoObjectFitSelector);
  const columnCameraWidth = useAppSelector(columnCameraWidthSelector);
  const columnCameraPosition = useAppSelector(columnCameraPositionSelector);

  const toggleTheme = () => {
    dispatch(updateTheme(theme === 'light' ? 'dark' : 'light'));
  };

  const render = () => {
    return (
      <div className="s">
        <div className="grid">
          <div className="flex items-center justify-start">
            <label
              htmlFor="language"
              className="pr-4 w-full dark:text-darkText ltr:text-left rtl:text-right"
            >
              {t('header.room-settings.language')}
            </label>
            <select
              id="language"
              name="language"
              value={i18n.languages[0]}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              className="mt-1 block w-3/5 py-2 px-3 border border-gray-300 dark:border-darkText dark:text-darkText bg-transparent rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
          <div className="flex items-center justify-between my-4">
            <Switch.Label className="pr-4 w-full dark:text-darkText ltr:text-left rtl:text-right">
              {t('header.room-settings.enable-dark-theme')}
            </Switch.Label>
            <Switch
              checked={theme === 'dark'}
              onChange={toggleTheme}
              className={`${
                theme === 'dark'
                  ? 'bg-primaryColor dark:bg-darkSecondary2'
                  : 'bg-gray-200 dark:bg-secondaryColor'
              } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
            >
              <span
                className={`${
                  theme === 'dark'
                    ? 'ltr:translate-x-6 rtl:-translate-x-5'
                    : 'ltr:translate-x-1 rtl:-translate-x-0.5'
                } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
              />
            </Switch>
          </div>
        </Switch.Group>
        <div className="grid">
          <div className="flex items-center justify-start">
            <label
              htmlFor="video-object-fit"
              className="pr-4 w-full dark:text-darkText ltr:text-left rtl:text-right"
            >
              {t('header.room-settings.video-object-fit')}
            </label>
            <select
              id="video-object-fit"
              name="video-object-fit"
              value={videoObjectFit}
              onChange={(e) =>
                dispatch(updateVideoObjectFit(e.target.value as VideoObjectFit))
              }
              className="mt-1 block w-3/5 py-2 px-3 border border-gray-300 dark:border-darkText dark:text-darkText bg-transparent rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option key={VideoObjectFit.COVER} value={VideoObjectFit.COVER}>
                {t('header.room-settings.video-object-fit-cover')}
              </option>
              <option
                key={VideoObjectFit.CONTAIN}
                value={VideoObjectFit.CONTAIN}
              >
                {t('header.room-settings.video-object-fit-contain')}
              </option>
            </select>
          </div>
        </div>
        <div className="grid py-2">
          <div className="flex items-center justify-start">
            <label
              htmlFor="column-camera-width"
              className="pr-4 w-full dark:text-darkText ltr:text-left rtl:text-right"
            >
              {t('header.room-settings.column-camera-width')}
            </label>
            <select
              id="column-camera-width"
              name="column-camera-width"
              value={columnCameraWidth}
              onChange={(e) =>
                dispatch(
                  updateColumnCameraWidth(e.target.value as ColumnCameraWidth),
                )
              }
              className="mt-1 block w-3/5 py-2 px-3 border border-gray-300 dark:border-darkText dark:text-darkText bg-transparent rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option
                key={ColumnCameraWidth.FULL_WIDTH}
                value={ColumnCameraWidth.FULL_WIDTH}
              >
                {t('header.room-settings.column-camera-width-default')}
              </option>
              <option
                key={ColumnCameraWidth.MEDIUM_WIDTH}
                value={ColumnCameraWidth.MEDIUM_WIDTH}
              >
                {t('header.room-settings.column-camera-width-medium')}
              </option>
              <option
                key={ColumnCameraWidth.SMALL_WIDTH}
                value={ColumnCameraWidth.SMALL_WIDTH}
              >
                {t('header.room-settings.column-camera-width-small')}
              </option>
            </select>
          </div>
        </div>
        <div className="grid">
          <div className="flex items-center justify-start">
            <label
              htmlFor="column-camera-position"
              className="pr-4 w-full dark:text-darkText ltr:text-left rtl:text-right"
            >
              {t('header.room-settings.column-camera-position')}
            </label>
            <select
              id="column-camera-position"
              name="column-camera-position"
              value={columnCameraPosition}
              onChange={(e) =>
                dispatch(
                  updateColumnCameraPosition(
                    e.target.value as ColumnCameraPosition,
                  ),
                )
              }
              className="mt-1 block w-3/5 py-2 px-3 border border-gray-300 dark:border-darkText dark:text-darkText bg-transparent rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option
                key={ColumnCameraPosition.LEFT}
                value={ColumnCameraPosition.LEFT}
              >
                {t('header.room-settings.column-camera-position-left')}
              </option>
              <option
                key={ColumnCameraPosition.TOP}
                value={ColumnCameraPosition.TOP}
              >
                {t('header.room-settings.column-camera-position-top')}
              </option>
              <option
                key={ColumnCameraPosition.BOTTOM}
                value={ColumnCameraPosition.BOTTOM}
              >
                {t('header.room-settings.column-camera-position-bottom')}
              </option>
            </select>
          </div>
        </div>
      </div>
    );
  };

  return <>{render()}</>;
};

export default ApplicationSettings;
