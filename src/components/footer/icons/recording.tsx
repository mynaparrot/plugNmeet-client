import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import { IRoomMetadata } from '../../../store/slices/interfaces/session';
import RecordingModal from './recording/recordingModal';
import {
  RecordingEvent,
  RecordingType,
  SelectedRecordingType,
} from './recording/IRecording';
import useLocalRecording from './recording/useLocalRecording';
import useCloudRecording from './recording/useCloudRecording';
import { addUserNotification } from '../../../store/slices/roomSettingsSlice';

const RecordingIcon = () => {
  const dispatch = useAppDispatch();
  const {
    hasError: localRecordingError,
    recordingEvent: localRecordingEvent,
    startRecording: startLocalRecording,
    stopRecording: stopLocalRecording,
    resetError: resetLocalRecordingError,
  } = useLocalRecording();

  const {
    hasError: hasCloudRecordingError,
    resetError: resetCloudRecordingError,
    startRecording: startCloudRecording,
    stopRecording: stopCloudRecording,
  } = useCloudRecording();

  const { t } = useTranslation();
  const { roomMetadata, isAllowRecording, isAdmin, isPresenter, showTooltip } =
    useMemo(() => {
      const session = store.getState().session;
      const roomMetadata = session.currentRoom.metadata as IRoomMetadata;
      return {
        roomMetadata,
        isAllowRecording: roomMetadata.roomFeatures?.recordingFeatures?.isAllow,
        isAdmin: !!session.currentUser?.metadata?.isAdmin,
        isPresenter: !!session.currentUser?.metadata?.isPresenter,
        showTooltip: session.userDeviceType === 'desktop',
      };
    }, []);

  const isRunningCloudRecording = useAppSelector(
    (state) => state.session.isActiveRecording,
  );
  const [disable, setDisable] = useState<boolean>(false);
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingType, setRecordingType] = useState<RecordingType>(
    RecordingType.RECORDING_TYPE_NONE,
  );
  const [timer, setTimer] = useState<NodeJS.Timeout | undefined>(undefined);
  const checkedAutoRecording = useRef(false);

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
    const reset = () => {
      setDisable(false);
      setIsRecording(false);
      if (timer) {
        clearTimeout(timer);
      }
    };

    if (hasCloudRecordingError) {
      reset();
      resetCloudRecordingError();
    }
    if (localRecordingError) {
      reset();
      resetLocalRecordingError();
    }
    //eslint-disable-next-line
  }, [hasCloudRecordingError, localRecordingError]);

  const onClickRecordingBtn = async () => {
    if (!isRecording) {
      setOpenModal(true);
    } else {
      setOpenModal(false);
      setDisable(true);

      if (recordingType === RecordingType.RECORDING_TYPE_LOCAL) {
        stopLocalRecording();
      } else if (recordingType === RecordingType.RECORDING_TYPE_CLOUD) {
        await stopCloudRecording();

        const timer = setTimeout(() => {
          setDisable(false);
          dispatch(
            addUserNotification({
              message: t('footer.notice.recording-did-not-stop'),
              typeOption: 'error',
            }),
          );
        }, 30000);
        setTimer(timer);
      }
    }
  };

  const startRecording = async (
    selectedRecordingType: SelectedRecordingType,
  ) => {
    if (selectedRecordingType.type === RecordingType.RECORDING_TYPE_LOCAL) {
      setDisable(true);
      setRecordingType(selectedRecordingType.type);
      startLocalRecording();
    } else if (
      selectedRecordingType.type === RecordingType.RECORDING_TYPE_CLOUD
    ) {
      setDisable(true);
      setRecordingType(selectedRecordingType.type);
      await startCloudRecording(selectedRecordingType.variant);

      const timer = setTimeout(() => {
        setDisable(false);
        dispatch(
          addUserNotification({
            message: t('footer.notice.recording-not-start'),
            typeOption: 'error',
          }),
        );
      }, 30000);
      setTimer(timer);
    }
  };

  const onCloseModal = (selectedRecordingType: SelectedRecordingType) => {
    setOpenModal(false);
    startRecording(selectedRecordingType).then();
  };

  // for auto cloud recording
  useEffect(() => {
    if (
      isAllowRecording &&
      isAdmin &&
      isPresenter &&
      !isRunningCloudRecording &&
      !checkedAutoRecording.current &&
      roomMetadata.roomFeatures?.recordingFeatures?.enableAutoCloudRecording
    ) {
      const timeout = setTimeout(async () => {
        await startRecording({ type: RecordingType.RECORDING_TYPE_CLOUD });
      }, 1000);
      checkedAutoRecording.current = true;
      return () => clearTimeout(timeout);
    }
    //eslint-disable-next-line
  }, [isRunningCloudRecording]);

  if (!isAllowRecording || !isAdmin) {
    return null;
  }

  const buttonClasses = clsx(
    'recorder-icon relative footer-icon cursor-pointer w-11 3xl:w-[52px] h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[18px] border-[3px] 3xl:border-4',
    {
      'record border-Red-400/20': isRecording,
      'border-transparent': !isRecording,
    },
  );

  const innerDivClasses = clsx(
    'h-full w-full flex items-center justify-center rounded-[12px] 3xl:rounded-[15px] border border-Gray-300 shadow transition-all duration-300 hover:bg-gray-100 text-Gray-950',
    {
      'has-tooltip': showTooltip,
      'bg-gray-100': isRecording,
      'bg-white': !isRecording,
    },
  );

  return (
    <>
      {openModal && (
        <RecordingModal
          showModal={openModal}
          recordingFeatures={roomMetadata.roomFeatures?.recordingFeatures}
          onCloseModal={onCloseModal}
        />
      )}
      <button
        className={buttonClasses}
        onClick={() => onClickRecordingBtn()}
        disabled={disable}
      >
        <div className={innerDivClasses}>
          <span className="tooltip">
            {isRecording
              ? t('footer.icons.stop-recording')
              : t('footer.icons.start-recording')}
          </span>
          <i className="pnm-rec text-black text-[11px] lg:text-[12px] font-['Nunito Sans'] font-bold" />
        </div>
      </button>
    </>
  );
};

export default RecordingIcon;
