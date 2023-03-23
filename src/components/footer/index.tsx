import React, { useMemo } from 'react';
import { Room } from 'livekit-client';
import { createSelector } from '@reduxjs/toolkit';
import { Transition } from '@headlessui/react';

import { RootState, store, useAppDispatch, useAppSelector } from '../../store';

import WebcamIcon from './icons/webcam';
import MicrophoneIcon from './icons/microphone';
import ChatIcon from './icons/chat';
import ParticipantIcon from './icons/participant';
import RaiseHandIcon from './icons/raisehand';
import ScreenshareIcon from './icons/screenshare';
import RecordingIcon from './icons/recording';
import MenusIcon from './icons/menus';
import SharedNotePadIcon from './icons/sharedNotePad';
import WhiteboardIcon from './icons/whiteboard';
import BreakoutRoomInvitation from '../breakout-room/breakoutRoomInvitation';
import { toggleFooterVisibility } from '../../store/slices/roomSettingsSlice';

interface IFooterProps {
  currentRoom: Room;
  isRecorder: boolean;
}

const footerVisibilitySelector = createSelector(
  (state: RootState) => state.roomSettings.visibleFooter,
  (visibleFooter) => visibleFooter,
);

const Footer = ({ currentRoom, isRecorder }: IFooterProps) => {
  const isAdmin = store.getState().session.currentUser?.metadata?.is_admin;
  const footerVisible = useAppSelector(footerVisibilitySelector);
  const dispatch = useAppDispatch();

  return useMemo(() => {
    return (
      <>
        <Transition
          show={footerVisible}
          unmount={false}
          enter="transform duration-200 transition ease-in"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transform duration-200 transition ease-in"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <footer
            id="main-footer"
            className={`px-2 md:px-4 shadow-footer flex items-center justify-between dark:bg-darkPrimary h-[55px] lg:h-[60px]`}
            style={{ display: isRecorder ? 'none' : '' }}
          >
            <div className="footer-inner flex items-center justify-between w-full">
              <div className="footer-left w-52 flex items-center">
                <WebcamIcon currentRoom={currentRoom} />
                <MicrophoneIcon currentRoom={currentRoom} />
              </div>

              <div className="footer-middle flex items-center">
                <ParticipantIcon />
                <ChatIcon />
                <ScreenshareIcon currentRoom={currentRoom} />
                <RaiseHandIcon currentRoom={currentRoom} />
                <WhiteboardIcon />
                <SharedNotePadIcon />
                <RecordingIcon currentRoom={currentRoom} />
                {isAdmin ? <MenusIcon /> : null}
              </div>

              <div className="footer-right w-52 hidden sm:flex items-center" />
              <BreakoutRoomInvitation currentRoom={currentRoom} />
            </div>
          </footer>
        </Transition>
        <div
          className={`footer-collapse-arrow group fixed right-0 flex items-end justify-end h-6 w-6 cursor-pointer z-[1] bg-white dark:bg-darkPrimary rounded-tl-[50px] pr-1 ${
            footerVisible ? 'bottom-[60px] pb-[3px]' : 'bottom-0 pb-1'
          }`}
          onClick={() => dispatch(toggleFooterVisibility())}
        >
          <i
            className={` text-[10px] sm:text-[12px] dark:text-secondaryColor pnm-arrow-below ${
              footerVisible ? '' : 'rotate-180'
            }`}
          ></i>
          <span className="absolute right-0 bottom-5 w-max text-darkPrimary dark:text-white bg-white dark:bg-darkPrimary text-[10px] py-1 px-[10px] rounded opacity-0 invisible transition-all group-hover:opacity-100 group-hover:visible">
            {footerVisible ? 'Hide Footer' : 'Show Footer'}
          </span>
        </div>
      </>
    );
    //eslint-disable-next-line
  }, [currentRoom, footerVisible]);
};

export default Footer;
