import React, { SetStateAction, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PlusIcon } from '../../assets/Icons/PlusIcon';
import { ArrowUp } from '../../assets/Icons/ArrowUp';
import { Microphone } from '../../assets/Icons/Microphone';
import { IMediaDevice } from '../../store/slices/interfaces/roomSettings';
import MicrophoneModal from '../footer/modals/microphone';

interface MicrophoneIconProps {
  audioDevices: IMediaDevice[];
  disableMic(): void;
  setAudioDevices: (devices: IMediaDevice[]) => void;
  setSelectedAudioDevice: (value: SetStateAction<string>) => void;
  selectedAudioDevice: string;
}

/**
 * Landing pre-join mic button.
 * Active = a mic is actually selected (not just enumerated).
 * - Inactive (default): single mic+plus button, click opens the picker modal.
 * - Active: split button — main toggles off, arrow re-opens modal to change/test.
 * Cancelling the modal without picking keeps the default inactive look.
 */
const MicrophoneIcon = ({
  audioDevices,
  setAudioDevices,
  setSelectedAudioDevice,
  selectedAudioDevice,
  disableMic,
}: MicrophoneIconProps) => {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);

  const isActive = selectedAudioDevice !== '';
  const selectedLabel = isActive
    ? audioDevices.find((d) => d.id === selectedAudioDevice)?.label
    : undefined;

  const openPicker = useCallback(() => {
    setShowModal(true);
  }, []);

  const closePicker = useCallback(
    (deviceId?: string) => {
      setShowModal(false);
      if (typeof deviceId === 'string' && deviceId) {
        setSelectedAudioDevice(deviceId);
      }
      // cancel / no pick -> stay inactive, don't touch selection
    },
    [setSelectedAudioDevice],
  );

  return (
    <>
      <div
        className="microphone-wrap relative cursor-pointer shadow-IconBox border border-Gray-300 rounded-2xl h-11 min-w-11 flex items-center justify-center transition-all duration-300 hover:bg-Gray-200 dark:hover:bg-Gray-700 text-Gray-950 dark:text-white"
        title={
          selectedLabel
            ? `${t('landing.mic-menu-title')}: ${selectedLabel}`
            : t('landing.mic-menu-title').toString()
        }
      >
        {!isActive ? (
          <button
            type="button"
            aria-label={t('landing.mic-menu-title').toString()}
            className="w-11 h-11 relative flex items-center justify-center cursor-pointer focus-ring"
            onClick={openPicker}
          >
            <Microphone classes={'h-5 w-auto'} />
            <span className="add absolute -top-2 -end-2 z-10">
              <PlusIcon />
            </span>
          </button>
        ) : (
          <>
            <button
              type="button"
              aria-label="Microphone"
              className="w-11 h-11 relative flex items-center justify-center cursor-pointer focus-ring"
              onClick={disableMic}
            >
              <Microphone classes={'h-5 w-auto'} />
            </button>
            <div className="menu relative">
              <button
                type="button"
                aria-label={t('landing.mic-menu-title').toString()}
                onClick={openPicker}
                className="w-[30px] h-11 flex items-center justify-center border border-Gray-300 rounded-e-2xl cursor-pointer focus-ring bg-Gray-50 dark:bg-Gray-700"
              >
                <ArrowUp />
              </button>
            </div>
          </>
        )}
      </div>
      {showModal && (
        <MicrophoneModal
          show={showModal}
          mode="select"
          initialDeviceId={selectedAudioDevice}
          initialDevices={audioDevices}
          onCloseMicrophoneModal={closePicker}
          onDevicesLoaded={setAudioDevices}
        />
      )}
    </>
  );
};

export default MicrophoneIcon;
