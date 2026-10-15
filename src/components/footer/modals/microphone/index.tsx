import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Modal from '../../../../helpers/ui/modal';
import ActionButton from '../../../../helpers/ui/actionButton';
import Dropdown from '../../../../helpers/ui/dropdown';
import SettingsSwitch from '../../../../helpers/ui/settingsSwitch';
import { useAppDispatch, useAppSelector } from '../../../../store';
import { updateMicrophoneConfig } from '../../../../store/slices/roomSettingsSlice';
import { AUDIO_PRESET_KEYS, getAudioPresetName } from '../../../../helpers/utils';
import { isNoiseSuppressorSupported } from '../../../../helpers/libs/NoiseSuppressorTrackProcessor';
import { isHybridMode } from '../../../../helpers/nativeBridge';
import { IMediaDevice } from '../../../../store/slices/interfaces/roomSettings';
import AudioDevicePicker from './audioDevicePicker';

interface MicrophoneModalProps {
  show: boolean;
  initialDeviceId?: string;
  initialDevices?: IMediaDevice[];
  onCloseMicrophoneModal: (deviceId?: string) => void;
  onDevicesLoaded?: (devices: IMediaDevice[]) => void;
  /**
   * Live microphone only: applies the requested suppression state right away
   * and resolves with whether it succeeded.
   */
  onNoiseSuppressionChange?: (desired: boolean) => Promise<boolean>;
  /** Landing pre-join: "Select" only commits the choice, no publishing. */
  mode?: 'publish' | 'select';
}

const MicrophoneModal = ({
  show,
  initialDeviceId = '',
  initialDevices,
  onCloseMicrophoneModal,
  onDevicesLoaded,
  onNoiseSuppressionChange,
  mode = 'publish',
}: MicrophoneModalProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const isActiveMicrophone = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveMicrophone,
  );
  const noiseSuppression = useAppSelector(
    (state) => state.roomSettings.microphoneConfig.noiseSuppression,
  );
  // With a live mic the toggle applies instantly and the store is the source of
  // truth; otherwise it is a draft that is only committed by Save.
  const isLive = isActiveMicrophone && mode !== 'select';
  const showNoiseSuppression = !isHybridMode();
  const noiseSuppressionSupported = isNoiseSuppressorSupported();

  const [selectedMic, setSelectMic] = useState<string>(initialDeviceId);
  const [selectedPreset, setSelectedPreset] = useState(getAudioPresetName);
  const [draftNoiseSuppression, setDraftNoiseSuppression] = useState(noiseSuppression);
  const [pendingNoiseSuppression, setPendingNoiseSuppression] = useState(false);

  // Landing may restore a stored id after mount — sync it in.
  useEffect(() => {
    if (initialDeviceId) {
      setSelectMic(initialDeviceId);
    }
  }, [initialDeviceId]);

  const selectOrClose = (onlyClose = false) => {
    if (pendingNoiseSuppression) {
      return;
    }
    if (!onlyClose) {
      dispatch(
        updateMicrophoneConfig({
          audioPreset: selectedPreset,
          noiseSuppression: isLive ? noiseSuppression : draftNoiseSuppression,
        }),
      );
    }
    onCloseMicrophoneModal(onlyClose ? undefined : selectedMic);
  };

  const handleNoiseSuppressionChange = async (enabled: boolean) => {
    if (!isLive) {
      setDraftNoiseSuppression(enabled);
      return;
    }
    if (pendingNoiseSuppression) {
      return;
    }
    setPendingNoiseSuppression(true);
    try {
      // On failure the callback restores the persisted value, so the store-driven
      // switch snaps back instead of showing a state that isn't running.
      await onNoiseSuppressionChange?.(enabled);
    } finally {
      setPendingNoiseSuppression(false);
    }
  };

  return (
    <Modal
      show={show}
      onClose={() => selectOrClose(true)}
      title={t('footer.modal.configure-microphone')}
      renderButtons={() => (
        <div className="flex items-center justify-end gap-3">
          <button
            className="secondary-button h-9 w-36 flex items-center justify-center cursor-pointer text-sm font-semibold bg-white hover:bg-Blue border border-[#0088CC] rounded-[15px] text-Gray-950 hover:text-white transition-all duration-300 shadow-button-shadow focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
            disabled={pendingNoiseSuppression}
            onClick={() => selectOrClose(true)}
          >
            {t('cancel')}
          </button>
          <ActionButton
            onClick={() => selectOrClose(false)}
            disabled={!selectedMic || pendingNoiseSuppression}
          >
            {mode === 'select' ? t('save') : t('share')}
          </ActionButton>
        </div>
      )}
      customBodyClass="microphone-modal !overflow-[initial]"
    >
      <div className="mb-4">
        <Dropdown
          id="audio-preset"
          label={t('footer.modal.audio-quality')}
          value={selectedPreset}
          onChange={setSelectedPreset}
          disabled={isActiveMicrophone}
          options={AUDIO_PRESET_KEYS.map((preset) => ({
            value: preset,
            text: t(`footer.modal.audio-preset.${preset}`),
          }))}
        />
        {isActiveMicrophone && (
          <p className="text-xs text-Gray-500 dark:text-Gray-400">
            {t('footer.modal.quality-next-start')}
          </p>
        )}
      </div>
      {showNoiseSuppression && (
        <div className="mb-6 rounded-xl border border-Gray-200 dark:border-Gray-700 bg-Gray-50 dark:bg-dark-secondary2 p-3 sm:p-4">
          <SettingsSwitch
            label={t('footer.modal.noise-suppression')}
            enabled={isLive ? noiseSuppression : draftNoiseSuppression}
            disabled={pendingNoiseSuppression || !noiseSuppressionSupported}
            onChange={handleNoiseSuppressionChange}
            helpText={
              noiseSuppressionSupported
                ? t('footer.modal.noise-suppression-help')
                : t('footer.modal.noise-suppression-unsupported')
            }
          />
        </div>
      )}
      <AudioDevicePicker
        value={selectedMic}
        onChange={setSelectMic}
        onDevices={onDevicesLoaded}
        initialDevices={initialDevices}
      />
    </Modal>
  );
};

export default MicrophoneModal;
