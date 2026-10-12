import React, { SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';

import { Camera } from '../../assets/Icons/Camera';
import { PlusIcon } from '../../assets/Icons/PlusIcon';
import { ArrowUp } from '../../assets/Icons/ArrowUp';
import { updateShowVideoShareModal } from '../../store/slices/bottomIconsActivitySlice';
import { useAppDispatch, useAppSelector } from '../../store';
import { IMediaDevice } from '../../store/slices/interfaces/roomSettings';
import ShareWebcamModal from '../footer/modals/webcam';

interface WebcamIconProps {
  videoDevices: IMediaDevice[];
  setVideoDevices: (devices: IMediaDevice[]) => void;
  disableWebcam(): void;
  setSelectedVideoDevice: (value: SetStateAction<string>) => void;
  selectedVideoDevice: string;
}

const WebcamIcon = ({
  videoDevices,
  setVideoDevices,
  disableWebcam,
  setSelectedVideoDevice,
  selectedVideoDevice,
}: WebcamIconProps) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const showVideoShareModal = useAppSelector(
    (state) => state.bottomIconsActivity.showVideoShareModal,
  );
  const isSelected = selectedVideoDevice !== '';
  const selectedLabel = videoDevices.find((device) => device.id === selectedVideoDevice)?.label;

  const openPicker = () => dispatch(updateShowVideoShareModal(true));

  return (
    <div
      className="cam-wrap relative cursor-pointer shadow-IconBox border border-Gray-300 rounded-2xl h-11 min-w-11 flex items-center justify-center transition-all duration-300 hover:bg-gray-200 dark:hover:bg-Gray-700 text-Gray-950 dark:text-white"
      title={
        selectedLabel
          ? `${t('landing.webcam-menu-title')}: ${selectedLabel}`
          : t('landing.webcam-menu-title').toString()
      }
    >
      {showVideoShareModal && (
        <ShareWebcamModal
          displayWebcamSelection
          mode="select"
          onSelectedDevice={setSelectedVideoDevice}
          selectedDeviceId={selectedVideoDevice}
          initialDevices={videoDevices}
          onDevicesLoaded={setVideoDevices}
        />
      )}
      {isSelected ? (
        <>
          <button
            type="button"
            aria-label={t('landing.webcam-menu-title').toString()}
            className="w-11 h-11 relative flex items-center justify-center cursor-pointer focus-ring"
            onClick={disableWebcam}
          >
            <Camera classes="h-5 w-auto" />
          </button>
          <button
            type="button"
            aria-label={t('landing.webcam-menu-title').toString()}
            title={t('landing.webcam-menu-title').toString()}
            className="w-[30px] h-11 flex items-center justify-center border border-Gray-300 rounded-e-2xl focus-ring bg-Gray-50 dark:bg-Gray-700"
            onClick={openPicker}
          >
            <ArrowUp />
          </button>
        </>
      ) : (
        <button
          type="button"
          aria-label={t('landing.webcam-menu-title').toString()}
          className="w-11 h-11 relative flex items-center justify-center cursor-pointer focus-ring"
          onClick={openPicker}
        >
          <Camera classes="h-5 w-auto" />
          <span className="add absolute -top-2 -end-2 z-10">
            <PlusIcon />
          </span>
        </button>
      )}
    </div>
  );
};

export default WebcamIcon;
