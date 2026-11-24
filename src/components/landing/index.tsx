import React, { Dispatch, useCallback, useEffect, useMemo, useState } from 'react';
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
import { Microphone } from '../../assets/Icons/Microphone';
import { CameraOff } from '../../assets/Icons/CameraOff';
import { LoadingIcon } from '../../assets/Icons/Loading';
import { getConfigValue } from '../../helpers/utils';
import { consumeSkipLandingOnce } from './skipLandingOnce';
import { isAIAgentSessionRoom, isAutoPerUserAISessionRoom } from '../../helpers/aiAgentSession';

import MicrophoneIcon from './microphone';
import WebcamIcon from './webcam';
import WebcamPreview from '../footer/modals/webcam/webcamPreview';
import Loading from '../extra-pages/Loading';
import { isHybridMode } from '../../helpers/nativeBridge';
import useLogo from '../../helpers/hooks/useLogo';

interface StartupJoinModalProps {
  setIsAppReady: Dispatch<boolean>;
  roomConnectionStatus: roomConnectionStatus;
}

const Landing = ({ setIsAppReady, roomConnectionStatus }: StartupJoinModalProps) => {
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

  const hybrid = isHybridMode();
  const logo = useLogo();
  // Read once at mount. The recorder/RTMP bot and waiting-room users must always get the landing page;
  // everyone else skips it when disabled, after a room switch, or in AI agent session rooms.
  const [skipLanding] = useState(() => {
    // consumed unconditionally so a stale one-shot flag never leaks
    const skipOnce = consumeSkipLandingOnce();

    const session = store.getState().session;
    if (session.currentUser?.isRecorder) {
      return false;
    }

    const metadata = session.currentRoom.metadata;
    if (
      metadata?.roomFeatures?.waitingRoomFeatures?.isActive ||
      session.currentUser?.metadata?.waitForApproval
    ) {
      return false;
    }

    return (
      getConfigValue<boolean>('disableLandingPage', false, 'DISABLE_LANDING_PAGE') ||
      skipOnce ||
      isAIAgentSessionRoom(metadata) ||
      isAutoPerUserAISessionRoom(metadata)
    );
  });

  const isStartup = useAppSelector((state) => state.session.isStartup);
  const roomMetadata = useAppSelector((state) => state.session.currentRoom.metadata);
  const isAutoPerUserRoom = isAutoPerUserAISessionRoom(roomMetadata);
  const waitForApproval = useAppSelector(
    (state) => state.session.currentUser?.metadata?.waitForApproval,
  );
  const waitingRoomMessage = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.waitingRoomFeatures?.waitingRoomMsg,
  );
  const lockMicrophone = useAppSelector(
    (state) => state.session.currentUser?.metadata?.lockSettings?.lockMicrophone,
  );
  const lockWebcam = useAppSelector(
    (state) => state.session.currentUser?.metadata?.lockSettings?.lockWebcam,
  );
  const selectedResolution = useAppSelector((state) => state.roomSettings.selectedWebcamResolution);

  const {
    audioDevices,
    videoDevices,
    selectedAudioDevice,
    selectedVideoDevice,
    setAudioDevices,
    setVideoDevices,
    setSelectedAudioDevice,
    setSelectedVideoDevice,
    enableMediaDevices,
    disableWebcam,
    disableMic,
  } = useMediaDevices();

  // Mic-only rooms show the picked mic name on the audio-only stage.
  const selectedAudioLabel = useMemo(
    () => audioDevices.find((device) => device.id === selectedAudioDevice)?.label,
    [audioDevices, selectedAudioDevice],
  );

  // A queued AI session starts in the waiting room, so it never flashes the join prompt.
  const autoWaiting = !!waitForApproval && isAutoPerUserRoom;
  const [showLoadingMsg, setShowLoadingMsg] = useState<string | undefined>(() =>
    autoWaiting ? t('landing.waiting-for-approval-title') : undefined,
  );
  const [isReadyToConn, setIsReadyToConn] = useState<boolean | undefined>(() =>
    autoWaiting ? true : undefined,
  );

  useEffect(() => {
    switch (roomConnectionStatus) {
      case 'media-server-conn-established':
        setShowLoadingMsg(t('landing.finalizing-app'));
        break;
      case 'room-ready':
        dispatch(toggleStartup(false));
        setIsAppReady(true);
        setShowLoadingMsg(undefined);
        break;
    }
  }, [roomConnectionStatus, t, dispatch, setIsAppReady]);

  // A skipped landing page connects straight away; waiting-room users are never skipped.
  useEffect(() => {
    if (!skipLanding || isReadyToConn || waitForApproval) {
      return;
    }
    setShowLoadingMsg(t('landing.connecting-media-server'));
    setIsReadyToConn(true);
  }, [t, waitForApproval, isReadyToConn, skipLanding]);

  // A queued AI session enters the waiting room on its own, without a join click.
  useEffect(() => {
    if (autoWaiting) {
      setShowLoadingMsg(t('landing.waiting-for-approval-title'));
      setIsReadyToConn(true);
    } else if (waitForApproval) {
      if (typeof isReadyToConn !== 'undefined') {
        setShowLoadingMsg(t('landing.waiting-for-approval-title'));
      }
    } else if (isReadyToConn) {
      const conn = getNatsConn();
      if (conn) {
        setShowLoadingMsg(t('landing.connecting-media-server'));
        void conn.requestMediaServerData();
      }
    }
  }, [t, waitForApproval, isReadyToConn, autoWaiting]);

  const openConn = useCallback(() => {
    if (!hybrid) {
      if (selectedVideoDevice !== '') {
        dispatch(updateSelectedVideoDevice(selectedVideoDevice));
        dispatch(addVideoDevices(videoDevices));
      }
      if (selectedAudioDevice !== '') {
        dispatch(updateSelectedAudioDevice(selectedAudioDevice));
        dispatch(addAudioDevices(audioDevices));
      }
    }
    setIsReadyToConn(true);
  }, [hybrid, selectedAudioDevice, selectedVideoDevice, dispatch, videoDevices, audioDevices]);

  const getJoinPrompt = useCallback(() => {
    if (hybrid) {
      return t('landing.join-prompt-hybrid');
    }
    if (lockMicrophone && (lockWebcam || !isWebcamAllowed)) {
      return t('landing.join-prompt-both-locked');
    } else if (lockMicrophone) {
      return t('landing.join-prompt-mic-locked');
    } else if (lockWebcam || !isWebcamAllowed) {
      return t('landing.join-prompt-cam-locked');
    }
    return t('landing.join-prompt');
  }, [hybrid, lockMicrophone, lockWebcam, isWebcamAllowed, t]);

  const enableAvailableDevices = useCallback(async () => {
    const availableKinds: ('audio' | 'video')[] = [];
    if (!lockMicrophone) availableKinds.push('audio');
    if (!lockWebcam && isWebcamAllowed) availableKinds.push('video');

    if (availableKinds.length === 2) {
      try {
        await enableMediaDevices('both', { quickEnable: true });
        return;
      } catch {
        // Retry separately so one unavailable or denied device doesn't block the other.
      }
    }

    await Promise.allSettled(
      availableKinds.map((kind) => enableMediaDevices(kind, { quickEnable: true })),
    );
  }, [lockMicrophone, lockWebcam, isWebcamAllowed, enableMediaDevices]);

  const enableDeviceButtonText =
    !lockMicrophone && !lockWebcam && isWebcamAllowed
      ? t('landing.enable-mic-cam-btn')
      : lockMicrophone
        ? t('landing.enable-cam-btn')
        : t('landing.enable-mic-btn');

  // Render the plain loading page from the first paint when skipping, but never hide the waiting-room view.
  if (skipLanding && !waitForApproval) {
    return <Loading text={showLoadingMsg ?? t('landing.connecting-media-server')} />;
  }

  // A queued AI session only needs the waiting message, not the device picker.
  if (isStartup && autoWaiting) {
    return (
      <div
        id="startupJoinModal"
        role="dialog"
        aria-modal="true"
        aria-label={t('landing.waiting-for-approval-title')}
        className="absolute w-full join-the-audio-popup bg-Gray-100 dark:bg-dark-primary min-h-full flex items-center justify-center p-5 scrollBar"
      >
        <div className="m-auto w-full max-w-lg bg-Gray-50 dark:bg-dark-secondary border border-Gray-300 dark:border-Gray-700 rounded-2xl p-6 sm:p-10 text-center">
          <h3 className="font-bold text-lg sm:text-xl 3xl:text-2xl text-Gray-950 dark:text-white leading-snug pb-2 flex items-center justify-center gap-2">
            <LoadingIcon
              className={'inline h-5 w-5 text-Gray-200 animate-spin'}
              fillColor={'#004D90'}
            />
            {t('landing.waiting-for-approval-title')}
          </h3>
          <p className="text-sm 3xl:text-base text-Gray-800 dark:text-white/90">
            {waitingRoomMessage || t('ai-agent.notifications.waiting-for-session-slot')}
          </p>
        </div>
      </div>
    );
  }

  return (
    isStartup && (
      <div
        id="startupJoinModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="startup-modal-title"
        className={`absolute w-full join-the-audio-popup bg-Gray-100 dark:bg-dark-primary min-h-full flex items-center justify-center p-5 scrollBar`}
      >
        <div className="inner m-auto bg-Gray-50 dark:bg-dark-primary border border-Gray-300 dark:border-Gray-700 overflow-hidden rounded-2xl w-full max-w-4xl 3xl:max-w-5xl">
          <div
            id="startup-modal-title"
            className="head bg-white dark:bg-dark-secondary  h-[50px] 3xl:h-[60px] px-3 sm:px-5 flex justify-center sm:justify-start text-center sm:text-start items-center text-Gray-950 dark:text-white text-sm sm:text-base 3xl:text-lg font-medium border-b border-Gray-200 dark:border-Gray-700"
          >
            {t('landing.modal-title')}
          </div>
          <div className="wrapper bg-Gray-50 dark:bg-dark-secondary  pt-4 sm:pt-8 3xl:pt-11 pb-4 sm:pb-10 3xl:pb-14 px-4 sm:px-8 3xl:px-12 flex flex-wrap">
            <div className="left relative z-20 bg-Gray-25 dark:bg-Gray-800 shadow-box1 border border-Gray-200 dark:border-Gray-700 p-2 w-full md:w-1/2 rounded-2xl mb-5 sm:mb-0">
              {!isWebcamAllowed && !hybrid ? (
                // Mic-only room: keep the same stage height as the webcam view so
                // both columns stay balanced, and surface the mic status here.
                <div className="camera rounded-lg overflow-hidden w-full h-56 sm:h-72 3xl:h-80 bg-Gray-50 dark:bg-dark-secondary flex flex-col items-center justify-center gap-3 px-5 text-center">
                  <img src={logo} alt="logo" className="max-w-[45%] max-h-[28%] object-contain" />
                  <div className="flex max-w-full items-center gap-2 rounded-full border border-Gray-200 dark:border-Gray-700 bg-white dark:bg-dark-secondary2 px-3 py-1.5 shadow-sm">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${lockMicrophone ? 'bg-Red-50 text-Red-600' : 'bg-Blue2-50 text-Blue2-600 dark:text-white'}`}
                    >
                      {lockMicrophone ? (
                        <MicrophoneOff classes="h-4 w-4" />
                      ) : (
                        <Microphone classes="h-4 w-auto" />
                      )}
                    </span>
                    <span className="truncate text-xs font-semibold text-Gray-800 dark:text-white">
                      {lockMicrophone
                        ? t('landing.audio-only-mic-locked')
                        : selectedAudioLabel || t('landing.audio-only-no-mic')}
                    </span>
                  </div>
                  <p className="max-w-[20rem] text-xs leading-relaxed text-Gray-600 dark:text-white/70">
                    {lockMicrophone
                      ? t('landing.audio-only-mic-locked-prompt')
                      : t('landing.audio-only-prompt')}
                  </p>
                </div>
              ) : (
                <div
                  className={`camera rounded-lg overflow-hidden w-full h-56 sm:h-72 3xl:h-80 ${hybrid ? 'bg-transparent' : 'bg-Gray-950'}`}
                >
                  {hybrid ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <img
                        src={logo}
                        alt="logo"
                        className="max-w-[60%] max-h-[60%] object-contain"
                      />
                    </div>
                  ) : (
                    selectedVideoDevice !== '' && (
                      <WebcamPreview
                        deviceId={selectedVideoDevice}
                        resolution={selectedResolution}
                      />
                    )
                  )}
                </div>
              )}
              <div className="micro-cam-wrap flex justify-center py-5 gap-5 empty:hidden">
                {!hybrid && (
                  <>
                    {lockMicrophone ? (
                      <div className="microphone-wrap relative cursor-not-allowed shadow-IconBox border border-Red-200 rounded-2xl h-11 w-11 flex items-center justify-center transition-all duration-300 text-Gray-950">
                        <MicrophoneOff classes="h-6 w-6 text-red-200" />
                        <i className="pnm-lock absolute -top-1 -end-1 z-10 text-red-500"></i>
                      </div>
                    ) : (
                      <MicrophoneIcon
                        audioDevices={audioDevices}
                        disableMic={disableMic}
                        setAudioDevices={setAudioDevices}
                        setSelectedAudioDevice={setSelectedAudioDevice}
                        selectedAudioDevice={selectedAudioDevice}
                      />
                    )}
                    {isWebcamAllowed &&
                      (lockWebcam ? (
                        <div className="cam-wrap relative cursor-not-allowed shadow-IconBox border border-Red-200 rounded-2xl h-11 w-11 flex items-center justify-center transition-all duration-300 text-Gray-950">
                          <CameraOff classes="h-6 w-6 text-red-200" />
                          <i className="pnm-lock absolute -top-1 -end-1 z-10 text-red-500" />
                        </div>
                      ) : (
                        <WebcamIcon
                          videoDevices={videoDevices}
                          setVideoDevices={setVideoDevices}
                          disableWebcam={disableWebcam}
                          setSelectedVideoDevice={setSelectedVideoDevice}
                          selectedVideoDevice={selectedVideoDevice}
                        />
                      ))}
                  </>
                )}
              </div>
            </div>
            <div className="right w-full md:w-1/2 md:ps-8 3xl:ps-16 sm:py-8 flex items-center">
              {showLoadingMsg ? (
                <div className="inner waiting-room-contents relative md:-mt-10 w-full">
                  {waitForApproval ? (
                    <div className="texts text-center md:text-start">
                      <h3 className="font-bold text-lg md:text-xl 3xl:text-2xl text-Gray-950 dark:text-white leading-snug pb-2 flex items-center justify-center md:justify-start gap-2">
                        <LoadingIcon
                          className={'inline h-5 w-5 text-Gray-200 animate-spin'}
                          fillColor={'#004D90'}
                        />
                        {t('landing.waiting-for-approval-title')}
                      </h3>
                      <p className="text-sm 3xl:text-base text-Gray-800 dark:text-white/90 md:ps-7">
                        {waitingRoomMessage ||
                          t(
                            isAutoPerUserRoom
                              ? 'ai-agent.notifications.waiting-for-session-slot'
                              : 'notifications.waiting-for-approval',
                          )}
                      </p>
                    </div>
                  ) : (
                    <div className="texts text-center md:text-start">
                      <h3 className="font-bold text-lg md:text-xl 3xl:text-2xl text-Gray-950 dark:text-white leading-snug pb-2 flex items-center justify-center md:justify-start gap-2">
                        <LoadingIcon
                          className={'inline w-7 h-7 text-Gray-200 animate-spin'}
                          fillColor={'#004D90'}
                        />
                        {showLoadingMsg}
                      </h3>
                    </div>
                  )}
                </div>
              ) : (
                <div className="inner relative w-full">
                  <div className="texts text-center md:text-start">
                    <h3 className="font-bold text-xl 3xl:text-2xl text-Gray-950 dark:text-white leading-snug pb-2">
                      {t('landing.ready-to-join')}
                    </h3>
                    <p className="text-sm 3xl:text-base text-Gray-800 dark:text-white/90">
                      {getJoinPrompt()}
                    </p>
                  </div>
                  <div className="buttons grid gap-3 w-full pt-10">
                    {hybrid ? (
                      // Hybrid mode: just show Join button (no device selection needed)
                      <button
                        type="button"
                        disabled={isReadyToConn === true}
                        className="primary-button w-full h-10 3xl:h-11 cursor-pointer text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-Blue2-600 rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow disabled:bg-Gray-200 disabled:border-Gray-300 disabled:text-Gray-400 disabled:cursor-not-allowed dark:disabled:bg-dark-secondary dark:disabled:text-Gray-600"
                        onClick={() => openConn()}
                      >
                        {t('join')}
                      </button>
                    ) : lockMicrophone && (lockWebcam || !isWebcamAllowed) ? (
                      // Case 1: Both devices are locked, only show the listener button.
                      <button
                        id="listenOnlyJoin"
                        type="button"
                        disabled={isReadyToConn === true}
                        className="secondary-button w-full h-10 3xl:h-11 cursor-pointer text-sm 3xl:text-base font-semibold bg-Gray-25 hover:bg-Blue dark:hover:bg-Blue hover:text-white border border-Gray-300 rounded-[15px] flex justify-center items-center gap-2 transition-all duration-300 shadow-button-shadow dark:bg-dark-secondary dark:text-white dark:shadow-none dark:border-Gray-800 disabled:bg-Gray-200 disabled:border-Gray-300 disabled:text-Gray-400 disabled:cursor-not-allowed dark:disabled:bg-dark-secondary dark:disabled:text-Gray-600"
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
                        className="primary-button w-full h-10 3xl:h-11 cursor-pointer text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-Blue2-600 rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow disabled:bg-Gray-200 disabled:border-Gray-300 disabled:text-Gray-400 disabled:cursor-not-allowed dark:disabled:bg-dark-secondary dark:disabled:text-Gray-600"
                        onClick={() => openConn()}
                      >
                        {t('join')}
                      </button>
                    ) : (
                      // Keep the permission request available until media is selected or the user joins as a listener.
                      <>
                        <button
                          type="button"
                          disabled={isReadyToConn === true}
                          className="primary-button w-full h-10 3xl:h-11 cursor-pointer text-sm 3xl:text-base font-semibold hover:bg-white border rounded-[15px] transition-all duration-300 shadow-button-shadow relative border-Blue2-600 bg-Blue text-white hover:text-Gray-950 disabled:bg-Gray-200 disabled:border-Gray-300 disabled:text-Gray-400 disabled:cursor-not-allowed dark:disabled:bg-dark-secondary dark:disabled:text-Gray-600"
                          onClick={() => void enableAvailableDevices()}
                        >
                          {enableDeviceButtonText}
                        </button>
                        <button
                          id="listenOnlyJoin"
                          type="button"
                          disabled={isReadyToConn === true}
                          className="secondary-button w-full h-10 3xl:h-11 cursor-pointer text-sm 3xl:text-base font-semibold bg-Gray-25 hover:bg-Blue dark:hover:bg-Blue hover:text-white border border-Gray-300 rounded-[15px] flex justify-center items-center gap-2 transition-all duration-300 shadow-button-shadow dark:bg-dark-secondary dark:text-white dark:shadow-none dark:border-Gray-800 disabled:bg-Gray-200 disabled:border-Gray-300 disabled:text-Gray-400 disabled:cursor-not-allowed dark:disabled:bg-dark-secondary dark:disabled:text-Gray-600"
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
