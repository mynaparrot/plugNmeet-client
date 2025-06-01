import React, { Fragment, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  Transition,
  TransitionChild,
  Button,
} from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { RecordingFeatures } from 'plugnmeet-protocol-js';

import { RecordingType } from './IRecording';
import { PopupCloseSVGIcon } from '../../../../assets/Icons/PopupCloseSVGIcon';

interface IRecordingModalProps {
  showModal: boolean;
  recordingFeatures?: RecordingFeatures;
  onCloseModal(recordingType: RecordingType): void;
}

const RecordingModal = ({
  showModal,
  recordingFeatures,
  onCloseModal,
}: IRecordingModalProps) => {
  const [recordingType, setRecordingType] = useState<RecordingType | undefined>(
    undefined,
  );
  const { t } = useTranslation();

  const startRecording = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (recordingType) {
      onCloseModal(recordingType);
    }
  };

  const closeModal = () => {
    onCloseModal(RecordingType.RECORDING_TYPE_NONE);
  };

  const displayModal = () => {
    return (
      <>
        <Transition appear show={showModal} as={Fragment}>
          <Dialog
            as="div"
            className="recordingModal fixed inset-0 w-screen overflow-y-auto z-10 bg-Gray-950/70"
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
                <div className="w-full max-w-lg bg-white border border-Gray-200 shadow-virtualPOP p-6 rounded-xl overflow-hidden duration-300 ease-out">
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
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-white ltr:text-left rtl:text-right mb-2"
                  >
                    {t('footer.icons.how-to-record')}
                  </DialogTitle> */}
                  <DialogTitle
                    as="h3"
                    className="flex items-center justify-between text-base 3xl:text-lg font-semibold leading-7 text-Gray-950 mb-2"
                  >
                    <span>{t('footer.icons.how-to-record')}</span>
                    <Button onClick={() => closeModal()}>
                      <PopupCloseSVGIcon classes="text-Gray-600" />
                    </Button>
                  </DialogTitle>
                  <hr />
                  <div className="mt-4">
                    <form
                      action="#"
                      method="POST"
                      onSubmit={(e) => startRecording(e)}
                    >
                      <div className="">
                        <p className="text-sm text-Gray-950">
                          {t('footer.icons.recording-types-des')}
                        </p>
                        <div className="mt-4 pl-2 space-y-4">
                          {recordingFeatures?.isAllowLocal ? (
                            <>
                              <div className="relative flex items-center overflow-hidden my-2">
                                <input
                                  type="radio"
                                  value="1"
                                  name="block"
                                  id="yes"
                                  checked={
                                    recordingType ===
                                    RecordingType.RECORDING_TYPE_LOCAL
                                  }
                                  onChange={() =>
                                    setRecordingType(
                                      RecordingType.RECORDING_TYPE_LOCAL,
                                    )
                                  }
                                  className="polls-checkbox relative appearance-none w-[18px] h-[18px] border border-Gray-300 shadow-button-shadow rounded-[6px] checked:bg-Blue2-500 checked:border-Blue2-600"
                                />
                                <label
                                  className="text-sm text-Gray-900 absolute w-full h-full pl-7 z-10 flex items-center cursor-pointer"
                                  htmlFor="yes"
                                >
                                  {t('footer.icons.local-recording')}
                                </label>
                              </div>
                            </>
                          ) : null}
                          {recordingFeatures?.isAllowCloud ? (
                            <>
                              <div className="relative flex items-center overflow-hidden my-2">
                                <input
                                  type="radio"
                                  value="0"
                                  name="block"
                                  id="no"
                                  checked={
                                    recordingType ===
                                    RecordingType.RECORDING_TYPE_CLOUD
                                  }
                                  onChange={() =>
                                    setRecordingType(
                                      RecordingType.RECORDING_TYPE_CLOUD,
                                    )
                                  }
                                  className="polls-checkbox relative appearance-none w-[18px] h-[18px] border border-Gray-300 shadow-button-shadow rounded-[6px] checked:bg-Blue2-500 checked:border-Blue2-600"
                                />
                                <label
                                  className="text-sm text-Gray-900 absolute w-full h-full pl-7 z-10 flex items-center cursor-pointer"
                                  htmlFor="no"
                                >
                                  {t('footer.icons.cloud-recording')}
                                </label>
                              </div>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4">
                        <button
                          type="submit"
                          className="h-10 px-5 flex items-center ml-auto justify-center rounded-[15px] text-sm 3xl:text-base font-medium 3xl:font-semibold text-white bg-Blue border border-DarkBlue transition-all duration-300 hover:bg-DarkBlue shadow-button-shadow"
                        >
                          {t('footer.icons.start-recording')}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </TransitionChild>
            </div>
          </Dialog>
        </Transition>
      </>
    );
  };

  return displayModal();
};

export default RecordingModal;
