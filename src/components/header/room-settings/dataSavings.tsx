import React, { useState, useEffect, Fragment } from 'react';
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
import { useTranslation } from 'react-i18next';
import { VideoQuality } from 'livekit-client';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import {
  updateActivateWebcamsView,
  updateActiveScreenSharingView,
  updateRoomVideoQuality,
} from '../../../store/slices/roomSettingsSlice';
import { CheckMarkIcon } from '../../../assets/Icons/CheckMarkIcon';
import { DropdownIconSVG } from '../../../assets/Icons/DropdownIconSVG';

const DataSavings = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const [videoQuality, setVideoQuality] = useState<VideoQuality>(
    store.getState().roomSettings.roomVideoQuality,
  );
  const activateWebcamsView = useAppSelector(
    (state) => state.roomSettings.activateWebcamsView,
  );
  const activeScreenSharingView = useAppSelector(
    (state) => state.roomSettings.activeScreenSharingView,
  );

  useEffect(() => {
    dispatch(updateRoomVideoQuality(videoQuality));
  }, [dispatch, videoQuality]);

  const toggleWebcamView = () => {
    dispatch(updateActivateWebcamsView(!activateWebcamsView));
  };

  const toggleScreenShareView = () => {
    dispatch(updateActiveScreenSharingView(!activeScreenSharingView));
  };

  const getVideoQualityText = (quality: VideoQuality) => {
    switch (quality) {
      case VideoQuality.LOW:
        return t('header.room-settings.low');
      case VideoQuality.MEDIUM:
        return t('header.room-settings.medium');
      case VideoQuality.HIGH:
        return t('header.room-settings.high');
      default:
        return '';
    }
  };

  const render = () => {
    return (
      <>
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="quality"
            className="pr-4 flex-1 text-sm text-Gray-950 ltr:text-left rtl:text-right"
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
        {/* Video Quality Dropdown */}
        <Field>
          <div className="flex items-center justify-between mb-2">
            <Label className="pr-4 flex-1 text-sm text-Gray-950 ltr:text-left rtl:text-right">
              {t('header.room-settings.video-quality')}
            </Label>
            <Listbox
              value={videoQuality}
              onChange={(value) => setVideoQuality(value)}
            >
              <div className="relative w-full max-w-[250px]">
                <ListboxButton
                  className={`h-10 full rounded-[8px] border border-Gray-300 bg-white shadow-input w-full px-3 outline-none focus:border-[rgba(0,161,242,1)] focus:shadow-inputFocus focus:shadow-inputFocus text-left text-sm`}
                >
                  <span className="block truncate">
                    {getVideoQualityText(videoQuality)}
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
                    {[
                      VideoQuality.LOW,
                      VideoQuality.MEDIUM,
                      VideoQuality.HIGH,
                    ].map((quality) => (
                      <ListboxOption
                        key={quality}
                        value={quality}
                        className={({ focus, selected }) =>
                          `relative cursor-default select-none py-2 px-3 rounded-[8px] ${
                            focus ? 'bg-Blue2-50' : ''
                          } ${selected ? 'bg-Blue2-50' : ''}`
                        }
                      >
                        {({ selected }) => (
                          <>
                            <span className={`block truncate`}>
                              {getVideoQualityText(quality)}
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

        <Field>
          <div className="flex items-center justify-between mb-2">
            <Label className="pr-4 flex-1 text-sm text-Gray-950 ltr:text-left rtl:text-right">
              {t('header.room-settings.show-webcams')}
            </Label>
            <Switch
              checked={activateWebcamsView}
              onChange={toggleWebcamView}
              className={`${
                activateWebcamsView ? 'bg-Blue2-500' : 'bg-Gray-200'
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
            <Label className="pr-4 flex-1 text-sm text-Gray-950 ltr:text-left rtl:text-right">
              {t('header.room-settings.show-screen-share')}
            </Label>
            <Switch
              checked={activeScreenSharingView}
              onChange={toggleScreenShareView}
              className={`${
                activeScreenSharingView ? 'bg-Blue2-500' : 'bg-Gray-200'
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
        </Field>
      </>
    );
  };

  return <div className="mt-2">{render()}</div>;
};

export default DataSavings;
