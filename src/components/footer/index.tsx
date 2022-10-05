import React, { useMemo } from 'react';
import { Room } from 'livekit-client';

import { store } from '../../store';

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

interface IFooterProps {
  currentRoom: Room;
  isRecorder: boolean;
}

const Footer = ({ currentRoom, isRecorder }: IFooterProps) => {
  const isAdmin = store.getState().session.currentUser?.metadata?.is_admin;
  return useMemo(() => {
    return (
      <footer
        id="main-footer"
        className="h-[55px] lg:h-[60px] px-2 md:px-4 shadow-footer flex items-center justify-between dark:bg-darkPrimary"
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
    );
    //eslint-disable-next-line
  }, [currentRoom]);
};

export default Footer;
