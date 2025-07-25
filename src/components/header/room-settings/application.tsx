import React, { Fragment } from 'react';
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
import { CheckMarkIcon } from '../../../assets/Icons/CheckMarkIcon';
import { DropdownIconSVG } from '../../../assets/Icons/DropdownIconSVG';
import {
  updateFocusActiveSpeakerWebcam,
  updateTheme,
} from '../../../store/slices/roomSettingsSlice';

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

  const getLangText = (langCode: string) => {
    for (let i = 0; i < languages.length; i++) {
      const l = languages[i];
      if (l.code === langCode) {
        return l.text;
      }
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
                className={`h-10 full rounded-[8px] border border-Gray-300 bg-white shadow-input w-full px-3 outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus text-left text-sm text-Gray-950 cursor-pointer`}
              >
                <span className="block truncate">
                  {getLangText(i18n.languages[0])}
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
                <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-[15px] bg-white p-1 text-sm shadow-dropdown-menu border border-Gray-100 focus:outline-hidden scrollBar scrollBar2 grid gap-0.5">
                  {languages.map(({ code, text }) => {
                    return (
                      <ListboxOption
                        key={code}
                        value={code}
                        className={({ focus, selected }) =>
                          `relative select-none py-2 px-3 rounded-[8px] cursor-pointer ${
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
            } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-2 cursor-pointer`}
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
            } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-2 cursor-pointer`}
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
