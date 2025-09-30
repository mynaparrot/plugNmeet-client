import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CloudRecordingVariants,
  RecordingFeatures,
} from 'plugnmeet-protocol-js';

import { RecordingType, SelectedRecordingType } from './IRecording';
import { store } from '../../../../store';
import Modal from '../../../../helpers/ui/modal';
import ActionButton from '../../../../helpers/ui/actionButton';
import RadioOptions, {
  IRadioOption,
} from '../../../../helpers/ui/radioOptions';

interface IRecordingModalProps {
  showModal: boolean;
  recordingFeatures?: RecordingFeatures;
  onCloseModal(selected: SelectedRecordingType): void;
}

const RecordingModal = ({
  showModal,
  recordingFeatures,
  onCloseModal,
}: IRecordingModalProps) => {
  const [recordingType, setRecordingType] = useState<
    SelectedRecordingType | undefined
  >(undefined);
  const { t } = useTranslation();
  const isCloud = store.getState().session.isCloud;
  const e2eeFeatures =
    store.getState().session.currentRoom?.metadata?.roomFeatures
      ?.endToEndEncryptionFeatures;

  const startRecording = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (recordingType) {
        onCloseModal(recordingType);
      }
    },
    [recordingType, onCloseModal],
  );

  const closeModal = () => {
    onCloseModal({
      type: RecordingType.RECORDING_TYPE_NONE,
    });
  };

  const radioOptions = useMemo(() => {
    const options: IRadioOption[] = [];
    if (recordingFeatures?.isAllowLocal) {
      options.push({
        id: 'local',
        value: RecordingType.RECORDING_TYPE_LOCAL,
        label: t('footer.icons.local-recording'),
      });
    }
    if (recordingFeatures?.isAllowCloud) {
      options.push({
        id: 'full-screen',
        value: CloudRecordingVariants.FULL_SCREEN_CLOUD_RECORDING,
        label: t('footer.icons.cloud-recording'),
        disabled: !!e2eeFeatures?.enabledSelfInsertEncryptionKey,
        description: e2eeFeatures?.enabledSelfInsertEncryptionKey
          ? t('notifications.cloud-recording-not-supported-self-key')
          : undefined,
      });
      if (isCloud) {
        options.push({
          id: 'media-only',
          value: CloudRecordingVariants.MEDIA_ONLY_CLOUD_RECORDING,
          label: t('footer.icons.cloud-media-only-recording'),
          disabled: !!e2eeFeatures?.isEnabled,
          description: e2eeFeatures?.isEnabled
            ? t('notifications.media-only-recording-not-support-e2ee')
            : undefined,
        });
      }
    }
    return options;
  }, [recordingFeatures, isCloud, e2eeFeatures, t]);

  const handleRadioChange = (value: any) => {
    if (value === RecordingType.RECORDING_TYPE_LOCAL) {
      setRecordingType({ type: RecordingType.RECORDING_TYPE_LOCAL });
    } else {
      setRecordingType({
        type: RecordingType.RECORDING_TYPE_CLOUD,
        variant: value,
      });
    }
  };

  const getCheckedValue = () => {
    if (recordingType?.type === RecordingType.RECORDING_TYPE_LOCAL) {
      return RecordingType.RECORDING_TYPE_LOCAL;
    }
    return recordingType?.variant;
  };

  return (
    <Modal
      show={showModal}
      onClose={closeModal}
      title={t('footer.icons.how-to-record')}
      renderButtons={() => (
        <ActionButton
          buttonType="submit"
          onClick={(e) => startRecording(e as any)}
        >
          {t('footer.icons.start-recording')}
        </ActionButton>
      )}
    >
      <form action="#" method="POST" onSubmit={(e) => startRecording(e)}>
        <p className="text-sm text-Gray-950">
          {t('footer.icons.recording-types-des')}
        </p>
        <RadioOptions
          name="recording-type"
          options={radioOptions}
          checked={getCheckedValue()}
          onChange={handleRadioChange}
        />
      </form>
    </Modal>
  );
};

export default RecordingModal;
