import React, { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { RecordingType } from './IRecording';

interface IRecordingModalProps {
  showModal: boolean;
  onCloseModal(recordingType: RecordingType): void;
}

const RecordingModal = ({ showModal, onCloseModal }: IRecordingModalProps) => {
  const [recordingType, setRecordingType] = useState<RecordingType>(
    RecordingType.RECORDING_TYPE_LOCAL,
  );
  const { t } = useTranslation();

  const startRecording = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onCloseModal(recordingType);
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
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-white text-left mb-2"
                  >
                    {t('footer.icons.how-to-record')}
                  </Dialog.Title>
                  <hr />
                  <div className="mt-6">
                    <form
                      action="#"
                      method="POST"
                      onSubmit={(e) => startRecording(e)}
                    >
                      <div className="mb-10 pl-3">
                        <p className="text-sm text-gray-500 dark:text-darkText">
                          {t('footer.icons.recording-types-des')}
                        </p>
                        <div className="mt-4 pl-2 space-y-4">
                          <div className="flex items-center">
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
                            />
                            <label
                              htmlFor="yes"
                              className="ml-3 block text-sm font-medium text-gray-700 dark:text-darkText"
                            >
                              {t('footer.icons.local-recording')}
                            </label>
                          </div>
                          <div className="flex items-center">
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
                            />
                            <label
                              htmlFor="no"
                              className="ml-3 block text-sm font-medium text-gray-700 dark:text-darkText"
                            >
                              {t('footer.icons.cloud-recording')}
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="px-4 py-3 bg-gray-50 dark:bg-transparent text-right sm:px-6 mt-4">
                        <button
                          type="submit"
                          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primaryColor hover:bg-secondaryColor focus:outline-none focus:ring-2 focus:ring-offset-2 focus:bg-secondaryColor"
                        >
                          {t('footer.icons.start-recording')}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition>
      </>
    );
  };

  return displayModal();
};

export default RecordingModal;
