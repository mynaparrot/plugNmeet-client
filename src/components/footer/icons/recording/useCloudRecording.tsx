import { useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
  CommonResponseSchema,
  RecordingReqSchema,
  RecordingTasks,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { IUseCloudRecordingReturn, RecordingType } from './IRecording';
import sendAPIRequest from '../../../../helpers/api/plugNmeetAPI';
import { store } from '../../../../store';

const useCloudRecording = (): IUseCloudRecordingReturn => {
  const TYPE_OF_RECORDING = RecordingType.RECORDING_TYPE_LOCAL;
  const [hasError, setHasError] = useState<boolean>(false);
  const { t } = useTranslation();
  const currentRoom = store.getState().session.currentRoom;

  const startRecording = async () => {
    const body = create(RecordingReqSchema, {
      task: RecordingTasks.START_RECORDING,
      sid: currentRoom.sid,
    });
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

    toast(t(msg), {
      toastId: 'recording-status',
      type: 'info',
    });
  };

  const stopRecording = async () => {
    const body = create(RecordingReqSchema, {
      task: RecordingTasks.STOP_RECORDING,
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

    toast(t(msg).toString(), {
      toastId: 'recording-status',
      type: 'info',
    });
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
