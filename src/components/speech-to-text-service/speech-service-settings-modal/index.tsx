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
import RangeSlider from '../../../helpers/libs/rangeSlider';

const SpeechServiceSettingsModal = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const speechService = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures
        ?.speechToTextTranslationFeatures,
  );

  const [enabledTranscription, setEnabledTranscription] = useState(false);

  const [slideRangeValue, setSlideRangeValue] = useState(14);

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
              <div className="w-full max-w-lg bg-white border border-Gray-200 shadow-virtualPOP rounded-xl duration-300 ease-out">
                <DialogTitle
                  as="h3"
                  className="flex items-center justify-between text-base 3xl:text-lg font-semibold leading-7 py-5 px-5 text-Gray-950 border-b border-Gray-100"
                >
                  <span>{t('speech-services.modal-settings-title')}</span>
                  <Button
                    onClick={() => closeModal()}
                    className="cursor-pointer"
                  >
                    <PopupCloseSVGIcon classes="text-Gray-600" />
                  </Button>
                </DialogTitle>
                <div className="main-wrap">
                  <Field className="py-4 px-5 bg-Gray-25 border-b border-dotted border-Gray-100">
                    <div className="flex items-center cursor-pointer justify-between shadow-Icon-box h-11 border border-Gray-100 rounded-2xl px-4 bg-white">
                      <Label className="pr-4 w-full text-sm text-Gray-800 font-medium cursor-pointer">
                        Enable Transcription
                      </Label>
                      <Switch
                        checked={enabledTranscription}
                        onChange={setEnabledTranscription}
                        className={`${
                          enabledTranscription ? 'bg-Blue2-500' : 'bg-Gray-200'
                        } relative outline-none inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-hidden cursor-pointer`}
                      >
                        <span
                          className={`${
                            enabledTranscription
                              ? 'ltr:translate-x-5 rtl:-translate-x-5'
                              : 'ltr:translate-x-1 rtl:-translate-x-0.5'
                          } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
                        />
                      </Switch>
                    </div>
                  </Field>
                  {enabledTranscription ? (
                    <div className="py-8 px-5 grid gap-4">
                      <SpeechLangsElms
                        selectedSpeechLangs={selectedSpeechLangs}
                        setSelectedMicDevice={setSelectedSpeechLangs}
                      />
                      <SpeechUsersElms
                        selectedSpeechUsers={selectedSpeechUsers}
                        setSelectedSpeechUsers={setSelectedSpeechUsers}
                      />
                      <DefaultSubtitleLangElms
                        selectedSpeechLangs={selectedSpeechLangs}
                        selectedTransLangs={selectedTransLangs}
                        selectedDefaultSubtitleLang={
                          selectedDefaultSubtitleLang
                        }
                        setSelectedDefaultSubtitleLang={
                          setSelectedDefaultSubtitleLang
                        }
                      />
                      <div className="font-size">
                        <div className="top flex justify-between items-center mb-3">
                          <label
                            htmlFor="transcription-size"
                            className="w-full text-sm font-medium text-Gray-800 ltr:text-left rtl:text-right block"
                          >
                            Transcription Font Size
                          </label>
                          <div className="count text-xs text-Gray-800 font-medium bg-Gray-25 border border-Gray-300 shadow-Icon-box rounded-[7px] py-0.5 px-2">
                            {slideRangeValue}
                          </div>
                        </div>
                        <RangeSlider
                          min={5}
                          max={30}
                          value={slideRangeValue}
                          onChange={setSlideRangeValue}
                          thumbSize={20}
                          trackHeight={8}
                        />
                      </div>
                    </div>
                  ) : null}
                  <Field className="py-4 px-5 bg-Gray-25 border-y border-dotted border-Gray-100">
                    <div className="flex items-center cursor-pointer justify-between shadow-Icon-box h-11 border border-Gray-100 rounded-2xl px-4 bg-white">
                      <Label className="pr-4 w-full text-sm text-Gray-800 font-medium cursor-pointer">
                        Enable Translation
                      </Label>
                      <Switch
                        checked={enableTranslation}
                        onChange={setEnableTranslation}
                        className={`${
                          enableTranslation ? 'bg-Blue2-500' : 'bg-Gray-200'
                        } relative outline-none inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-hidden cursor-pointer`}
                      >
                        <span
                          className={`${
                            enableTranslation
                              ? 'ltr:translate-x-5 rtl:-translate-x-5'
                              : 'ltr:translate-x-1 rtl:-translate-x-0.5'
                          } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
                        />
                      </Switch>
                    </div>
                  </Field>
                  {enableTranslation ? (
                    <div className="py-8 px-5 grid gap-4">
                      <TransLangsElm
                        selectedTransLangs={selectedTransLangs}
                        setSelectedTransLangs={setSelectedTransLangs}
                      />
                    </div>
                  ) : null}
                </div>
                <div className="bottom-area py-5 px-5 text-Gray-950 border-t border-Gray-100 grid grid-cols-2 gap-5">
                  <div className="left">
                    <button
                      className="h-10 px-8 w-full cursor-pointer text-sm 3xl:text-base font-semibold bg-white hover:bg-Red-600 border border-Gray-300 rounded-[15px] text-Gray-950 hover:text-white transition-all duration-300 shadow-button-shadow"
                      onClick={() => closeModal()}
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="right">
                    {!speechService?.isEnabled ? (
                      <button
                        className="h-10 px-8 w-full cursor-pointer text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
                        onClick={() => enableOrUpdateService()}
                      >
                        {t('speech-services.enable-service')}
                      </button>
                    ) : null}
                    {speechService?.isEnabled ? (
                      <>
                        <button
                          className="h-10 px-8 w-full cursor-pointer text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
                          onClick={() => enableOrUpdateService()}
                        >
                          {t('speech-services.update-service')}
                        </button>
                        <button
                          className="h-10 px-8 w-full cursor-pointer text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
                          onClick={() => stopService()}
                        >
                          {t('speech-services.stop-service')}
                        </button>
                      </>
                    ) : null}
                  </div>
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
