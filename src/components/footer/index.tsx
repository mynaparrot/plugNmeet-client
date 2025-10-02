import React, { useMemo } from 'react';

import { store } from '../../store';
import WebcamIcon from './icons/webcam';
import MicrophoneIcon from './icons/microphone';
import ChatIcon from './icons/chat';
import ParticipantIcon from './icons/participant';
import RaiseHandIcon from './icons/raisehand';
import ScreenshareIcon from './icons/screenshare';
import MenusIcon from './icons/menus';
import SharedNotePadIcon from './icons/sharedNotePad';
import WhiteboardIcon from './icons/whiteboard';
import BreakoutRoomInvitation from '../breakout-room/breakoutRoomInvitation';
import EndMeetingButton from './icons/endMeeting';
import RecordingIcon from './icons/recording';
import PollsIcon from './icons/polls';
import Translation from './icons/translation';

const Footer = () => {
  const { isAdmin, isRecorder, allowChat } = useMemo(() => {
    const { currentRoom, currentUser } = store.getState().session;
    return {
      isAdmin: !!currentUser?.metadata?.isAdmin,
      isRecorder: !!currentUser?.isRecorder,
      allowChat: !!currentRoom.metadata?.roomFeatures?.chatFeatures?.allowChat,
    };
  }, []);

  return (
    <footer
      id="main-footer"
      className={`px-2 md:px-4 flex items-center justify-between bg-Gray-25 dark:border-Gray-800 dark:bg-dark-primary h-[54px] 3xl:h-[76px] border-t border-Gray-200 relative z-[100] ${
        isRecorder ? 'hidden' : ''
      }`}
    >
      <div className="footer-inner flex items-center justify-between w-full rtl:flex-row-reverse">
        <div className="footer-left w-72 flex items-center gap-1 3xl:gap-2 relative z-50 rtl:justify-end">
          <MicrophoneIcon />
          <WebcamIcon />
        </div>

        <div className="footer-middle flex items-center gap-1 3xl:gap-2">
          <ScreenshareIcon />
          <WhiteboardIcon />
          <RaiseHandIcon />
          <SharedNotePadIcon />
          <PollsIcon />
          <Translation />
          <RecordingIcon />
          {isAdmin && <MenusIcon />}
        </div>

        <div className="footer-right w-72 flex items-center justify-end gap-2">
          <ParticipantIcon />
          {allowChat && <ChatIcon />}
          <div className="line h-6 w-px bg-Gray-200"></div>
          <EndMeetingButton />
        </div>
        <BreakoutRoomInvitation />
      </div>
    </footer>
  );
};

export default React.memo(Footer);
