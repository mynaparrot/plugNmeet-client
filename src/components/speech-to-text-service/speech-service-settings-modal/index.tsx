import React, { Fragment, useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  Field,
  Label,
  Switch,
  Transition,
  TransitionChild,
  Button,
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
import { PopupCloseSVGIcon } from '../../../assets/Icons/PopupCloseSVGIcon';

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
          className="SpeechToTextModal fixed inset-0 w-screen overflow-y-auto z-10 bg-Gray-950/70"
          onClose={() => false}
        >
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className="w-full max-w-lg bg-white border border-Gray-200 shadow-virtualPOP p-6 rounded-xl duration-300 ease-out">
                <DialogTitle
                  as="h3"
                  className="flex items-center justify-between text-base 3xl:text-lg font-semibold leading-7 text-Gray-950 mb-2"
                >
                  <span>{t('speech-services.modal-settings-title')}</span>
                  <Button onClick={() => closeModal()}>
                    <PopupCloseSVGIcon classes="text-Gray-600" />
                  </Button>
                </DialogTitle>
                {/* <button
                  className="close-btn absolute top-8 ltr:right-6 rtl:left-6 w-[25px] h-[25px] outline-hidden"
                  type="button"
                  onClick={() => closeModal()}
                >
                  <span className="inline-block h-px w-[20px] bg-primary-color dark:bg-dark-text absolute top-0 left-0 rotate-45" />
                  <span className="inline-block h-px w-[20px] bg-primary-color dark:bg-dark-text absolute top-0 left-0 -rotate-45" />
                </button>

                <DialogTitle
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-2 ltr:text-left rtl:text-right"
                >
                  {t('speech-services.modal-settings-title')}
                </DialogTitle> */}
                <hr />
                <div className="mt-4">
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
                      <Label className="pr-4 w-full text-sm text-Gray-950 ltr:text-left rtl:text-right">
                        {t('speech-services.enable-translation')}
                      </Label>
                      <Switch
                        checked={enableTranslation}
                        onChange={setEnableTranslation}
                        className={`${
                          enableTranslation ? 'bg-Blue2-500' : 'bg-Gray-200'
                        } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-2`}
                      >
                        <span
                          className={`${
                            enableTranslation
                              ? 'ltr:translate-x-6 rtl:-translate-x-5'
                              : 'ltr:translate-x-1 rtl:-translate-x-0.5'
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
                <div className="text-right mt-4">
                  {!speechService?.isEnabled ? (
                    <button
                      className="h-10 px-8 text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
                      onClick={() => enableOrUpdateService()}
                    >
                      {t('speech-services.enable-service')}
                    </button>
                  ) : null}
                  {speechService?.isEnabled ? (
                    <>
                      <button
                        className="h-10 px-8 text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
                        onClick={() => enableOrUpdateService()}
                      >
                        {t('speech-services.update-service')}
                      </button>
                      <button
                        className="h-10 px-8 text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
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
