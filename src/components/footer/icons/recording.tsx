import React, { useEffect, useState } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

import { RootState, store, useAppSelector } from '../../../store';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import { IRoomMetadata } from '../../../store/slices/interfaces/session';
import { RecordingTasks } from '../../../helpers/proto/plugnmeet_recorder_pb';
import { RecordingReq } from '../../../helpers/proto/plugnmeet_recording_pb';
import { CommonResponse } from '../../../helpers/proto/plugnmeet_common_api_pb';

const isRecordingSelector = createSelector(
  (state: RootState) => state.session.isActiveRecording,
  (is_recording) => is_recording,
);
const RecordingIcon = () => {
  const showTooltip = store.getState().session.userDeviceType === 'desktop';
  const { t } = useTranslation();

  const isRecording = useAppSelector(isRecordingSelector);
  const [disable, setDisable] = useState<boolean>(false);
  const [running, setRunning] = useState<boolean>(false);
  const [allowRecording, setAllowRecording] = useState<boolean>(true);
  const isAdmin = store.getState().session.currentUser?.metadata?.is_admin;
  let timer: any = 0;

  useEffect(() => {
    if (isRecording) {
      setRunning(true);
      clearTimeout(timer);
      setDisable(false);
    } else if (!isRecording && running) {
      setRunning(false);
      clearTimeout(timer);
      setDisable(false);
    }

    return () => {
      clearTimeout(timer);
    };
  }, [isRecording, running, timer]);

  useEffect(() => {
    const metadata = store.getState().session.currentRoom
      .metadata as IRoomMetadata;
    if (!metadata.room_features?.allow_recording) {
      setAllowRecording(false);
    }
  }, []);

  const onClick = () => {
    setDisable(true);
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = async () => {
    const body = new RecordingReq({
      task: RecordingTasks.START_RECORDING,
      sid: store.getState().session.currentRoom.sid,
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
      msg = res.msg;
    }

    toast(t(msg), {
      toastId: 'recording-status',
      type: 'info',
    });

    if (res.status) {
      timer = setTimeout(() => {
        setDisable(false);
        toast(t('footer.notice.recording-not-start'), {
          toastId: 'recording-status',
          type: 'error',
        });
      }, 30000);
    }
  };

  const stopRecording = async () => {
    const body = new RecordingReq({
      task: RecordingTasks.STOP_RECORDING,
      sid: store.getState().session.currentRoom.sid,
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
      msg = res.msg;
    }

    toast(t(msg), {
      toastId: 'recording-status',
      type: 'info',
    });

    timer = setTimeout(() => {
      setDisable(false);
      toast(t('footer.notice.recording-did-not-stop'), {
        toastId: 'recording-status',
        type: 'error',
      });
    }, 30000);
  };

  const render = () => {
    return (
      <button
        className={`${
          isRecording ? 'record' : ''
        } footer-icon h-[35px] lg:h-[40px] w-[35px] lg:w-[40px] overflow-hidden rounded-full bg-[#F2F2F2] dark:bg-darkSecondary2 hover:bg-[#ECF4FF] mr-3 lg:mr-6 flex items-center justify-center cursor-pointer ${
          showTooltip ? 'has-tooltip' : ''
        }`}
        onClick={() => onClick()}
        disabled={disable}
      >
        <span className="tooltip rounded shadow-lg p-1 bg-gray-100 dark:bg-darkSecondary2 text-red-500 dark:text-darkText -mt-16 text-[10px] w-max">
          {isRecording
            ? t('footer.icons.stop-recording')
            : t('footer.icons.start-recording')}
        </span>
        <i className="pnm-rec primaryColor dark:text-darkText text-[10px] lg:text-[12px] font-['Nunito Sans'] font-bold" />
      </button>
    );
  };

  return <>{allowRecording && isAdmin ? render() : null}</>;
};

export default RecordingIcon;
