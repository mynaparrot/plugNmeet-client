import React, { useEffect, useRef, useState } from 'react';
import { Menu, MenuButton, MenuItem, Transition } from '@headlessui/react';

import { useAppDispatch, useAppSelector } from '../../store';
import { toggleStartup } from '../../store/slices/sessionSlice';
import {
  addAudioDevices,
  addVideoDevices,
  updateSelectedAudioDevice,
  updateSelectedVideoDevice,
} from '../../store/slices/roomSettingsSlice';
import { Microphone } from '../../assets/Icons/Microphone';
import { PlusIcon } from '../../assets/Icons/PlusIcon';
import { ArrowUp } from '../../assets/Icons/ArrowUp';
import { CheckMarkIcon } from '../../assets/Icons/CheckMarkIcon';
import { Camera } from '../../assets/Icons/Camera';
import { Volume } from '../../assets/Icons/Volume';
import { IMediaDevice } from '../../store/slices/interfaces/roomSettings';
import ShareWebcamModal from '../footer/modals/webcam';
import { updateShowVideoShareModal } from '../../store/slices/bottomIconsActivitySlice';
import VirtualBackground from '../virtual-background/virtualBackground';
import { SourcePlayback } from '../virtual-background/helpers/sourceHelper';

interface StartupJoinModalProps {
  onCloseModal(): void;
}

