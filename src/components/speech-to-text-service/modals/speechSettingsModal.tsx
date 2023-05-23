import React, { Fragment, useCallback, useEffect, useState } from 'react';
import { Dialog, Listbox, Switch, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { createSelector } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';

import { updateDisplaySpeechSettingsModal } from '../../../store/slices/bottomIconsActivitySlice';
import { RootState, useAppDispatch, useAppSelector } from '../../../store';
import {
  supportedSpeechToTextLangs,
  supportedTranslationLangs,
} from '../helpers/supportedLangs';
import { participantsSelector } from '../../../store/slices/participantSlice';
import { SpeechToTextTranslationReq } from '../../../helpers/proto/plugnmeet_speech_services_pb';
import { enableOrDisableSpeechService } from '../helpers/apiConnections';

const speechServiceFeaturesSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.room_features
      .speech_to_text_translation_features,
  (speech_to_text_translation_features) => speech_to_text_translation_features,
);

const SpeechSettingsModal = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const allParticipants = useAppSelector(participantsSelector.selectAll);
  const speechService = useAppSelector(speechServiceFeaturesSelector);

  const [speechLangs, setSpeechLangs] = useState<string[]>([]);
  const [speechUsers, setSpeechUsers] = useState<string[]>([]);
  const [enableTranslation, setEnableTranslation] = useState(false);
  const [translationLangs, setTranslationLangs] = useState<string[]>([]);

  useEffect(() => {
    if (speechService?.allowed_speech_langs) {
      setSpeechLangs(speechService.allowed_speech_langs);
    }
    if (speechService?.allowed_speech_users) {
      setSpeechUsers(speechService.allowed_speech_users);
    }
    if (speechService?.allowed_trans_langs) {
      setTranslationLangs(speechService.allowed_trans_langs);
    }
    setEnableTranslation(speechService?.is_enabled_translation ?? false);
  }, [speechService]);

  const spechToTextLangsElm = useCallback(() => {
    return (
      <div className="flex items-center justify-between">
        <label
          htmlFor="language"
          className="pr-4 w-auto dark:text-darkText text-sm"
        >
          {t('speech-services.speech-langs-label')}
        </label>
        <Listbox value={speechLangs} onChange={setSpeechLangs} multiple={true}>
          <div className="relative mt-1 w-[150px] sm:w-[250px]">
            <Listbox.Button className="relative min-h-[36px] w-full cursor-default py-1 pl-3 pr-7 text-left border border-gray-300 dark:border-darkText dark:text-darkText bg-transparent rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm">
              <span className="block">
                {speechLangs
                  .map(
                    (l) =>
                      supportedSpeechToTextLangs.filter(
                        (lang) => lang.code === l,
                      )[0].name,
                  )
                  .join(', ')}
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 ">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5 text-gray-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
                  />
                </svg>
              </span>
            </Listbox.Button>

            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto scrollBar scrollBar4 rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {supportedSpeechToTextLangs.map((l) => (
                  <Listbox.Option
                    key={l.code}
                    className={({ active }) =>
                      `relative cursor-default select-none py-2 pr-4 pl-7 ${
                        active ? 'bg-amber-100 text-amber-900' : 'text-gray-900'
                      }`
                    }
                    value={l.code}
                  >
                    {({ selected }) => (
                      <>
                        <span
                          className={`block truncate ${
                            selected ? 'font-medium' : 'font-normal'
                          }`}
                        >
                          {l.name}
                        </span>
                        {selected ? (
                          <span className="absolute inset-y-0 left-0 flex items-center pl-1 text-amber-600">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4.5 12.75l6 6 9-13.5"
                              />
                            </svg>
                          </span>
                        ) : null}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        </Listbox>
      </div>
    );
  }, [speechLangs, t]);

  const speechUsersElms = useCallback(() => {
    const users = allParticipants.filter(
      (p) =>
        p.name !== '' && p.userId !== 'RECORDER_BOT' && p.userId !== 'RTMP_BOT',
    );
    return (
      <div className="flex items-center justify-between mt-2">
        <label
          htmlFor="language"
          className="pr-4 w-auto dark:text-darkText text-sm"
        >
          {t('speech-services.speech-users-label')}
        </label>
        <Listbox value={speechUsers} onChange={setSpeechUsers} multiple={true}>
          <div className="relative mt-1 w-[150px] sm:w-[250px]">
            <Listbox.Button className="relative min-h-[36px] w-full cursor-default py-1 pl-3 pr-7 text-left border border-gray-300 dark:border-darkText dark:text-darkText bg-transparent rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm">
              <span className="block">
                {speechUsers
                  .map((l) => users.filter((u) => u.userId === l)[0]?.name)
                  .join(', ')}
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 ">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5 text-gray-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
                  />
                </svg>
              </span>
            </Listbox.Button>

            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto scrollBar scrollBar4 rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {users.map((u) => (
                  <Listbox.Option
                    key={u.userId}
                    className={({ active }) =>
                      `relative cursor-default select-none py-2 pr-4 pl-7 ${
                        active ? 'bg-amber-100 text-amber-900' : 'text-gray-900'
                      }`
                    }
                    value={u.userId}
                  >
                    {({ selected }) => (
                      <>
                        <span
                          className={`block truncate ${
                            selected ? 'font-medium' : 'font-normal'
                          }`}
                        >
                          {u.name}
                        </span>
                        {selected ? (
                          <span className="absolute inset-y-0 left-0 flex items-center pl-1 text-amber-600">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4.5 12.75l6 6 9-13.5"
                              />
                            </svg>
                          </span>
                        ) : null}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        </Listbox>
      </div>
    );
  }, [allParticipants, speechUsers, t]);

  const translationLangsElms = useCallback(() => {
    return (
      <div className="flex items-center justify-between">
        <label
          htmlFor="language"
          className="pr-4 w-auto dark:text-darkText text-sm"
        >
          {t('speech-services.translation-langs-label')}
        </label>
        <Listbox
          value={translationLangs}
          onChange={setTranslationLangs}
          multiple={true}
        >
          <div className="relative mt-1 w-[150px] sm:w-[250px]">
            <Listbox.Button className="relative min-h-[36px] w-full cursor-default py-1 pl-3 pr-7 text-left border border-gray-300 dark:border-darkText dark:text-darkText bg-transparent rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm">
              <span className="block">
                {translationLangs
                  .map(
                    (l) =>
                      supportedTranslationLangs.filter(
                        (lang) => lang.code === l,
                      )[0].name,
                  )
                  .join(', ')}
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 ">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5 text-gray-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
                  />
                </svg>
              </span>
            </Listbox.Button>

            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto scrollBar scrollBar4 rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {supportedTranslationLangs.map((l) => (
                  <Listbox.Option
                    key={`trans_${l.code}`}
                    className={({ active }) =>
                      `relative cursor-default select-none py-2 pr-4 pl-7 ${
                        active ? 'bg-amber-100 text-amber-900' : 'text-gray-900'
                      }`
                    }
                    value={l.code}
                  >
                    {({ selected }) => (
                      <>
                        <span
                          className={`block truncate ${
                            selected ? 'font-medium' : 'font-normal'
                          }`}
                        >
                          {l.name}
                        </span>
                        {selected ? (
                          <span className="absolute inset-y-0 left-0 flex items-center pl-1 text-amber-600">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4.5 12.75l6 6 9-13.5"
                              />
                            </svg>
                          </span>
                        ) : null}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        </Listbox>
      </div>
    );
  }, [t, translationLangs]);

  const modalBodyElms = () => {
    return (
      <div className="grid">
        {spechToTextLangsElm()}
        {speechUsersElms()}
        <Switch.Group>
          <div className="flex items-center justify-between my-4">
            <Switch.Label className="pr-4 w-full dark:text-darkText text-sm">
              {t('speech-services.enable-translation')}
            </Switch.Label>
            <Switch
              checked={enableTranslation}
              onChange={setEnableTranslation}
              className={`${
                enableTranslation
                  ? 'bg-primaryColor dark:bg-darkSecondary2'
                  : 'bg-gray-200 dark:bg-secondaryColor'
              } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
            >
              <span
                className={`${
                  enableTranslation ? 'translate-x-6' : 'translate-x-1'
                } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
              />
            </Switch>
          </div>
        </Switch.Group>
        {enableTranslation ? translationLangsElms() : null}
      </div>
    );
  };

  const closeModal = () => {
    dispatch(updateDisplaySpeechSettingsModal(false));
  };

  const enableOrUpdateService = async () => {
    if (!speechUsers.length) {
      toast(t('speech-services.speech-user-required'), {
        type: 'error',
      });
      return;
    }
    if (!speechLangs.length) {
      toast(t('speech-services.speech-lang-required'), {
        type: 'error',
      });
      return;
    }
    if (enableTranslation && !translationLangs.length) {
      toast(t('speech-services.translation-lang-required'), {
        type: 'error',
      });
      return;
    }

    const body = new SpeechToTextTranslationReq({
      isEnabled: true,
      allowedSpeechLangs: speechLangs,
      allowedSpeechUsers: speechUsers,
      isEnabledTranslation: enableTranslation,
      allowedTransLangs: translationLangs,
    });

    const res = await enableOrDisableSpeechService(body);

    if (res.status) {
      toast(t('speech-services.service-ready'), {
        type: 'info',
      });
    } else {
      toast(t(res.msg), {
        type: 'error',
      });
      return;
    }

    closeModal();
  };

  const stopService = async () => {
    const body = new SpeechToTextTranslationReq({
      isEnabled: false,
      allowedSpeechLangs: [],
      allowedSpeechUsers: [],
      isEnabledTranslation: false,
      allowedTransLangs: [],
    });
    const res = await enableOrDisableSpeechService(body);

    if (res.status) {
      toast(t('speech-services.service-stopped'), {
        type: 'info',
      });
    } else {
      toast(t(res.msg), {
        type: 'error',
      });
      return;
    }

    closeModal();
  };

  return (
    <>
      <Transition appear show={true} as={Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 z-[9999] overflow-y-auto"
          onClose={() => false}
        >
          <div className="min-h-screen px-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
            </Transition.Child>

            <span
              className="inline-block h-screen align-middle"
              aria-hidden="true"
            >
              &#8203;
            </span>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className="inline-block w-full max-w-lg p-6 my-8 overflow-[inherit] text-left align-middle transition-all transform bg-white dark:bg-darkPrimary shadow-xl rounded-2xl">
                <button
                  className="close-btn absolute top-8 right-6 w-[25px] h-[25px] outline-none"
                  type="button"
                  onClick={() => closeModal()}
                >
                  <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 rotate-45" />
                  <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 -rotate-45" />
                </button>

                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-2"
                >
                  {t('speech-services.modal-settings-title')}
                </Dialog.Title>
                <hr />
                <div className="mt-6">{modalBodyElms()}</div>
                <div className="py-3 bg-gray-50 dark:bg-transparent text-right mt-4">
                  {!speechService?.is_enabled ? (
                    <button
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primaryColor hover:bg-secondaryColor focus:outline-none"
                      onClick={() => enableOrUpdateService()}
                    >
                      {t('speech-services.enable-service')}
                    </button>
                  ) : null}
                  {speechService?.is_enabled ? (
                    <>
                      <button
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primaryColor hover:bg-secondaryColor focus:outline-none mr-2"
                        onClick={() => enableOrUpdateService()}
                      >
                        {t('speech-services.update-service')}
                      </button>
                      <button
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-secondaryColor hover:bg-secondaryColor focus:outline-none"
                        onClick={() => stopService()}
                      >
                        {t('speech-services.stop-service')}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default SpeechSettingsModal;
