import React, { useEffect, useState } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { Room } from 'livekit-client';

import { RootState, store, useAppSelector } from '../../../store';
import { IRoomMetadata } from '../../../store/slices/interfaces/session';
import RecordingModal from './recording/recordingModal';
import { RecordingEvent, RecordingType } from './recording/IRecording';
import useLocalRecording from './recording/useLocalRecording';
import useCloudRecording from './recording/useCloudRecording';

interface IRecordingIconProps {
  currentRoom: Room;
}

const isRecordingSelector = createSelector(
  (state: RootState) => state.session.isActiveRecording,
  (is_recording) => is_recording,
);
const RecordingIcon = ({ currentRoom }: IRecordingIconProps) => {
  const showTooltip = store.getState().session.userDeviceType === 'desktop';
  const {
    recordingEvent: localRecordingEvent,
    startRecording: startLocalRecording,
    stopRecording: stopLocalRecording,
  } = useLocalRecording(currentRoom.localParticipant, currentRoom.name);

  const {
    hasError: hasCloudRecordingError,
    resetError: resetCloudRecordingError,
    startRecording: startCloudRecording,
    stopRecording: stopCloudRecording,
  } = useCloudRecording(currentRoom.sid);

  const { t } = useTranslation();
  const isAdmin = store.getState().session.currentUser?.metadata?.is_admin;

  const isRunningCloudRecording = useAppSelector(isRecordingSelector);
  const [disable, setDisable] = useState<boolean>(false);
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [allowRecording, setAllowRecording] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingType, setRecordingType] = useState<RecordingType>(
    RecordingType.RECORDING_TYPE_NONE,
  );
  const [timer, setTimer] = useState<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (
      isRunningCloudRecording &&
      recordingType !== RecordingType.RECORDING_TYPE_CLOUD
    ) {
      if (recordingType === RecordingType.RECORDING_TYPE_LOCAL && isRecording) {
        stopLocalRecording();
      }

      setRecordingType(RecordingType.RECORDING_TYPE_CLOUD);
      clearTimeout(timer);
      setDisable(false);
      setIsRecording(true);
    } else if (
      isRunningCloudRecording &&
      recordingType === RecordingType.RECORDING_TYPE_CLOUD &&
      !isRecording
    ) {
      clearTimeout(timer);
      setDisable(false);
      setIsRecording(true);
    } else if (
      !isRunningCloudRecording &&
      recordingType === RecordingType.RECORDING_TYPE_CLOUD &&
      isRecording
    ) {
      clearTimeout(timer);
      setDisable(false);
      setIsRecording(false);
      setRecordingType(RecordingType.RECORDING_TYPE_NONE);
    }
    //eslint-disable-next-line
  }, [isRunningCloudRecording, recordingType, isRecording, timer]);

  useEffect(() => {
    const metadata = store.getState().session.currentRoom
      .metadata as IRoomMetadata;
    if (!metadata.room_features?.allow_recording) {
      setAllowRecording(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [timer]);

  useEffect(() => {
    if (localRecordingEvent === RecordingEvent.STARTED_RECORDING) {
      setDisable(false);
      setIsRecording(true);
    } else if (localRecordingEvent === RecordingEvent.STOPPED_RECORDING) {
      setDisable(false);
      setIsRecording(false);
    }
  }, [localRecordingEvent]);

  useEffect(() => {
    if (hasCloudRecordingError) {
      setDisable(false);
      setIsRecording(false);
      resetCloudRecordingError();

      if (timer) {
        clearTimeout(timer);
      }
    }
    //eslint-disable-next-line
  }, [hasCloudRecordingError]);

  const onClickRecordingBtn = () => {
    if (!isRecording) {
      setOpenModal(true);
    } else {
      setOpenModal(false);
      setDisable(true);

      if (recordingType === RecordingType.RECORDING_TYPE_LOCAL) {
        stopLocalRecording();
      } else if (recordingType === RecordingType.RECORDING_TYPE_CLOUD) {
        stopCloudRecording();

        const timer = setTimeout(() => {
          setDisable(false);
          toast(t('footer.notice.recording-did-not-stop'), {
            toastId: 'recording-status',
            type: 'error',
          });
        }, 30000);
        setTimer(timer);
      }
    }
  };

  const onCloseModal = (recordingType: RecordingType) => {
    setOpenModal(false);

    if (recordingType === RecordingType.RECORDING_TYPE_LOCAL) {
      setDisable(true);
      setRecordingType(recordingType);
      startLocalRecording();
    } else if (recordingType === RecordingType.RECORDING_TYPE_CLOUD) {
      setDisable(true);
      setRecordingType(recordingType);
      startCloudRecording();

      const timer = setTimeout(() => {
        setDisable(false);
        toast(t('footer.notice.recording-not-start'), {
          toastId: 'recording-status',
          type: 'error',
        });
      }, 30000);
      setTimer(timer);
    }
  };

  const render = () => {
    return (
      <>
        {openModal ? (
          <RecordingModal
            showModal={openModal}
            onCloseModal={(recordingType) => onCloseModal(recordingType)}
          />
        ) : null}
        <button
          className={`${
            isRecording ? 'record' : ''
          } footer-icon h-[35px] lg:h-[40px] w-[35px] lg:w-[40px] overflow-hidden rounded-full bg-[#F2F2F2] dark:bg-darkSecondary2 hover:bg-[#ECF4FF] mr-3 lg:mr-6 flex items-center justify-center cursor-pointer ${
            showTooltip ? 'has-tooltip' : ''
          }`}
          onClick={() => onClickRecordingBtn()}
          disabled={disable}
        >
          <span className="tooltip rounded shadow-lg p-1 bg-gray-100 dark:bg-darkSecondary2 text-red-500 dark:text-darkText -mt-16 text-[10px] w-max">
            {isRecording
              ? t('footer.icons.stop-recording')
              : t('footer.icons.start-recording')}
          </span>
          <i className="pnm-rec primaryColor dark:text-darkText text-[10px] lg:text-[12px] font-['Nunito Sans'] font-bold" />
        </button>
      </>
    );
  };

  return <>{allowRecording && isAdmin ? render() : null}</>;
};

export default RecordingIcon;