const Landing = ({ onCloseModal }: StartupJoinModalProps) => {
  const ref = useRef<HTMLVideoElement>(null);
  const dispatch = useAppDispatch();

  const isStartup = useAppSelector((state) => state.session.isStartup);
  const showVideoShareModal = useAppSelector(
    (state) => state.bottomIconsActivity.showVideoShareModal,
  );
  const virtualBackground = useAppSelector(
    (state) => state.bottomIconsActivity.virtualBackground,
  );

  // const [open, setOpen] = useState<boolean>(true);
  const [audioDevices, setAudioDevices] = useState<IMediaDevice[]>([]);
  const [videoDevices, setVideoDevices] = useState<IMediaDevice[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [sourcePlayback, setSourcePlayback] = useState<SourcePlayback>();

  useEffect(() => {
    const el = ref.current;
    if (selectedVideoDevice !== '') {
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: selectedVideoDevice,
        },
      };
      navigator.mediaDevices.getUserMedia(constraints).then((mediaStream) => {
        if (el) {
          el.srcObject = mediaStream;
          setSourcePlayback({
            htmlElement: el,
            width: 640,
            height: 480,
          });
        }
      });
    }
    return () => {
      if (el) {
        el.srcObject = null;
      }
    };
  }, [selectedVideoDevice]);

  const onClose = () => {
    // setOpen(false);
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

  const enableMediaDevices = async (type: string = 'both') => {
    const constraints: MediaStreamConstraints = {
      audio: false,
      video: false,
    };
    if (type === 'audio') {
      constraints.audio = true;
    } else if (type === 'video') {
      constraints.video = true;
    } else {
      constraints.audio = true;
      constraints.video = true;
    }

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const devices = await navigator.mediaDevices.enumerateDevices();

    const audio: IMediaDevice[] = [];
    const video: IMediaDevice[] = [];

    for (let i = 0; i < devices.length; i++) {
      const device = devices[i];
      if (device.deviceId !== '') {
        if (device.kind === 'audioinput') {
          audio.push({
            id: device.deviceId,
            label: device.label,
          });
        } else if (device.kind === 'videoinput') {
          video.push({
            id: device.deviceId,
            label: device.label,
          });
        }
      }
    }

    if (audio.length > 0 && (type === 'both' || type === 'audio')) {
      setAudioDevices(audio);
      setSelectedAudioDevice(audio[0].id);
    }
    if (video.length > 0 && (type === 'both' || type === 'video')) {
      setVideoDevices(video);
      setSelectedVideoDevice(video[0].id);
    }

    stream.getTracks().forEach(function (track) {
      track.stop();
    });
  };

  const disableWebcam = () => {
    setVideoDevices([]);
    setSelectedVideoDevice('');
  };

  const disableMic = () => {
    setAudioDevices([]);
    setSelectedAudioDevice('');
  };

  const onSelectedDevice = async (deviceId: string) => {
    setSelectedVideoDevice(deviceId);
  };

  const render = () => {
    return (
      <div
        id="startupJoinModal"
        className={`absolute w-full join-the-audio-popup bg-Gray-100 h-full flex items-center justify-center p-5`}
      >
        {showVideoShareModal ? (
          <ShareWebcamModal onSelectedDevice={onSelectedDevice} />
        ) : null}

        <div className="inner m-auto bg-Gray-50 border border-Gray-300 overflow-hidden rounded-2xl w-full max-w-5xl">
          <div className="head bg-white h-[60px] px-5 flex items-center text-Gray-950 text-lg font-medium border-b border-Gray-200">
            Microphone and camera preferences
          </div>
          <div className="wrapper bg-Gray-50 pt-11 pb-14 px-12 flex flex-wrap">
            <div className="left bg-Gray-25 shadow-box1 border border-Gray-200 p-2 w-1/2 rounded-2xl">
              <div className="camera bg-Gray-950 rounded-lg overflow-hidden w-full min-h-[284px]">
                <div
                  className={`${virtualBackground.type !== 'none' ? 'w-0 h-0' : 'w-full h-full flex'}`}
                >
                  <video className="w-full h-full" ref={ref} autoPlay />
                </div>
                {virtualBackground.type !== 'none' && sourcePlayback ? (
                  <VirtualBackground
                    sourcePlayback={sourcePlayback}
                    backgroundConfig={virtualBackground}
                    id="preview"
                  />
                ) : null}
              </div>
              <div className="micro-cam-wrap flex justify-center py-5 gap-5">
                <div className="microphone-wrap relative cursor-pointer shadow-IconBox border border-Gray-300 rounded-2xl h-11 min-w-11 flex items-center justify-center transition-all duration-300 hover:bg-gray-200 text-Gray-950">
                  <div className="w-11 h-11 relative flex items-center justify-center">
                    {audioDevices.length === 0 ? (
                      <div onClick={() => enableMediaDevices('audio')}>
                        <Microphone classes={'h-5 w-auto'} />
                        <span className="add absolute -top-2 -right-2 z-10">
                          <PlusIcon />
                        </span>
                      </div>
                    ) : (
                      <div onClick={disableMic}>
                        <Microphone classes={'h-5 w-auto'} />
                      </div>
                    )}
                  </div>
                  {audioDevices.length > 0 ? (
                    <div className="menu relative">
                      <Menu>
                        {({ open }) => (
                          <>
                            <MenuButton
                              className={`w-[30px] h-11 flex items-center justify-center border border-Gray-300  rounded-r-2xl ${open ? 'bg-Gray-100' : 'bg-Gray-50'}`}
                            >
                              <ArrowUp />
                            </MenuButton>
                            <Transition
                              as={'div'}
                              show={open}
                              enter="transition duration-100 ease-out"
                              enterFrom="transform scale-95 opacity-0"
                              enterTo="transform scale-100 opacity-100"
                              leave="transition duration-75 ease-out"
                              leaveFrom="transform scale-100 opacity-100"
                              leaveTo="transform scale-95 opacity-0"
                            >
                              <div className="menu origin-top-right z-10 absolute ltr:left-0 rtl:right-0 bottom-12 border border-Gray-100 bg-white shadow-lg rounded-2xl overflow-hidden p-2 w-max">
                                <div className="title h-10 w-full flex items-center text-sm leading-none text-Gray-700 px-3 uppercase">
                                  Select Microphone
                                </div>
                                {audioDevices.map((device, i) => (
                                  <div
                                    className=""
                                    role="none"
                                    key={`${device.id}-${i}`}
                                    onClick={() =>
                                      setSelectedAudioDevice(device.id)
                                    }
                                  >
                                    <MenuItem>
                                      {() => (
                                        <p className="h-10 w-full flex items-center text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 hover:bg-Gray-50">
                                          {device.label}
                                          {selectedAudioDevice === device.id ? (
                                            <CheckMarkIcon />
                                          ) : (
                                            ''
                                          )}
                                        </p>
                                      )}
                                    </MenuItem>
                                  </div>
                                ))}
                              </div>
                            </Transition>
                          </>
                        )}
                      </Menu>
                    </div>
                  ) : null}
                </div>
                <div className="cam-wrap relative cursor-pointer shadow-IconBox border border-Gray-300 rounded-2xl h-11 min-w-11 flex items-center justify-center transition-all duration-300 hover:bg-gray-200 text-Gray-950">
                  <div className="w-11 h-11 relative flex items-center justify-center">
                    {videoDevices.length === 0 ? (
                      <div onClick={() => enableMediaDevices('video')}>
                        <Camera classes={'h-5 w-auto'} />
                        <span className="add absolute -top-2 -right-2 z-10">
                          <PlusIcon />
                        </span>
                      </div>
                    ) : (
                      <div onClick={() => disableWebcam()}>
                        <Camera classes={'h-5 w-auto'} />
                      </div>
                    )}
                  </div>
                  {videoDevices.length > 0 ? (
                    <div className="menu relative">
                      <Menu>
                        {({ open }) => (
                          <>
                            <MenuButton
                              className={`w-[30px] h-11 flex items-center justify-center border border-Gray-300  rounded-r-2xl ${open ? 'bg-Gray-100' : 'bg-Gray-50'}`}
                            >
                              <ArrowUp />
                            </MenuButton>
                            <Transition
                              as={'div'}
                              show={open}
                              enter="transition duration-100 ease-out"
                              enterFrom="transform scale-95 opacity-0"
                              enterTo="transform scale-100 opacity-100"
                              leave="transition duration-75 ease-out"
                              leaveFrom="transform scale-100 opacity-100"
                              leaveTo="transform scale-95 opacity-0"
                            >
                              <div className="menu origin-top-right z-10 absolute ltr:left-0 rtl:right-0 bottom-12 border border-Gray-100 bg-white shadow-lg rounded-2xl overflow-hidden p-2 w-max">
                                <div className="title h-10 w-full flex items-center text-sm leading-none text-Gray-700 px-3 uppercase">
                                  Select Microphone
                                </div>
                                {videoDevices.map((device, i) => (
                                  <div
                                    className=""
                                    role="none"
                                    key={`${device.id}-${i}`}
                                  >
                                    <MenuItem>
                                      {() => (
                                        <p
                                          className={`${
                                            selectedAudioDevice === device.id
                                              ? 'bg-Gray-50'
                                              : ''
                                          } h-10 w-full flex items-center text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 hover:bg-Gray-50`}
                                          onClick={() =>
                                            setSelectedVideoDevice(device.id)
                                          }
                                        >
                                          {device.label}
                                          {selectedVideoDevice === device.id ? (
                                            <CheckMarkIcon />
                                          ) : (
                                            ''
                                          )}
                                        </p>
                                      )}
                                    </MenuItem>
                                  </div>
                                ))}
                                <div className="divider w-[calc(100%+16px)] relative -left-2 h-1 bg-Gray-50 mt-2"></div>
                                <div className="title h-10 w-full flex items-center text-sm leading-none text-Gray-700 px-3 uppercase">
                                  Background & Filters
                                </div>
                                <p
                                  className="h-10 w-full flex items-center text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 hover:bg-Gray-50"
                                  onClick={() =>
                                    dispatch(
                                      updateShowVideoShareModal(
                                        !showVideoShareModal,
                                      ),
                                    )
                                  }
                                >
                                  Config Camera Background
                                </p>
                              </div>
                            </Transition>
                          </>
                        )}
                      </Menu>
                    </div>
                  ) : null}
                </div>
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
                  <button
                    type="button"
                    className="w-full h-11 text-base font-semibold bg-Gray-25 hover:bg-Blue hover:text-white border border-Gray-300 rounded-[15px] flex justify-center items-center gap-2 transition-all duration-300 shadow-buttonShadow"
                    onClick={() => onClose()}
                  >
                    Continue as a listener
                    <Volume />
                  </button>
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
