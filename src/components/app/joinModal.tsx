import React, { useState } from 'react';

import { useAppSelector, useAppDispatch } from '../../store';
import { toggleStartup } from '../../store/slices/sessionSlice';

import { updateRoomAudioVolume } from '../../store/slices/roomSettingsSlice';
import { Microphone } from '../../assets/Icons/Microphone';
import { PlusIcon } from '../../assets/Icons/PlusIcon';
import { BlockedIcon } from '../../assets/Icons/BlockedIcon';
// import { MicrophoneOff } from '../../assets/Icons/MicrophoneOff';
import { ArrowUp } from '../../assets/Icons/ArrowUp';
// import { Camera } from '../../assets/Icons/Camera';
import { CameraOff } from '../../assets/Icons/CameraOff';
import { Volume } from '../../assets/Icons/Volume';
// import MicrophoneModal from '../footer/modals/microphoneModal';
import { Menu, MenuButton, Transition } from '@headlessui/react';
import { CheckMarkIcon } from '../../assets/Icons/CheckMarkIcon';

interface StartupJoinModalProps {
  onCloseModal(): void;
}

const StartupJoinModal = ({ onCloseModal }: StartupJoinModalProps) => {
  const [open, setOpen] = useState<boolean>(true);
  const isStartup = useAppSelector((state) => state.session.isStartup);
  const dispatch = useAppDispatch();

  const onClose = (noAudio = false) => {
    setOpen(false);
    dispatch(toggleStartup(false));
    if (noAudio) {
      dispatch(updateRoomAudioVolume(0));
    }
    onCloseModal();
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
                    <Microphone classes={'h-5 w-auto'} />
                    {/* <MicrophoneOff classes={'h-5 w-auto'} /> */}
                    <span className="add absolute -top-2 -right-2 z-10">
                      <PlusIcon />
                    </span>
                    <span className="blocked absolute -top-2 -right-2 z-10">
                      <BlockedIcon />
                    </span>
                  </div>
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
                              <p className="h-10 w-full flex items-center text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 hover:bg-Gray-50">
                                Default - MacBook Pro Microphone
                                <CheckMarkIcon />
                              </p>
                              <p className="h-10 w-full flex items-center text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 hover:bg-Gray-50">
                                iPhone Microphone
                              </p>
                              <p className="h-10 w-full flex items-center text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 hover:bg-Gray-50">
                                AirPods
                              </p>
                            </div>
                          </Transition>
                        </>
                      )}
                    </Menu>
                  </div>
                </div>
                <div className="cam-wrap relative cursor-pointer shadow-IconBox border border-Gray-300 rounded-2xl h-11 min-w-11 flex items-center justify-center transition-all duration-300 hover:bg-gray-200 text-Gray-950">
                  <div className="w-11 h-11 relative flex items-center justify-center">
                    {/* <Camera classes={'h-5 w-auto'} /> */}
                    <CameraOff classes={'h-5 w-auto'} />
                    <span className="add absolute -top-2 -right-2 z-10">
                      <PlusIcon />
                    </span>
                    <span className="blocked absolute -top-2 -right-2 z-10">
                      <BlockedIcon />
                    </span>
                  </div>
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
                              <p className="h-10 w-full flex items-center text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 hover:bg-Gray-50">
                                Default - MacBook Pro Microphone
                                <CheckMarkIcon />
                              </p>
                              <p className="h-10 w-full flex items-center text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 hover:bg-Gray-50">
                                iPhone Microphone
                              </p>
                              <p className="h-10 w-full flex items-center text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 hover:bg-Gray-50">
                                AirPods
                              </p>
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

export default StartupJoinModal;
