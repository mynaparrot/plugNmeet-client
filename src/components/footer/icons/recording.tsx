import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
  const showTooltip = store.getState().session.userDeviceType === 'desktop';
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
  const roomMetadata = store.getState().session.currentRoom
    .metadata as IRoomMetadata;
  const isAllowRecording =
    roomMetadata.roomFeatures?.recordingFeatures?.isAllow;
  const isAdmin = store.getState().session.currentUser?.metadata?.isAdmin;
  const isPresenter =
    store.getState().session.currentUser?.metadata?.isPresenter;

  const isRunningCloudRecording = useAppSelector(
    (state) => state.session.isActiveRecording,
  );
  const [disable, setDisable] = useState<boolean>(false);
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [allowRecording, setAllowRecording] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingType, setRecordingType] = useState<RecordingType>(
    RecordingType.RECORDING_TYPE_NONE,
  );
  const [timer, setTimer] = useState<NodeJS.Timeout | undefined>(undefined);
  const [checkedAutoRecording, setCheckedAutoRecording] =
    useState<boolean>(false);

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
    if (!isAllowRecording) {
      setAllowRecording(false);
    }
    //eslint-disable-next-line
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
    let timeout: string | number | NodeJS.Timeout | undefined;
    if (
      isAllowRecording &&
      isAdmin &&
      isPresenter &&
      !isRunningCloudRecording &&
      !checkedAutoRecording &&
      roomMetadata.roomFeatures?.recordingFeatures?.enableAutoCloudRecording
    ) {
      timeout = setTimeout(async () => {
        await startRecording({ type: RecordingType.RECORDING_TYPE_CLOUD });
      }, 1000);
    }
    setCheckedAutoRecording(true);

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
    //eslint-disable-next-line
  }, [isRunningCloudRecording]);

  const render = () => {
    return (
      <>
        {openModal ? (
          <RecordingModal
            showModal={openModal}
            recordingFeatures={roomMetadata.roomFeatures?.recordingFeatures}
            onCloseModal={onCloseModal}
          />
        ) : null}
        {/* <button
          className={`${
            isRecording ? 'record' : ''
          } footer-icon h-[35px] lg:h-[40px] w-[35px] lg:w-[40px] overflow-hidden rounded-full bg-[#F2F2F2] dark:bg-dark-secondary2 hover:bg-[#ECF4FF] ltr:mr-3 lg:ltr:mr-6 rtl:ml-3 lg:rtl:ml-6 flex items-center justify-center cursor-pointer ${
            showTooltip ? 'has-tooltip' : ''
          }`}
          onClick={() => onClickRecordingBtn()}
          disabled={disable}
        >
          <span className="tooltip bottom-[62px]!">
            {isRecording
              ? t('footer.icons.stop-recording')
              : t('footer.icons.start-recording')}
          </span>
          <i className="pnm-rec primaryColor dark:text-dark-text text-[11px] lg:text-[12px] font-['Nunito Sans'] font-bold" />
        </button> */}
        <button
          className={`recorder-icon relative footer-icon cursor-pointer w-11 3xl:w-[52px] h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[18px] border-[3px] 3xl:border-4 ${isRecording ? 'record border-Red-400/20' : 'border-transparent'}`}
          onClick={() => onClickRecordingBtn()}
          disabled={disable}
        >
          <div
            className={`h-full w-full flex items-center justify-center rounded-[12px] 3xl:rounded-[15px] border border-Gray-300 shadow transition-all duration-300 hover:bg-gray-100 text-Gray-950 ${
              showTooltip ? 'has-tooltip' : ''
            } ${isRecording ? 'bg-gray-100' : 'bg-white'}`}
          >
            <span className="tooltip bottom-[62px]!">
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

  return <>{allowRecording && isAdmin ? render() : null}</>;
};

export default RecordingIcon;
