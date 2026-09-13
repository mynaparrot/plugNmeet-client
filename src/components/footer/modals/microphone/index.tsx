import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Modal from '../../../../helpers/ui/modal';
import ActionButton from '../../../../helpers/ui/actionButton';
import { IMediaDevice } from '../../../../store/slices/interfaces/roomSettings';
import AudioDevicePicker from './audioDevicePicker';

interface MicrophoneModalProps {
  show: boolean;
  initialDeviceId?: string;
  initialDevices?: IMediaDevice[];
  onCloseMicrophoneModal: (deviceId?: string) => void;
  onDevicesLoaded?: (devices: IMediaDevice[]) => void;
  /** Landing pre-join: "Select" only commits the choice, no publishing. */
  mode?: 'publish' | 'select';
}

const MicrophoneModal = ({
  show,
  initialDeviceId = '',
  initialDevices,
  onCloseMicrophoneModal,
  onDevicesLoaded,
  mode = 'publish',
}: MicrophoneModalProps) => {
  const { t } = useTranslation();
  const [selectedMic, setSelectMic] = useState<string>(initialDeviceId);

  // Landing may restore a stored id after mount — sync it in.
  useEffect(() => {
    if (initialDeviceId) {
      setSelectMic(initialDeviceId);
    }
  }, [initialDeviceId]);

  const selectOrClose = (onlyClose = false) => {
    onCloseMicrophoneModal(onlyClose ? undefined : selectedMic);
  };

  return (
    <Modal
      show={show}
      onClose={() => selectOrClose(true)}
      title={t('footer.modal.select-microphone')}
      renderButtons={() => (
        <div className="flex items-center justify-end gap-3">
          <button
            className="secondary-button h-9 w-36 flex items-center justify-center cursor-pointer text-sm font-semibold bg-white hover:bg-Blue border border-[#0088CC] rounded-[15px] text-Gray-950 hover:text-white transition-all duration-300 shadow-button-shadow focus-ring"
            type="button"
            onClick={() => selectOrClose(true)}
          >
            {t('cancel')}
          </button>
          <ActionButton
            onClick={() => selectOrClose(false)}
            disabled={!selectedMic}
          >
            {mode === 'select' ? t('save') : t('share')}
          </ActionButton>
        </div>
      )}
      customBodyClass="microphone-modal !overflow-[initial]"
    >
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
