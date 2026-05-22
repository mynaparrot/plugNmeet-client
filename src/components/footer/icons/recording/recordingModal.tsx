import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { create } from '@bufbuild/protobuf';
import {
  CloudRecordingVariants,
  RecorderBotOptions,
  RecorderBotOptionsSchema,
} from 'plugnmeet-protocol-js';

import { RecordingType, SelectedRecordingType } from './IRecording';
import { store, useAppSelector } from '../../../../store';
import Modal from '../../../../helpers/ui/modal';
import ActionButton from '../../../../helpers/ui/actionButton';
import RadioOptions, {
  IRadioOption,
} from '../../../../helpers/ui/radioOptions';
import SettingsSwitch from '../../../../helpers/ui/settingsSwitch';
import FormattedInputField from '../../../../helpers/ui/formattedInputField';

interface IRecordingModalProps {
  showModal: boolean;
  onCloseModal(
    selected: SelectedRecordingType,
    botOptions?: RecorderBotOptions,
  ): void;
}

const RecordingModal = ({ showModal, onCloseModal }: IRecordingModalProps) => {
  const recordingFeatures = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.recordingFeatures,
  );

  const [recordingType, setRecordingType] = useState<
    SelectedRecordingType | undefined
  >(undefined);
  const [enableAutoCloseChatPanel, setEnableAutoCloseChatPanel] =
    useState<boolean>(
      !!recordingFeatures?.recorderBotOptions?.enableAutoCloseChatPanel,
    );
  const [durationAfterLastMessage, setDurationAfterLastMessage] =
    useState<number>(
      recordingFeatures?.recorderBotOptions?.durationAfterLastMessage ?? 300,
    );
  const { t } = useTranslation();
  const isCloud = store.getState().session.isCloud;
  const e2eeFeatures =
    store.getState().session.currentRoom?.metadata?.roomFeatures
      ?.endToEndEncryptionFeatures;

  const startRecording = useCallback(
    (e: React.SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (recordingType) {
        const botOptions: RecorderBotOptions = create(
          RecorderBotOptionsSchema,
          {
            enableAutoCloseChatPanel,
            durationAfterLastMessage,
          },
        );
        onCloseModal(recordingType, botOptions);
      }
    },
    [
      recordingType,
      onCloseModal,
      enableAutoCloseChatPanel,
      durationAfterLastMessage,
    ],
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
      <form
        className="RecorderPop"
        action="#"
        method="POST"
        onSubmit={(e) => startRecording(e)}
      >
        <p className="text-sm text-Gray-950 dark:text-white">
          {t('footer.icons.recording-types-des')}
        </p>
        <RadioOptions
          name="recording-type"
          options={radioOptions}
          checked={getCheckedValue()}
          onChange={handleRadioChange}
        />
        {recordingType?.variant ===
          CloudRecordingVariants.FULL_SCREEN_CLOUD_RECORDING && (
          <div className="mt-4">
            <SettingsSwitch
              label={t('recorder-bot-options.enable-auto-close-chat-panel')}
              enabled={enableAutoCloseChatPanel}
              onChange={setEnableAutoCloseChatPanel}
              customCss="my-4"
            />
            {enableAutoCloseChatPanel && (
              <FormattedInputField
                label={t('recorder-bot-options.duration-after-last-message')}
                id="duration"
                value={String(durationAfterLastMessage / 60)}
                onChange={(e) =>
                  setDurationAfterLastMessage(Number(e.target.value) * 60)
                }
                helpText={t(
                  'recorder-bot-options.duration-after-last-message-help',
                )}
                type="number"
              />
            )}
          </div>
        )}
      </form>
    </Modal>
  );
};

export default RecordingModal;
