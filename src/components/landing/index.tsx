import React, { Dispatch, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../store';
import { toggleStartup } from '../../store/slices/sessionSlice';
import {
  addAudioDevices,
  addVideoDevices,
  updateSelectedAudioDevice,
  updateSelectedVideoDevice,
} from '../../store/slices/roomSettingsSlice';
import { Volume } from '../../assets/Icons/Volume';
import { IMediaDevice } from '../../store/slices/interfaces/roomSettings';
import MicrophoneIcon from './microphone';
import WebcamIcon from './webcam';
import WebcamPreview from './webcamPreview';
import {
  getInputMediaDevices,
  inputMediaDeviceKind,
} from '../../helpers/utils';
import { roomConnectionStatus } from '../app/helper';
import { getNatsConn } from '../../helpers/nats';
import { LoadingIcon } from '../../assets/Icons/Loading';

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

  const [audioDevices, setAudioDevices] = useState<IMediaDevice[]>([]);
  const [videoDevices, setVideoDevices] = useState<IMediaDevice[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [showLoadingMsg, setShowLoadingMsg] = useState<string | undefined>(
    undefined,
  );
  const [isMediaServerConnected, setIsMediaServerConnected] =
    useState<boolean>(false);

  useEffect(() => {
    switch (roomConnectionStatus) {
      case 'media-server-conn-start':
        setShowLoadingMsg('Connecting with media server');
        break;
      case 'media-server-conn-established':
        setIsMediaServerConnected(true);
        break;
    }
  }, [roomConnectionStatus]);

  useEffect(() => {
    if (isMediaServerConnected) {
      if (waitForApproval) {
        setShowLoadingMsg('Waiting for approval...');
      } else {
        dispatch(toggleStartup(false));
        setIsAppReady(true);
        setShowLoadingMsg(undefined);
      }
    }
    //eslint-disable-next-line
  }, [isMediaServerConnected, waitForApproval]);

  const onClose = () => {
    if (selectedVideoDevice !== '') {
      dispatch(updateSelectedVideoDevice(selectedVideoDevice));
      dispatch(addVideoDevices(videoDevices));
    }
    if (selectedAudioDevice !== '') {
      dispatch(updateSelectedAudioDevice(selectedAudioDevice));
      dispatch(addAudioDevices(audioDevices));
    }

    const conn = getNatsConn();
    if (conn && conn.mediaServerConn) {
      conn.mediaServerConn.connect().then();
    }
  };

  const enableMediaDevices = async (kind: inputMediaDeviceKind = 'both') => {
    const inputDevices = await getInputMediaDevices(kind);

    if (
      inputDevices.audio.length > 0 &&
      (kind === 'both' || kind === 'audio')
    ) {
      setAudioDevices(inputDevices.audio);
      setSelectedAudioDevice(inputDevices.audio[0].id);
    }
    if (
      inputDevices.video.length > 0 &&
      (kind === 'both' || kind === 'video')
    ) {
      setVideoDevices(inputDevices.video);
      setSelectedVideoDevice(inputDevices.video[0].id);
    }
  };

  const disableWebcam = () => {
    setVideoDevices([]);
    setSelectedVideoDevice('');
  };

  const disableMic = () => {
    setAudioDevices([]);
    setSelectedAudioDevice('');
  };

  return !isStartup ? null : (
    <div
      id="startupJoinModal"
      className={`absolute w-full join-the-audio-popup bg-Gray-100 h-full flex items-center justify-center p-5`}
    >
      <div className="inner m-auto bg-Gray-50 border border-Gray-300 overflow-hidden rounded-2xl w-full max-w-4xl 3xl:max-w-5xl">
        <div className="head bg-white h-[50px] 3xl:h-[60px] px-3 sm:px-5 flex justify-center sm:justify-start text-center sm:text-left items-center text-Gray-950 text-sm sm:text-base 3xl:text-lg font-medium border-b border-Gray-200">
          Microphone and camera preferences
        </div>
        <div className="wrapper bg-Gray-50 pt-4 sm:pt-8 3xl:pt-11 pb-4 sm:pb-10 3xl:pb-14 px-4 sm:px-8 3xl:px-12 flex flex-wrap">
          <div className="left bg-Gray-25 shadow-box1 border border-Gray-200 p-2 w-full md:w-1/2 rounded-2xl mb-5 sm:mb-0">
            <WebcamPreview selectedVideoDevice={selectedVideoDevice} />
            <div className="micro-cam-wrap flex justify-center py-5 gap-5 empty:hidden">
              {!lockMicrophone && (
                <MicrophoneIcon
                  audioDevices={audioDevices}
                  enableMediaDevices={enableMediaDevices}
                  disableMic={disableMic}
                  setSelectedAudioDevice={setSelectedAudioDevice}
                  selectedAudioDevice={selectedAudioDevice}
                />
              )}
              {!lockWebcam && (
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
              <div className="inner waiting-room-contents relative -mt-10">
                <div className="texts text-center md:text-left">
                  <h3 className="font-bold text-xl 3xl:text-2xl text-Gray-950 leading-snug pb-2 flex items-center gap-2">
                    <LoadingIcon
                      className={'inline w-7 h-7 text-Gray-200 animate-spin'}
                      fillColor={'#004D90'}
                    />
                    {showLoadingMsg}
                  </h3>
                  {roomConnectionStatus === 'media-server-conn-established' &&
                  waitForApproval ? (
                    <p className="text-sm 3xl:text-base text-Gray-800">
                      {waitingRoomMessage === ''
                        ? t('notifications.waiting-for-approval')
                        : waitingRoomMessage}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="inner relative w-full">
                <div className="texts text-center md:text-left">
                  <h3 className="font-bold text-xl 3xl:text-2xl text-Gray-950 leading-snug pb-2">
                    Almost there...
                  </h3>
                  <p className="text-sm 3xl:text-base text-Gray-800">
                    Enable your microphone and camera for full participation, or
                    join as a listener.
                  </p>
                </div>
                <div className="buttons grid gap-3 w-full pt-10">
                  {selectedAudioDevice !== '' || selectedVideoDevice !== '' ? (
                    <button
                      type="button"
                      className="w-full h-10 3xl:h-11 cursor-pointer text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
                      onClick={() => onClose()}
                    >
                      Join
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`w-full h-10 3xl:h-11 cursor-pointer text-sm 3xl:text-base font-semibold  hover:bg-white border  rounded-[15px] transition-all duration-300 shadow-button-shadow relative ${lockMicrophone ? 'border-Red-600 bg-transparent pointer-events-none text-Red-600' : 'border-[#0088CC] bg-Blue text-white hover:text-Gray-950'}`}
                      disabled={lockMicrophone}
                      onClick={() => enableMediaDevices('both')}
                    >
                      <span className="relative">
                        Enable Microphone and Camera
                        {lockMicrophone ? (
                          <i className="pnm-lock absolute -top-2 -right-2 z-10"></i>
                        ) : (
                          ''
                        )}
                      </span>
                    </button>
                  )}
                  {selectedAudioDevice === '' && selectedVideoDevice === '' ? (
                    <button
                      id="listenOnlyJoin"
                      type="button"
                      className="w-full h-10 3xl:h-11 cursor-pointer text-sm 3xl:text-base font-semibold bg-Gray-25 hover:bg-Blue hover:text-white border border-Gray-300 rounded-[15px] flex justify-center items-center gap-2 transition-all duration-300 shadow-button-shadow"
                      onClick={() => onClose()}
                    >
                      Continue as a listener
                      <Volume />
                    </button>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
