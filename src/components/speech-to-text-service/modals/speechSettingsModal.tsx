import React, { Fragment, useCallback, useEffect, useState } from 'react';
import { Dialog, Listbox, Switch, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { createSelector } from '@reduxjs/toolkit';

import { updateDisplaySpeechSettingsModal } from '../../../store/slices/bottomIconsActivitySlice';
import { RootState, useAppDispatch, useAppSelector } from '../../../store';
import {
  supportedSpeechToTextLangs,
  supportedTranslationLangs,
} from '../helpers/supportedLangs';
import { participantsSelector } from '../../../store/slices/participantSlice';
import { toast } from 'react-toastify';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import { CommonResponse } from '../../../helpers/proto/plugnmeet_common_api_pb';
import { SpeechToTextTranslationReq } from '../../../helpers/proto/plugnmeet_speech_services_pb';

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

  const [speechLangs, setSpeechLangs] = useState<string[]>([
    supportedSpeechToTextLangs[0].code,
  ]);
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
      <div className="flex items-center justify-start">
        <label htmlFor="language" className="pr-4 w-full dark:text-darkText">
          {t('speech-services.speech-langs-label')}
        </label>
        <Listbox value={speechLangs} onChange={setSpeechLangs} multiple={true}>
          <div className="relative mt-1">
            <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
              <span className="block truncate">
                {speechLangs
                  .map(
                    (l) =>
                      supportedSpeechToTextLangs.filter(
                        (lang) => lang.code === l,
                      )[0].name,
                  )
                  .join(', ')}
              </span>
            </Listbox.Button>

            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {supportedSpeechToTextLangs.map((l) => (
                  <Listbox.Option
                    key={l.code}
                    className={({ active }) =>
                      `relative cursor-default select-none py-2 pl-10 pr-4 ${
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
      <div className="flex items-center justify-start">
        <label htmlFor="language" className="pr-4 w-full dark:text-darkText">
          {t('speech-services.speech-users-label')}
        </label>
        <Listbox value={speechUsers} onChange={setSpeechUsers} multiple={true}>
          <div className="relative mt-1">
            <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
              <span className="block truncate">
                {speechUsers
                  .map((l) => users.filter((u) => u.userId === l)[0]?.name)
                  .join(', ')}
              </span>
            </Listbox.Button>

            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {users.map((u) => (
                  <Listbox.Option
                    key={u.userId}
                    className={({ active }) =>
                      `relative cursor-default select-none py-2 pl-10 pr-4 ${
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
    const langs = supportedTranslationLangs.filter((l) => {
      const find = speechLangs.find((v) => {
        const s = v.split('-');
        return s[0] === l.code;
      });
      return !find;
    });
    if (!langs.length) {
      return null;
    }
    return (
      <div className="flex items-center justify-start">
        <label htmlFor="language" className="pr-4 w-full dark:text-darkText">
          {t('speech-services.speech-langs-label')}
        </label>
        <Listbox
          value={translationLangs}
          onChange={setTranslationLangs}
          multiple={true}
        >
          <div className="relative mt-1">
            <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
              <span className="block truncate">
                {translationLangs
                  .map(
                    (l) =>
                      supportedTranslationLangs.filter(
                        (lang) => lang.code === l,
                      )[0].name,
                  )
                  .join(', ')}
              </span>
            </Listbox.Button>

            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {langs.map((l) => (
                  <Listbox.Option
                    key={`trans_${l.code}`}
                    className={({ active }) =>
                      `relative cursor-default select-none py-2 pl-10 pr-4 ${
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
  }, [speechLangs, t, translationLangs]);

  const modalBodyElms = () => {
    return (
      <div className="grid">
        {spechToTextLangsElm()}
        {speechUsersElms()}
        <Switch.Group>
          <div className="flex items-center justify-between my-4">
            <Switch.Label className="pr-4 w-full dark:text-darkText">
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
    const r = await sendAPIRequest(
      'speechServices',
      body.toBinary(),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = CommonResponse.fromBinary(new Uint8Array(r));

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
    const r = await sendAPIRequest(
      'speechServices',
      body.toBinary(),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = CommonResponse.fromBinary(new Uint8Array(r));

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
              <div className="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-darkPrimary shadow-xl rounded-2xl">
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
                <div className="py-3 bg-gray-50 dark:bg-transparent text-right">
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
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primaryColor hover:bg-secondaryColor focus:outline-none"
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
