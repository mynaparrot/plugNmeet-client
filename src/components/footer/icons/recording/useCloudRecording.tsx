import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CommonResponseSchema,
  RecordingReqSchema,
  RecordingTasks,
  CloudRecordingVariants,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { IUseCloudRecordingReturn, RecordingType } from './IRecording';
import sendAPIRequest from '../../../../helpers/api/plugNmeetAPI';
import { store, useAppDispatch } from '../../../../store';
import { addUserNotification } from '../../../../store/slices/roomSettingsSlice';

const useCloudRecording = (): IUseCloudRecordingReturn => {
  const TYPE_OF_RECORDING = RecordingType.RECORDING_TYPE_CLOUD;
  const [hasError, setHasError] = useState<boolean>(false);
  const { t } = useTranslation();
  const currentRoom = store.getState().session.currentRoom;
  const isCloud = store.getState().session.isCloud;
  const e2eeFeatures =
    currentRoom.metadata?.roomFeatures?.endToEndEncryptionFeatures;
  const dispatch = useAppDispatch();

  const startRecording = async (variant?: CloudRecordingVariants) => {
    const body = create(RecordingReqSchema, {
      task: RecordingTasks.START_RECORDING,
      sid: currentRoom.sid,
      recordingVariant: CloudRecordingVariants.FULL_SCREEN_CLOUD_RECORDING,
    });

    if (
      isCloud &&
      variant &&
      variant === CloudRecordingVariants.MEDIA_ONLY_CLOUD_RECORDING
    ) {
      if (e2eeFeatures?.isEnabled) {
        dispatch(
          addUserNotification({
            message: t('notifications.media-only-recording-not-support-e2ee'),
            typeOption: 'info',
          }),
        );
        return;
      }
      body.recordingVariant = CloudRecordingVariants.MEDIA_ONLY_CLOUD_RECORDING;
    }

    if (e2eeFeatures?.enabledSelfInsertEncryptionKey) {
      dispatch(
        addUserNotification({
          message: t('notifications.cloud-recording-not-supported-self-key'),
          typeOption: 'info',
        }),
      );
      return;
    }

    if (typeof (window as any).DESIGN_CUSTOMIZATION !== 'undefined') {
      body.customDesign = `${(window as any).DESIGN_CUSTOMIZATION}`.replace(
        /\s/g,
        '',
      );
    }
    const r = await sendAPIRequest(
      'recording',
      toBinary(RecordingReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));
    let msg = 'footer.notice.start-recording-progress';
    if (!res.status) {
      setHasError(true);
      msg = res.msg;
    }

    dispatch(
      addUserNotification({
        message: t(msg),
        typeOption: 'info',
      }),
    );
  };

  const stopRecording = async () => {
    const body = create(RecordingReqSchema, {
      task: RecordingTasks.STOP_RECORDING,
      roomId: currentRoom.roomId,
      sid: currentRoom.sid,
    });
    const r = await sendAPIRequest(
      'recording',
      toBinary(RecordingReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));
    let msg = 'footer.notice.stop-recording-service-in-progress';

    if (!res.status) {
      setHasError(true);
      msg = res.msg;
    }

    dispatch(
      addUserNotification({
        message: t(msg),
        typeOption: 'info',
      }),
    );
  };

  const resetError = () => {
    if (hasError) {
      setHasError(false);
    }
  };

  return {
    TYPE_OF_RECORDING,
    hasError,
    startRecording,
    stopRecording,
    resetError,
  };
};

export default useCloudRecording;
