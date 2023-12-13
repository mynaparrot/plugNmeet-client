import React, { useState, useEffect } from 'react';
import { Switch } from '@headlessui/react';
import { createSelector } from '@reduxjs/toolkit';
import { useTranslation } from 'react-i18next';
import { VideoQuality } from 'livekit-client';

import {
  RootState,
  store,
  useAppDispatch,
  useAppSelector,
} from '../../../store';
import {
  updateActivateWebcamsView,
  updateActiveScreenSharingView,
  updateRoomVideoQuality,
} from '../../../store/slices/roomSettingsSlice';

const activateWebcamsViewSelector = createSelector(
  (state: RootState) => state.roomSettings,
  (roomSettings) => roomSettings.activateWebcamsView,
);

const activeScreenSharingViewSelector = createSelector(
  (state: RootState) => state.roomSettings,
  (roomSettings) => roomSettings.activeScreenSharingView,
);

const DataSavings = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const [videoQuality, setVideoQuality] = useState<VideoQuality>(
    store.getState().roomSettings.roomVideoQuality,
  );

  useEffect(() => {
    dispatch(updateRoomVideoQuality(videoQuality));
  }, [dispatch, videoQuality]);

  const activateWebcamsView = useAppSelector(activateWebcamsViewSelector);
  const activeScreenSharingView = useAppSelector(
    activeScreenSharingViewSelector,
  );

  const toggleWebcamView = () => {
    dispatch(updateActivateWebcamsView(!activateWebcamsView));
  };

  const toggleScreenShareView = () => {
    dispatch(updateActiveScreenSharingView(!activeScreenSharingView));
  };

  const render = () => {
    return (
      <>
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="quality"
            className="pr-4 w-full dark:text-darkText ltr:text-left rtl:text-right"
          >
            {t('header.room-settings.video-quality')}
          </label>
          <select
            id="quality"
            name="quality"
            className="mt-1 block py-2 px-3 border border-gray-300 dark:border-darkText dark:text-darkText bg-transparent rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            value={videoQuality}
            onChange={(e) => setVideoQuality(Number(e.target.value))}
          >
            <option value={VideoQuality.LOW}>
              {t('header.room-settings.low')}
            </option>
            <option value={VideoQuality.MEDIUM}>
              {t('header.room-settings.medium')}
            </option>
            <option value={VideoQuality.HIGH}>
              {t('header.room-settings.high')}
            </option>
          </select>
        </div>

        <Switch.Group>
          <div className="flex items-center justify-between mb-2">
            <Switch.Label className="pr-4 w-full dark:text-darkText ltr:text-left rtl:text-right">
              {t('header.room-settings.show-webcams')}
            </Switch.Label>
            <Switch
              checked={activateWebcamsView}
              onChange={toggleWebcamView}
              className={`${
                activateWebcamsView
                  ? 'bg-primaryColor dark:bg-darkSecondary2'
                  : 'bg-gray-200 dark:bg-secondaryColor'
              } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
            >
              <span
                className={`${
                  activateWebcamsView
                    ? 'ltr:translate-x-6 rtl:-translate-x-6'
                    : 'ltr:translate-x-1 rtl:translate-x-0'
                } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
              />
            </Switch>
          </div>
          <div className="flex items-center justify-between">
            <Switch.Label className="pr-4 w-full dark:text-darkText ltr:text-left rtl:text-right">
              {t('header.room-settings.show-screen-share')}
            </Switch.Label>
            <Switch
              checked={activeScreenSharingView}
              onChange={toggleScreenShareView}
              className={`${
                activeScreenSharingView
                  ? 'bg-primaryColor dark:bg-darkSecondary2'
                  : 'bg-gray-200 dark:bg-secondaryColor'
              } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
            >
              <span
                className={`${
                  activeScreenSharingView
                    ? 'ltr:translate-x-6 rtl:-translate-x-6'
                    : 'ltr:translate-x-1 rtl:translate-x-0'
                } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
              />
            </Switch>
          </div>
        </Switch.Group>
      </>
    );
  };

  return <div className="mt-2">{render()}</div>;
};

export default DataSavings;
