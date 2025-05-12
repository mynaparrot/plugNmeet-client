import React, { Fragment, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Field,
  Label,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Switch,
  Listbox,
  Transition,
} from '@headlessui/react';

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
import { CheckMarkIcon } from '../../../assets/Icons/CheckMarkIcon';
import { DropdownIconSVG } from '../../../assets/Icons/DropdownIconSVG';

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
  const [selectedLangText, setSelectedLangText] = useState<string>();

  useEffect(() => {
    const lang = i18n.languages[0];
    for (let i = 0; i < languages.length; i++) {
      const l = languages[i];
      if (l.code === lang) {
        setSelectedLangText(l.text);
        break;
      }
    }
  }, [i18n.languages]);

  const toggleTheme = () => {
    dispatch(updateTheme(theme === 'light' ? 'dark' : 'light'));
  };

  const getVideoObjectFitText = (value: VideoObjectFit) => {
    return value === VideoObjectFit.COVER
      ? t('header.room-settings.video-object-fit-cover')
      : t('header.room-settings.video-object-fit-contain');
  };

  const getColumnCameraWidthText = (value: ColumnCameraWidth) => {
    switch (value) {
      case ColumnCameraWidth.FULL_WIDTH:
        return t('header.room-settings.column-camera-width-default');
      case ColumnCameraWidth.MEDIUM_WIDTH:
        return t('header.room-settings.column-camera-width-medium');
      case ColumnCameraWidth.SMALL_WIDTH:
        return t('header.room-settings.column-camera-width-small');
    }
  };

  const getColumnCameraPositionText = (value: ColumnCameraPosition) => {
    switch (value) {
      case ColumnCameraPosition.LEFT:
        return t('header.room-settings.column-camera-position-left');
      case ColumnCameraPosition.TOP:
        return t('header.room-settings.column-camera-position-top');
      case ColumnCameraPosition.BOTTOM:
        return t('header.room-settings.column-camera-position-bottom');
    }
  };

  return (
    <div className="s">
      <Field>
        <div className="flex items-center justify-start">
          <Label
            htmlFor="language"
            className="pr-4 flex-1 text-sm text-Gray-950 ltr:text-left rtl:text-right"
          >
            {t('header.room-settings.language')}
          </Label>
          <Listbox
            value={i18n.languages[0]}
            onChange={(e) => i18n.changeLanguage(e)}
          >
            <div className="relative w-full max-w-[250px]">
              <ListboxButton
                className={`h-10 full rounded-[8px] border border-Gray-300 bg-white shadow-input w-full px-3 outline-none focus:border-[rgba(0,161,242,1)] focus:shadow-inputFocus focus:shadow-inputFocus text-left text-sm text-Gray-950`}
              >
                <span className="block truncate">{selectedLangText}</span>
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                  <DropdownIconSVG />
                </span>
              </ListboxButton>
              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-[15px] bg-white p-1 text-sm shadow-dropdownMenu border border-Gray-100 focus:outline-none scrollBar scrollBar2 grid gap-0.5">
                  {languages.map(({ code, text }) => {
                    return (
                      <ListboxOption
                        key={code}
                        value={code}
                        className={({ focus, selected }) =>
                          `relative cursor-default select-none py-2 px-3 rounded-[8px] ${
                            focus ? 'bg-Blue2-50' : ''
                          } ${selected ? 'bg-Blue2-50' : ''}`
                        }
                      >
                        {({ selected }) => (
                          <>
                            <span className={`block truncate`}>{text}</span>
                            {selected ? (
                              <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-Blue2-500">
                                <CheckMarkIcon />
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
      </Field>
      <Field>
        <div className="flex items-center justify-between my-4">
          <Label className="pr-4 w-full text-sm text-Gray-950 ltr:text-left rtl:text-right">
            {t('header.room-settings.enable-dark-theme')}
          </Label>
          <Switch
            checked={theme === 'dark'}
            onChange={toggleTheme}
            className={`${
              theme === 'dark' ? 'bg-Blue2-500' : 'bg-Gray-200'
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
      {/* Video Object Fit Dropdown */}
      <Field>
        <div className="flex items-center justify-start">
          <Label className="pr-4 flex-1 text-sm text-Gray-950 ltr:text-left rtl:text-right">
            {t('header.room-settings.video-object-fit')}
          </Label>
          <Listbox
            value={videoObjectFit}
            onChange={(value) => dispatch(updateVideoObjectFit(value))}
          >
            <div className="relative w-full max-w-[250px]">
              <ListboxButton
                className={`h-10 full rounded-[8px] border border-Gray-300 bg-white shadow-input w-full px-3 outline-none focus:border-[rgba(0,161,242,1)] focus:shadow-inputFocus focus:shadow-inputFocus text-left text-sm text-Gray-950`}
              >
                <span className="block truncate">
                  {getVideoObjectFitText(videoObjectFit)}
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                  <DropdownIconSVG />
                </span>
              </ListboxButton>
              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-[15px] bg-white p-1 text-sm shadow-dropdownMenu border border-Gray-100 focus:outline-none scrollBar scrollBar2 grid gap-0.5">
                  {Object.values(VideoObjectFit).map((value) => (
                    <ListboxOption
                      key={value}
                      value={value}
                      className={({ focus, selected }) =>
                        `relative cursor-default select-none py-2 px-3 rounded-[8px] ${
                          focus ? 'bg-Blue2-50' : ''
                        } ${selected ? 'bg-Blue2-50' : ''}`
                      }
                    >
                      {({ selected }) => (
                        <>
                          <span className={`block truncate`}>
                            {getVideoObjectFitText(value)}
                          </span>
                          {selected ? (
                            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-Blue2-500">
                              <CheckMarkIcon />
                            </span>
                          ) : null}
                        </>
                      )}
                    </ListboxOption>
                  ))}
                </ListboxOptions>
              </Transition>
            </div>
          </Listbox>
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
      {/* Column Camera Width Dropdown */}
      <Field>
        <div className="flex items-center justify-start py-2">
          <Label className="pr-4 flex-1 text-sm text-Gray-950 ltr:text-left rtl:text-right">
            {t('header.room-settings.column-camera-width')}
          </Label>
          <Listbox
            value={columnCameraWidth}
            onChange={(value) => dispatch(updateColumnCameraWidth(value))}
          >
            <div className="relative w-full max-w-[250px]">
              <ListboxButton
                className={`h-10 full rounded-[8px] border border-Gray-300 bg-white shadow-input w-full px-3 outline-none focus:border-[rgba(0,161,242,1)] focus:shadow-inputFocus focus:shadow-inputFocus text-left text-sm text-Gray-950`}
              >
                <span className="block truncate">
                  {getColumnCameraWidthText(columnCameraWidth)}
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                  <DropdownIconSVG />
                </span>
              </ListboxButton>
              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-[15px] bg-white p-1 text-sm shadow-dropdownMenu border border-Gray-100 focus:outline-none scrollBar scrollBar2 grid gap-0.5">
                  {Object.values(ColumnCameraWidth).map((value) => (
                    <ListboxOption
                      key={value}
                      value={value}
                      className={({ focus, selected }) =>
                        `relative cursor-default select-none py-2 px-3 rounded-[8px] ${
                          focus ? 'bg-Blue2-50' : ''
                        } ${selected ? 'bg-Blue2-50' : ''}`
                      }
                    >
                      {({ selected }) => (
                        <>
                          <span className={`block truncate`}>
                            {getColumnCameraWidthText(value)}
                          </span>
                          {selected ? (
                            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-Blue2-500">
                              <CheckMarkIcon />
                            </span>
                          ) : null}
                        </>
                      )}
                    </ListboxOption>
                  ))}
                </ListboxOptions>
              </Transition>
            </div>
          </Listbox>
        </div>
      </Field>
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
      {/* Column Camera Position Dropdown */}
      <Field>
        <div className="flex items-center justify-start">
          <Label className="pr-4 flex-1 text-sm text-Gray-950 ltr:text-left rtl:text-right">
            {t('header.room-settings.column-camera-position')}
          </Label>
          <Listbox
            value={columnCameraPosition}
            onChange={(value) => dispatch(updateColumnCameraPosition(value))}
          >
            <div className="relative w-full max-w-[250px]">
              <ListboxButton
                className={`h-10 full rounded-[8px] border border-Gray-300 bg-white shadow-input w-full px-3 outline-none focus:border-[rgba(0,161,242,1)] focus:shadow-inputFocus focus:shadow-inputFocus text-left text-sm text-Gray-950`}
              >
                <span className="block truncate">
                  {getColumnCameraPositionText(columnCameraPosition)}
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                  <DropdownIconSVG />
                </span>
              </ListboxButton>
              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <ListboxOptions className="absolute bottom-11 z-10 mt-1 max-h-60 w-full overflow-auto rounded-[15px] bg-white p-1 text-sm shadow-dropdownMenu border border-Gray-100 focus:outline-none scrollBar scrollBar2 grid gap-0.5">
                  {Object.values(ColumnCameraPosition).map((value) => (
                    <ListboxOption
                      key={value}
                      value={value}
                      className={({ focus, selected }) =>
                        `relative cursor-default select-none py-2 px-3 rounded-[8px] ${
                          focus ? 'bg-Blue2-50' : ''
                        } ${selected ? 'bg-Blue2-50' : ''}`
                      }
                    >
                      {({ selected }) => (
                        <>
                          <span className={`block truncate`}>
                            {getColumnCameraPositionText(value)}
                          </span>
                          {selected ? (
                            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-Blue2-500">
                              <CheckMarkIcon />
                            </span>
                          ) : null}
                        </>
                      )}
                    </ListboxOption>
                  ))}
                </ListboxOptions>
              </Transition>
            </div>
          </Listbox>
        </div>
      </Field>
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
              focusActiveSpeakerWebcam ? 'bg-Blue2-500' : 'bg-Gray-200'
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
