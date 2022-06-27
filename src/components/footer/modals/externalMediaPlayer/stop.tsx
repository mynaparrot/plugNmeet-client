import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

import sendAPIRequest from '../../../../helpers/api/plugNmeetAPI';
import { updateShowExternalMediaPlayerModal } from '../../../../store/slices/bottomIconsActivitySlice';
import { useAppDispatch } from '../../../../store';

interface IShowAlertModalProps {
  isActive: boolean;
}

const ShowAlertModal = ({ isActive }: IShowAlertModalProps) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const onCloseAlertModal = async (status = false) => {
    if (!status) {
      return;
    }

    const id = toast.loading(
      t('footer.notice.external-media-player-stopping'),
      {
        type: 'info',
      },
    );

    const body = {
      task: 'end-playback',
    };
    const res = await sendAPIRequest('externalMediaPlayer', body);

    if (!res.status) {
      toast.update(id, {
        render: t('res.msg'),
        type: 'error',
        isLoading: false,
        autoClose: 1000,
      });
    }

    toast.dismiss(id);
    dispatch(updateShowExternalMediaPlayerModal(false));
  };

  return (
    <>
      <Transition appear show={isActive} as={Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 z-[9999] overflow-y-auto"
          onClose={onCloseAlertModal}
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
              <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
                <button
                  className="close-btn absolute top-8 right-6 w-[25px] h-[25px] outline-none"
                  type="button"
                  onClick={() => onCloseAlertModal()}
                >
                  <span className="inline-block h-[1px] w-[20px] bg-primaryColor absolute top-0 left-0 rotate-45" />
                  <span className="inline-block h-[1px] w-[20px] bg-primaryColor absolute top-0 left-0 -rotate-45" />
                </button>

                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900"
                >
                  {t('footer.modal.external-media-player-close-confirm')}
                </Dialog.Title>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    {t('footer.modal.external-media-player-close-msg')}
                  </p>
                </div>

                <div className="mt-4">
                  <button
                    className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 mr-4 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                    onClick={() => onCloseAlertModal(true)}
                  >
                    {t('ok')}
                  </button>
                  <button
                    type="button"
                    className="inline-flex justify-center px-4 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-transparent rounded-md hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                    onClick={() => onCloseAlertModal(false)}
                  >
                    {t('close')}
                  </button>
                </div>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default ShowAlertModal;
