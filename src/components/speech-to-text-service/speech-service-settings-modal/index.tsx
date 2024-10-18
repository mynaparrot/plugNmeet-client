import React, { Fragment, useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  Field,
  Label,
  Switch,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { SpeechToTextTranslationReqSchema } from 'plugnmeet-protocol-js';
import { create } from '@bufbuild/protobuf';

import { updateDisplaySpeechSettingsModal } from '../../../store/slices/bottomIconsActivitySlice';
import { useAppDispatch, useAppSelector } from '../../../store';
import { enableOrDisableSpeechService } from '../helpers/apiConnections';
import SpeechLangsElms from './speechLangsElms';
import SpeechUsersElms from './speechUsersElms';
import TransLangsElm from './transLangsElm';
import DefaultSubtitleLangElms from './defaultSubtitleLangElms';

const SpeechServiceSettingsModal = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const speechService = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures
        ?.speechToTextTranslationFeatures,
  );

  const [selectedSpeechLangs, setSelectedSpeechLangs] = useState<string[]>([]);
  const [selectedSpeechUsers, setSelectedSpeechUsers] = useState<string[]>([]);

  const [enableTranslation, setEnableTranslation] = useState(false);
  const [selectedTransLangs, setSelectedTransLangs] = useState<string[]>([]);
  const [selectedDefaultSubtitleLang, setSelectedDefaultSubtitleLang] =
    useState<string>('');

  useEffect(() => {
    if (speechService?.allowedSpeechLangs) {
      setSelectedSpeechLangs(speechService.allowedSpeechLangs);
    }
    if (speechService?.allowedSpeechUsers) {
      setSelectedSpeechUsers(speechService.allowedSpeechUsers);
    }
    if (speechService?.allowedTransLangs) {
      setSelectedTransLangs(speechService.allowedTransLangs);
    }
    if (speechService?.defaultSubtitleLang) {
      setSelectedDefaultSubtitleLang(speechService.defaultSubtitleLang);
    }
    setEnableTranslation(speechService?.isEnabledTranslation ?? false);
  }, [speechService]);

  const enableOrUpdateService = async () => {
    if (!selectedSpeechUsers.length) {
      toast(t('speech-services.speech-user-required'), {
        type: 'error',
      });
      return;
    }
    if (!selectedSpeechLangs.length) {
      toast(t('speech-services.speech-lang-required'), {
        type: 'error',
      });
      return;
    }
    if (!enableTranslation && selectedSpeechLangs.length > 1) {
      toast(t('speech-services.enable-translation-warning'), {
        type: 'warning',
      });
      return;
    }
    if (
      enableTranslation &&
      selectedSpeechLangs.length === 1 &&
      !selectedTransLangs.length
    ) {
      toast(t('speech-services.translation-lang-required'), {
        type: 'error',
      });
      return;
    }

    const body = create(SpeechToTextTranslationReqSchema, {
      isEnabled: true,
      allowedSpeechLangs: selectedSpeechLangs,
      allowedSpeechUsers: selectedSpeechUsers,
      isEnabledTranslation: enableTranslation,
      allowedTransLangs: selectedTransLangs,
      defaultSubtitleLang: selectedDefaultSubtitleLang,
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
    const body = create(SpeechToTextTranslationReqSchema, {
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

  const closeModal = () => {
    dispatch(updateDisplaySpeechSettingsModal(false));
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
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black opacity-30" />
            </TransitionChild>

            <span
              className="inline-block h-screen align-middle"
              aria-hidden="true"
            >
              &#8203;
            </span>
            <TransitionChild
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
                  className="close-btn absolute top-8 ltr:right-6 rtl:left-6 w-[25px] h-[25px] outline-none"
                  type="button"
                  onClick={() => closeModal()}
                >
                  <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 rotate-45" />
                  <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 -rotate-45" />
                </button>

                <DialogTitle
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-2 ltr:text-left rtl:text-right"
                >
                  {t('speech-services.modal-settings-title')}
                </DialogTitle>
                <hr />
                <div className="mt-6">
                  <SpeechLangsElms
                    selectedSpeechLangs={selectedSpeechLangs}
                    setSelectedMicDevice={setSelectedSpeechLangs}
                  />
                  <SpeechUsersElms
                    selectedSpeechUsers={selectedSpeechUsers}
                    setSelectedSpeechUsers={setSelectedSpeechUsers}
                  />
                  <Field>
                    <div className="flex items-center justify-between my-4">
                      <Label className="ltr:pr-4 rtl:pl-4 w-full dark:text-darkText text-sm">
                        {t('speech-services.enable-translation')}
                      </Label>
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
                            enableTranslation
                              ? 'ltr:translate-x-6 rtl:-translate-x-6'
                              : 'ltr:translate-x-1 rtl:translate-x-0'
                          } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
                        />
                      </Switch>
                    </div>
                  </Field>
                  {enableTranslation ? (
                    <TransLangsElm
                      selectedTransLangs={selectedTransLangs}
                      setSelectedTransLangs={setSelectedTransLangs}
                    />
                  ) : null}
                  <DefaultSubtitleLangElms
                    selectedSpeechLangs={selectedSpeechLangs}
                    selectedTransLangs={selectedTransLangs}
                    selectedDefaultSubtitleLang={selectedDefaultSubtitleLang}
                    setSelectedDefaultSubtitleLang={
                      setSelectedDefaultSubtitleLang
                    }
                  />
                </div>
                <div className="py-3 bg-gray-50 dark:bg-transparent text-right mt-4">
                  {!speechService?.isEnabled ? (
                    <button
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primaryColor hover:bg-secondaryColor focus:outline-none"
                      onClick={() => enableOrUpdateService()}
                    >
                      {t('speech-services.enable-service')}
                    </button>
                  ) : null}
                  {speechService?.isEnabled ? (
                    <>
                      <button
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primaryColor hover:bg-secondaryColor focus:outline-none ltr:mr-2 rtl:ml-2"
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
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default SpeechServiceSettingsModal;
