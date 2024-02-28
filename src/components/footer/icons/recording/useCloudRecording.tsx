import { useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { Room } from 'livekit-client';

import { IUseCloudRecordingReturn, RecordingType } from './IRecording';
import { RecordingReq } from '../../../../helpers/proto/plugnmeet_recording_pb';
import { RecordingTasks } from '../../../../helpers/proto/plugnmeet_recorder_pb';
import sendAPIRequest from '../../../../helpers/api/plugNmeetAPI';
import { CommonResponse } from '../../../../helpers/proto/plugnmeet_common_api_pb';

const useCloudRecording = (currentRoom: Room): IUseCloudRecordingReturn => {
  const TYPE_OF_RECORDING = RecordingType.RECORDING_TYPE_LOCAL;
  const [hasError, setHasError] = useState<boolean>(false);
  const { t } = useTranslation();

  const startRecording = async () => {
    const sid = await currentRoom.getSid();

    const body = new RecordingReq({
      task: RecordingTasks.START_RECORDING,
      sid: sid,
    });
    if (typeof (window as any).DESIGN_CUSTOMIZATION !== 'undefined') {
      body.customDesign = `${(window as any).DESIGN_CUSTOMIZATION}`.replace(
        /\s/g,
        '',
      );
    }
    const r = await sendAPIRequest(
      'recording',
      body.toBinary(),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = CommonResponse.fromBinary(new Uint8Array(r));
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
    const sid = await currentRoom.getSid();
    const body = new RecordingReq({
      task: RecordingTasks.STOP_RECORDING,
      sid: sid,
    });
    const r = await sendAPIRequest(
      'recording',
      body.toBinary(),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = CommonResponse.fromBinary(new Uint8Array(r));
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
