import React, { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Field,
  Label,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Switch,
} from '@headlessui/react';
import { Listbox, Transition } from '@headlessui/react';

import languages from '../../../helpers/languages';
import { useAppDispatch, useAppSelector } from '../../../store';
import {
  updateColumnCameraPosition,
  updateColumnCameraWidth,
  updateFocusActiveSpeakerWebcam,
  updateTheme,
  updateVideoObjectFit,
} from '../../../store/slices/roomSettingsSlice';
import {
  ColumnCameraPosition,
  ColumnCameraWidth,
  VideoObjectFit,
} from '../../../store/slices/interfaces/roomSettings';

const ApplicationSettings = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.roomSettings.theme);
  const videoObjectFit = useAppSelector(
    (state) => state.roomSettings.videoObjectFit,
  );
  const columnCameraWidth = useAppSelector(
    (state) => state.roomSettings.columnCameraWidth,
  );
  const columnCameraPosition = useAppSelector(
    (state) => state.roomSettings.columnCameraPosition,
  );
  const focusActiveSpeakerWebcam = useAppSelector(
    (state) => state.roomSettings.focusActiveSpeakerWebcam,
  );

  const toggleTheme = () => {
    dispatch(updateTheme(theme === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className="s">
      <div className="grid">
        <div className="flex items-center justify-start">
          <label
            htmlFor="language"
            className="pr-4 w-full text-sm text-Gray-950 ltr:text-left rtl:text-right"
          >
            {t('header.room-settings.language')}
          </label>
          <Listbox
            value={i18n.languages[0]}
            onChange={(e) => i18n.changeLanguage(e)}
          >
            <div className="relative mt-1">
              <ListboxButton className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
                <span className="block truncate">{i18n.languages[0]}</span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  icon
                </span>
              </ListboxButton>
              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <ListboxOptions className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                  {languages.map(({ code, text }) => {
                    return (
                      <ListboxOption
                        key={code}
                        value={code}
                        className={({ focus }) =>
                          `relative cursor-default select-none py-2 pl-10 pr-4 ${
                            focus
                              ? 'bg-amber-100 text-amber-900'
                              : 'text-gray-900'
                          }`
                        }
                      >
                        {({ selected }) => (
                          <>
                            <span
                              className={`block truncate ${
                                selected ? 'font-medium' : 'font-normal'
                              }`}
                            >
                              {text}
                            </span>
                            {selected ? (
                              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
                                icon
                              </span>
                            ) : null}
                          </>
                        )}
                      </ListboxOption>
                    );
                  })}
                </ListboxOptions>
              </Transition>
            </div>
          </Listbox>
        </div>
      </div>
      <Field>
        <div className="flex items-center justify-between my-4">
          <Label className="pr-4 w-full text-sm text-Gray-950 ltr:text-left rtl:text-right">
            {t('header.room-settings.enable-dark-theme')}
          </Label>
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
      </Field>
      <div className="grid">
        <div className="flex items-center justify-start">
          <label
            htmlFor="video-object-fit"
            className="pr-4 w-full text-sm text-Gray-950 ltr:text-left rtl:text-right"
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
            className="mt-1 block w-3/5 py-2 px-3 border border-gray-300   bg-transparent rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option key={VideoObjectFit.COVER} value={VideoObjectFit.COVER}>
              {t('header.room-settings.video-object-fit-cover')}
            </option>
            <option key={VideoObjectFit.CONTAIN} value={VideoObjectFit.CONTAIN}>
              {t('header.room-settings.video-object-fit-contain')}
            </option>
          </select>
        </div>
      </div>
      <div className="grid py-2">
        <div className="flex items-center justify-start">
          <label
            htmlFor="column-camera-width"
            className="pr-4 w-full text-sm text-Gray-950 ltr:text-left rtl:text-right"
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
            className="mt-1 block w-3/5 py-2 px-3 border border-gray-300   bg-transparent rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
            className="pr-4 w-full text-sm text-Gray-950 ltr:text-left rtl:text-right"
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
            className="mt-1 block w-3/5 py-2 px-3 border border-gray-300   bg-transparent rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
      <Field>
        <div className="flex items-center justify-between my-4">
          <Label className="pr-4 w-full text-sm text-Gray-950 ltr:text-left rtl:text-right">
            {t('header.room-settings.focus-active-speaker-webcam')}
          </Label>
          <Switch
            checked={!!focusActiveSpeakerWebcam}
            onChange={() =>
              dispatch(
                updateFocusActiveSpeakerWebcam(!focusActiveSpeakerWebcam),
              )
            }
            className={`${
              focusActiveSpeakerWebcam
                ? 'bg-primaryColor dark:bg-darkSecondary2'
                : 'bg-gray-200 dark:bg-secondaryColor'
            } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            <span
              className={`${
                focusActiveSpeakerWebcam
                  ? 'ltr:translate-x-6 rtl:-translate-x-5'
                  : 'ltr:translate-x-1 rtl:-translate-x-0.5'
              } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
          </Switch>
        </div>
      </Field>
    </div>
  );
};

export default ApplicationSettings;
