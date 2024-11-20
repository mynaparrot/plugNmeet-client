import React, { useEffect, useState } from 'react';

import { useAppDispatch, useAppSelector } from '../../store';
import { toggleStartup } from '../../store/slices/sessionSlice';
import { updateRoomAudioVolume } from '../../store/slices/roomSettingsSlice';
import { Microphone } from '../../assets/Icons/Microphone';
import { PlusIcon } from '../../assets/Icons/PlusIcon';
import { Menu, MenuButton, MenuItem, Transition } from '@headlessui/react';
import { ArrowUp } from '../../assets/Icons/ArrowUp';
import { CheckMarkIcon } from '../../assets/Icons/CheckMarkIcon';
import { Camera } from '../../assets/Icons/Camera';
import { Volume } from '../../assets/Icons/Volume';

interface StartupJoinModalProps {
  onCloseModal(): void;
}

const Landing = ({ onCloseModal }: StartupJoinModalProps) => {
  const [open, setOpen] = useState<boolean>(true);
  const isStartup = useAppSelector((state) => state.session.isStartup);
  const dispatch = useAppDispatch();
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');

  useEffect(() => {
    console.log(selectedAudioDevice);
  }, [selectedAudioDevice]);

  const onClose = (noAudio = false) => {
    setOpen(false);
    dispatch(toggleStartup(false));
    if (noAudio) {
      dispatch(updateRoomAudioVolume(0));
    }
    onCloseModal();
  };

  const enableMediaDevices = async (type: string = 'both') => {
    const constraints: MediaStreamConstraints = {};
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

    const audio: MediaDeviceInfo[] = [];
    const video: MediaDeviceInfo[] = [];

    for (let i = 0; i < devices.length; i++) {
      const device = devices[i];
      if (device.deviceId !== '') {
        if (device.kind === 'audioinput') {
          audio.push(device);
        } else if (device.kind === 'videoinput') {
          video.push(device);
        }
      }
    }

    if (audio.length > 0) {
      setAudioDevices(audio);
      setSelectedAudioDevice(audio[0].deviceId);
    }
    if (video.length > 0) {
      setVideoDevices(video);
      setSelectedVideoDevice(video[0].deviceId);
    }

    stream.getTracks().forEach(function (track) {
      track.stop();
    });
  };

  const disableWebcam = () => {
    setVideoDevices([]);
    setSelectedVideoDevice('');
  };

  const render = () => {
    return (
      <div
        id="startupJoinModal"
        className={`${
          open ? '' : ''
        } join-the-audio-popup bg-Gray-100 h-full flex items-center justify-center p-5`}
      >
        <div className="inner m-auto bg-Gray-50 border border-Gray-300 overflow-hidden rounded-2xl w-full max-w-5xl">
          <div className="head bg-white h-[60px] px-5 flex items-center text-Gray-950 text-lg font-medium border-b border-Gray-200">
            Microphone and camera preferences
          </div>
          <div className="wrapper bg-Gray-50 pt-11 pb-14 px-12 flex flex-wrap">
            <div className="left bg-Gray-25 shadow-box1 border border-Gray-200 p-2 w-1/2 rounded-2xl">
              <div className="camera bg-Gray-950 rounded-lg overflow-hidden h-[284px] w-full mt-4"></div>
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
                      <Microphone classes={'h-5 w-auto'} />
                    )}
                  </div>
                  {audioDevices.length > 0 ? (
                    <div className="menu relative">
                      <Menu>
                        {({ open }) => (
                          <>
                            <MenuButton className="w-[30px] h-11 flex items-center justify-center border-l border-Gray-300">
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
                                    key={`${device.deviceId}-${i}`}
                                    onClick={() =>
                                      setSelectedAudioDevice(device.deviceId)
                                    }
                                  >
                                    <MenuItem>
                                      {() => (
                                        <p className="h-10 w-full flex items-center text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 hover:bg-Gray-50">
                                          {device.label}
                                          {selectedAudioDevice ===
                                          device.deviceId ? (
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
                                <MenuItem>
                                  <p className="h-10 w-full flex items-center text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 hover:bg-Gray-50">
                                    Close microphone
                                  </p>
                                </MenuItem>
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
                            <MenuButton className="w-[30px] h-11 flex items-center justify-center border-l border-Gray-300">
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
                                    key={`${device.deviceId}-${i}`}
                                  >
                                    <MenuItem>
                                      {() => (
                                        <p
                                          className={`${
                                            selectedAudioDevice ===
                                            device.deviceId
                                              ? 'bg-Gray-50'
                                              : ''
                                          } h-10 w-full flex items-center text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 hover:bg-Gray-50`}
                                          onClick={() =>
                                            setSelectedVideoDevice(
                                              device.deviceId,
                                            )
                                          }
                                        >
                                          {device.label}
                                          {selectedVideoDevice ===
                                          device.deviceId ? (
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
                                <p className="h-10 w-full flex items-center text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 hover:bg-Gray-50">
                                  Add Camera Background
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
                  <button
                    type="button"
                    className="w-full h-11 text-base font-semibold bg-Blue hover:bg-white border border-Gray-300 rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-box1"
                    onClick={() => enableMediaDevices('both')}
                  >
                    Enable Microphone and Camera
                  </button>
                  <button
                    type="button"
                    className="w-full h-11 text-base font-semibold bg-Gray-25 hover:bg-Blue hover:text-white border border-Gray-300 rounded-[15px] flex justify-center items-center gap-2 transition-all duration-300 shadow-box1"
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
