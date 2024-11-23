import React, { useState } from 'react';

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

interface StartupJoinModalProps {
  onCloseModal(): void;
}

const Landing = ({ onCloseModal }: StartupJoinModalProps) => {
  const dispatch = useAppDispatch();
  const isStartup = useAppSelector((state) => state.session.isStartup);

  const [audioDevices, setAudioDevices] = useState<IMediaDevice[]>([]);
  const [videoDevices, setVideoDevices] = useState<IMediaDevice[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');

  const onClose = () => {
    dispatch(toggleStartup(false));

    if (selectedVideoDevice !== '') {
      dispatch(updateSelectedVideoDevice(selectedVideoDevice));
      dispatch(addVideoDevices(videoDevices));
    }
    if (selectedAudioDevice !== '') {
      dispatch(updateSelectedAudioDevice(selectedAudioDevice));
      dispatch(addAudioDevices(audioDevices));
    }

    onCloseModal();
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

  const render = () => {
    return (
      <div
        id="startupJoinModal"
        className={`absolute w-full join-the-audio-popup bg-Gray-100 h-full flex items-center justify-center p-5`}
      >
        <div className="inner m-auto bg-Gray-50 border border-Gray-300 overflow-hidden rounded-2xl w-full max-w-5xl">
          <div className="head bg-white h-[60px] px-5 flex items-center text-Gray-950 text-lg font-medium border-b border-Gray-200">
            Microphone and camera preferences
          </div>
          <div className="wrapper bg-Gray-50 pt-11 pb-14 px-12 flex flex-wrap">
            <div className="left bg-Gray-25 shadow-box1 border border-Gray-200 p-2 w-1/2 rounded-2xl">
              <WebcamPreview selectedVideoDevice={selectedVideoDevice} />
              <div className="micro-cam-wrap flex justify-center py-5 gap-5">
                <MicrophoneIcon
                  audioDevices={audioDevices}
                  enableMediaDevices={enableMediaDevices}
                  disableMic={disableMic}
                  setSelectedAudioDevice={setSelectedAudioDevice}
                  selectedAudioDevice={selectedAudioDevice}
                />
                <WebcamIcon
                  videoDevices={videoDevices}
                  enableMediaDevices={enableMediaDevices}
                  disableWebcam={disableWebcam}
                  setSelectedVideoDevice={setSelectedVideoDevice}
                  selectedVideoDevice={selectedVideoDevice}
                />
              </div>
            </div>
            <div className="right w-1/2 pl-16 py-8">
              <div className="inner h-full relative">
                <div className="texts">
                  <h3 className="font-bold text-2xl text-Gray-950 leading-snug pb-2">
                    Almost there...
                  </h3>
                  <p className="text-base text-Gray-800">
                    Enable your microphone and camera for full participation, or
                    join as a listener.
                  </p>
                </div>
                <div className="buttons grid gap-3 w-full pt-10">
                  {selectedAudioDevice !== '' || selectedVideoDevice !== '' ? (
                    <button
                      type="button"
                      className="w-full h-11 text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-buttonShadow"
                      onClick={() => onClose()}
                    >
                      Join
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="w-full h-11 text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-buttonShadow"
                      onClick={() => enableMediaDevices('both')}
                    >
                      Enable Microphone and Camera
                    </button>
                  )}
                  {selectedAudioDevice === '' && selectedVideoDevice === '' ? (
                    <button
                      type="button"
                      className="w-full h-11 text-base font-semibold bg-Gray-25 hover:bg-Blue hover:text-white border border-Gray-300 rounded-[15px] flex justify-center items-center gap-2 transition-all duration-300 shadow-buttonShadow"
                      onClick={() => onClose()}
                    >
                      Continue as a listener
                      <Volume />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return isStartup ? <>{render()}</> : null;
};

export default Landing;
