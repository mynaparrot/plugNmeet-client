import React, {
  Dispatch,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { store, useAppDispatch, useAppSelector } from '../../store';
import { toggleStartup } from '../../store/slices/sessionSlice';
import {
  addAudioDevices,
  addVideoDevices,
  updateSelectedAudioDevice,
  updateSelectedVideoDevice,
} from '../../store/slices/roomSettingsSlice';
import { Volume } from '../../assets/Icons/Volume';
import { roomConnectionStatus } from '../app/helper';
import { getNatsConn } from '../../helpers/nats';
import { useMediaDevices } from './hooks/useMediaDevices';
import { MicrophoneOff } from '../../assets/Icons/MicrophoneOff';
import { CameraOff } from '../../assets/Icons/CameraOff';
import { LoadingIcon } from '../../assets/Icons/Loading';

import MicrophoneIcon from './microphone';
import WebcamIcon from './webcam';
import WebcamPreview from './webcamPreview';

interface StartupJoinModalProps {
  setIsAppReady: Dispatch<boolean>;
  roomConnectionStatus: roomConnectionStatus;
}

const Landing = ({
  setIsAppReady,
  roomConnectionStatus,
}: StartupJoinModalProps) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  // static values
  const { isWebcamAllowed } = useMemo(() => {
    const session = store.getState().session;
    const roomFeatures = session.currentRoom.metadata?.roomFeatures;
    const isAdmin = !!session.currentUser?.metadata?.isAdmin;

    let show = true;
    if (!roomFeatures?.allowWebcams) {
      show = false;
    } else if (roomFeatures?.adminOnlyWebcams && !isAdmin) {
      show = false;
    }

    return {
      isWebcamAllowed: show,
    };
  }, []);

  const isStartup = useAppSelector((state) => state.session.isStartup);
  const waitForApproval = useAppSelector(
    (state) => state.session.currentUser?.metadata?.waitForApproval,
  );
  const waitingRoomMessage = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.waitingRoomFeatures
        ?.waitingRoomMsg,
  );
  const lockMicrophone = useAppSelector(
    (state) =>
      state.session.currentUser?.metadata?.lockSettings?.lockMicrophone,
  );
  const lockWebcam = useAppSelector(
    (state) => state.session.currentUser?.metadata?.lockSettings?.lockWebcam,
  );

  const {
    audioDevices,
    videoDevices,
    selectedAudioDevice,
    selectedVideoDevice,
    setSelectedAudioDevice,
    setSelectedVideoDevice,
    enableMediaDevices,
    disableWebcam,
    disableMic,
  } = useMediaDevices();

  const [showLoadingMsg, setShowLoadingMsg] = useState<string | undefined>(
    undefined,
  );
  const [isReadyToConn, setIsReadyToConn] = useState<boolean | undefined>(
    undefined,
  );

  useEffect(() => {
    switch (roomConnectionStatus) {
      case 'media-server-conn-start':
        setShowLoadingMsg(t('landing.connecting-media-server'));
        break;
      case 'media-server-conn-established':
        dispatch(toggleStartup(false));
        setIsAppReady(true);
        setShowLoadingMsg(undefined);
        break;
    }
  }, [roomConnectionStatus, t, dispatch, setIsAppReady]);

  useEffect(() => {
    if (waitForApproval) {
      if (typeof isReadyToConn !== 'undefined') {
        setShowLoadingMsg(t('landing.waiting-for-approval-title'));
      }
    } else {
      if (isReadyToConn) {
        const conn = getNatsConn();
        if (conn) {
          conn.finalizeAppConn();
        }
      }
    }
  }, [t, waitForApproval, isReadyToConn]);

  const openConn = useCallback(() => {
    if (selectedVideoDevice !== '') {
      dispatch(updateSelectedVideoDevice(selectedVideoDevice));
      dispatch(addVideoDevices(videoDevices));
    }
    if (selectedAudioDevice !== '') {
      dispatch(updateSelectedAudioDevice(selectedAudioDevice));
      dispatch(addAudioDevices(audioDevices));
    }

    setIsReadyToConn(true);
  }, [
    selectedAudioDevice,
    selectedVideoDevice,
    dispatch,
    videoDevices,
    audioDevices,
  ]);

  const getJoinPrompt = useCallback(() => {
    if (lockMicrophone && (lockWebcam || !isWebcamAllowed)) {
      return t('landing.join-prompt-both-locked');
    } else if (lockMicrophone) {
      return t('landing.join-prompt-mic-locked');
    } else if (lockWebcam || !isWebcamAllowed) {
      return t('landing.join-prompt-cam-locked');
    }
    return t('landing.join-prompt');
  }, [lockMicrophone, lockWebcam, isWebcamAllowed, t]);

  const getEnableDeviceButton = useCallback(() => {
    if (lockMicrophone) {
      return {
        text: t('landing.enable-cam-btn'),
        action: () => enableMediaDevices('video'),
      };
    } else if (lockWebcam || !isWebcamAllowed) {
      return {
        text: t('landing.enable-mic-btn'),
        action: () => enableMediaDevices('audio'),
      };
    }
    return {
      text: t('landing.enable-mic-cam-btn'),
      action: () => enableMediaDevices('both'),
    };
  }, [t, lockMicrophone, lockWebcam, isWebcamAllowed, enableMediaDevices]);

  return (
    isStartup && (
      <div
        id="startupJoinModal"
        className={`absolute w-full join-the-audio-popup bg-Gray-100 min-h-full flex items-center justify-center p-5 scrollBar`}
      >
        <div className="inner m-auto bg-Gray-50 border border-Gray-300 overflow-hidden rounded-2xl w-full max-w-4xl 3xl:max-w-5xl">
          <div className="head bg-white h-[50px] 3xl:h-[60px] px-3 sm:px-5 flex justify-center sm:justify-start text-center sm:text-left items-center text-Gray-950 text-sm sm:text-base 3xl:text-lg font-medium border-b border-Gray-200">
            {t('landing.modal-title')}
          </div>
          <div className="wrapper bg-Gray-50 pt-4 sm:pt-8 3xl:pt-11 pb-4 sm:pb-10 3xl:pb-14 px-4 sm:px-8 3xl:px-12 flex flex-wrap">
            <div className="left relative z-20 bg-Gray-25 shadow-box1 border border-Gray-200 p-2 w-full md:w-1/2 rounded-2xl mb-5 sm:mb-0">
              <WebcamPreview selectedVideoDevice={selectedVideoDevice} />
              <div className="micro-cam-wrap flex justify-center py-5 gap-5 empty:hidden">
                {lockMicrophone ? (
                  <div className="microphone-wrap relative cursor-not-allowed shadow-IconBox border border-Red-200 rounded-2xl h-11 w-11 flex items-center justify-center transition-all duration-300 text-Gray-950">
                    <MicrophoneOff classes="h-6 w-6 text-red-200" />
                    <i className="pnm-lock absolute -top-1 -right-1 z-10 text-red-500"></i>
                  </div>
                ) : (
                  <MicrophoneIcon
                    audioDevices={audioDevices}
                    enableMediaDevices={enableMediaDevices}
                    disableMic={disableMic}
                    setSelectedAudioDevice={setSelectedAudioDevice}
                    selectedAudioDevice={selectedAudioDevice}
                  />
                )}
                {lockWebcam || !isWebcamAllowed ? (
                  <div className="cam-wrap relative cursor-not-allowed shadow-IconBox border border-Red-200 rounded-2xl h-11 w-11 flex items-center justify-center transition-all duration-300 text-Gray-950">
                    <CameraOff classes="h-6 w-6 text-red-200" />
                    <i className="pnm-lock absolute -top-1 -right-1 z-10 text-red-500" />
                  </div>
                ) : (
                  <WebcamIcon
                    videoDevices={videoDevices}
                    enableMediaDevices={enableMediaDevices}
                    disableWebcam={disableWebcam}
                    setSelectedVideoDevice={setSelectedVideoDevice}
                    selectedVideoDevice={selectedVideoDevice}
                  />
                )}
              </div>
            </div>
            <div className="right w-full md:w-1/2 md:pl-8 3xl:pl-16 sm:py-8 flex items-center">
              {showLoadingMsg ? (
                <div className="inner waiting-room-contents relative md:-mt-10 w-full">
                  {waitForApproval ? (
                    <div className="texts text-center md:text-left">
                      <h3 className="font-bold text-lg md:text-xl 3xl:text-2xl text-Gray-950 leading-snug pb-2 flex items-center justify-center md:justify-start gap-2">
                        <LoadingIcon
                          className={
                            'inline h-5 w-5 text-Gray-200 animate-spin'
                          }
                          fillColor={'#004D90'}
                        />
                        {t('landing.waiting-for-approval-title')}
                      </h3>
                      <p className="text-sm 3xl:text-base text-Gray-800 md:pl-7">
                        {waitingRoomMessage ||
                          t('notifications.waiting-for-approval')}
                      </p>
                    </div>
                  ) : (
                    <div className="texts text-center md:text-left">
                      <h3 className="font-bold text-lg md:text-xl 3xl:text-2xl text-Gray-950 leading-snug pb-2 flex items-center justify-center md:justify-start gap-2">
                        <LoadingIcon
                          className={
                            'inline w-7 h-7 text-Gray-200 animate-spin'
                          }
                          fillColor={'#004D90'}
                        />
                        {showLoadingMsg}
                      </h3>
                    </div>
                  )}
                </div>
              ) : (
                <div className="inner relative w-full">
                  <div className="texts text-center md:text-left">
                    <h3 className="font-bold text-xl 3xl:text-2xl text-Gray-950 leading-snug pb-2">
                      {t('landing.ready-to-join')}
                    </h3>
                    <p className="text-sm 3xl:text-base text-Gray-800">
                      {getJoinPrompt()}
                    </p>
                  </div>
                  <div className="buttons grid gap-3 w-full pt-10">
                    {lockMicrophone && (lockWebcam || !isWebcamAllowed) ? (
                      // Case 1: Both devices are locked, only show the listener button.
                      <button
                        id="listenOnlyJoin"
                        type="button"
                        disabled={isReadyToConn === true}
                        className="w-full h-10 3xl:h-11 cursor-pointer text-sm 3xl:text-base font-semibold bg-Gray-25 hover:bg-Blue hover:text-white border border-Gray-300 rounded-[15px] flex justify-center items-center gap-2 transition-all duration-300 shadow-button-shadow disabled:bg-Gray-200 disabled:border-Gray-300 disabled:text-Gray-400 disabled:cursor-not-allowed"
                        onClick={() => openConn()}
                      >
                        {t('landing.join-as-listener-btn')}
                        <Volume />
                      </button>
                    ) : // Case 2: At least one device is available.
                    selectedAudioDevice !== '' || selectedVideoDevice !== '' ? (
                      // Sub-case 2a: A device has been selected, show the "Join" button.
                      <button
                        type="button"
                        disabled={isReadyToConn === true}
                        className="w-full h-10 3xl:h-11 cursor-pointer text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow disabled:bg-Gray-200 disabled:border-Gray-300 disabled:text-Gray-400 disabled:cursor-not-allowed"
                        onClick={() => openConn()}
                      >
                        {t('join')}
                      </button>
                    ) : (
                      // Sub-case 2b: No device selected yet, show the "Enable..." and "Listener" buttons.
                      <>
                        <button
                          type="button"
                          className="w-full h-10 3xl:h-11 cursor-pointer text-sm 3xl:text-base font-semibold hover:bg-white border rounded-[15px] transition-all duration-300 shadow-button-shadow relative border-[#0088CC] bg-Blue text-white hover:text-Gray-950 disabled:bg-Gray-200 disabled:border-Gray-300 disabled:text-Gray-400 disabled:cursor-not-allowed"
                          disabled={isReadyToConn === true}
                          onClick={getEnableDeviceButton().action}
                        >
                          <span className="relative flex items-center justify-center gap-2">
                            {getEnableDeviceButton().text}
                          </span>
                        </button>
                        <button
                          id="listenOnlyJoin"
                          type="button"
                          disabled={isReadyToConn === true}
                          className="w-full h-10 3xl:h-11 cursor-pointer text-sm 3xl:text-base font-semibold bg-Gray-25 hover:bg-Blue hover:text-white border border-Gray-300 rounded-[15px] flex justify-center items-center gap-2 transition-all duration-300 shadow-button-shadow disabled:bg-Gray-200 disabled:border-Gray-300 disabled:text-Gray-400 disabled:cursor-not-allowed"
                          onClick={() => openConn()}
                        >
                          {t('landing.join-as-listener-btn')}
                          <Volume />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  );
};

export default Landing;
