import React, { useEffect, useState } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { Dialog, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { useAppSelector, RootState, useAppDispatch } from '../../../../store';
import {
  updateIsActiveWebcam,
  updateShowVideoShareModal,
} from '../../../../store/slices/bottomIconsActivitySlice';
import { getDevices } from '../../../../helpers/utils';
import PreviewWebcam from './previewWebcam';
import { addVideoDevices } from '../../../../store/slices/roomSettingsSlice';
import { IMediaDevice } from '../../../../store/slices/interfaces/roomSettings';

interface IShareWebcamModal {
  onSelectedDevice: (deviceId: string) => void;
}

const showVideoShareModalSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity,
  (bottomIconsActivity) => bottomIconsActivity.showVideoShareModal,
);

const ShareWebcamModal = ({ onSelectedDevice }: IShareWebcamModal) => {
  const showVideoShareModal = useAppSelector(showVideoShareModalSelector);
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [selectedWebcam, setSelectWebcam] = useState<string>('');
  const [devices, setDevices] = useState<Array<JSX.Element>>([]);
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  useEffect(() => {
    const getDeviceWebcams = async () => {
      const mics = await getDevices('videoinput');
      const videoDevices: Array<IMediaDevice> = [];

      const options = mics.map((mic) => {
        const device: IMediaDevice = {
          id: mic.deviceId,
          label: mic.label,
        };
        videoDevices.push(device);

        return (
          <option value={mic.deviceId} key={mic.deviceId}>
            {mic.label}
          </option>
        );
      });
      setDevices(options);
      setSelectWebcam(mics[0].deviceId);

      if (videoDevices.length) {
        dispatch(addVideoDevices(videoDevices));
      }
    };
    getDeviceWebcams();
  }, [dispatch]);

  useEffect(() => {
    if (showVideoShareModal) {
      setIsOpen(true);
    }
  }, [showVideoShareModal]);

  const shareWebcam = async () => {
    onClose();
    if (!selectedWebcam) {
      return;
    }
    onSelectedDevice(selectedWebcam);
  };

  const onClose = () => {
    setIsOpen(false);
    dispatch(updateShowVideoShareModal(false));
    dispatch(updateIsActiveWebcam(false));
  };

  const render = () => {
    if (!showVideoShareModal) {
      return null;
    }

    return (
      <Transition
        show={isOpen}
        enter="transition duration-100 ease-out"
        enterFrom="transform scale-95 opacity-0"
        enterTo="transform scale-100 opacity-100"
        leave="transition duration-75 ease-out"
        leaveFrom="transform scale-100 opacity-100"
        leaveTo="transform scale-95 opacity-0"
      >
        <Dialog
          open={isOpen}
          onClose={() => false}
          className="share-webcam-popup-wrap fixed z-[99999] inset-0 overflow-y-auto"
        >
          <div className="flex items-center justify-center min-h-screen">
            <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

            <div className="popup-inner bg-white dark:bg-darkPrimary w-full max-w-md rounded-3xl shadow-header relative px-6 py-14">
              <button
                className="close-btn absolute top-8 right-6 w-[25px] h-[25px] outline-none"
                type="button"
                onClick={() => onClose()}
              >
                <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 rotate-45" />
                <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 -rotate-45" />
              </button>
              <Dialog.Title className="mb-6 dark:text-darkText">
                {t('footer.modal.select-webcam')}
              </Dialog.Title>

              <div className="col-span-6 sm:col-span-3">
                <select
                  value={selectedWebcam}
                  onChange={(e) => setSelectWebcam(e.target.value)}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-transparent dark:border-darkText dark:text-darkText rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  {devices}
                </select>
              </div>

              <div className="col-span-6 sm:col-span-3">
                <PreviewWebcam deviceId={selectedWebcam} />
              </div>

              <div className="py-3 bg-gray-50 dark:bg-transparent text-right">
                <button
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primaryColor hover:bg-secondaryColor focus:outline-none"
                  onClick={() => shareWebcam()}
                >
                  {t('share')}
                </button>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition>
    );
  };
  return <>{render()}</>;
};

export default ShareWebcamModal;
