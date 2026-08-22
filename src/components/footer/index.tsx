import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { store } from '../../store';
import { useHybridLockForwarder } from '../../helpers/nativeBridge';

import WebcamIcon from './icons/webcam';
import MicrophoneIcon from './icons/microphone';
import ChatIcon from './icons/chat';
import ParticipantIcon from './icons/participant';
import ReactionsIcon from './icons/reactions';
import ScreenshareIcon from './icons/screenshare';
import MenusIcon from './icons/menus';
import SharedNotePadIcon from './icons/sharedNotePad';
import WhiteboardIcon from './icons/whiteboard';
import BreakoutRoomInvitation from '../breakout-room/breakoutRoomInvitation';
import LeaveMeetingButton from './icons/leaveMeeting';
import RecordingIcon from './icons/recording';
import PollsIcon from './icons/polls';
import Translation from './icons/translation';
import InsightsAiTextChatIcon from './icons/insightAiTextChat';

const Footer = () => {
  const { t } = useTranslation();

  const { isAdmin, isRecorder, allowChat } = useMemo(() => {
    const { currentRoom, currentUser } = store.getState().session;
    return {
      isAdmin: !!currentUser?.metadata?.isAdmin,
      isRecorder: !!currentUser?.isRecorder,
      allowChat: !!currentRoom.metadata?.roomFeatures?.chatFeatures?.isAllow,
    };
  }, []);

  // forwards lock-settings changes to the native host (hybrid mode only)
  useHybridLockForwarder();

  return (
    <footer
      id="main-footer"
      aria-label={t('footer.aria-label').toString()}
      className={`px-2 md:px-4 flex items-center justify-between bg-Gray-25 dark:border-Gray-800 dark:bg-dark-primary h-[54px] 3xl:h-[76px] border-t border-Gray-200 relative z-[100] ${
        isRecorder ? 'hidden' : ''
      }`}
    >
      <div className="footer-inner flex items-center justify-between w-full">
        <div className="footer-left w-[155px] lg:w-72 flex items-center gap-1 3xl:gap-2 relative z-50">
          <MicrophoneIcon />
          <WebcamIcon />
        </div>

        <div className="footer-middle flex items-center gap-1 3xl:gap-2">
          <ScreenshareIcon />
          <WhiteboardIcon />
          <ReactionsIcon />
          <SharedNotePadIcon />
          <PollsIcon />
          <Translation />
          <InsightsAiTextChatIcon />
          <RecordingIcon />
          <div className="icon block md:hidden">
            <ParticipantIcon />
          </div>
          {allowChat && (
            <div className="icon block md:hidden">
              <ChatIcon />
            </div>
          )}
          <MenusIcon isAdmin={isAdmin} />
          <div className="icon block md:hidden">
            <LeaveMeetingButton />
          </div>
        </div>

        <div className="footer-right w-[155px] lg:w-72 hidden md:flex items-center justify-end gap-2">
          <ParticipantIcon />
          {allowChat && <ChatIcon />}
          <div className="line h-6 w-px bg-Gray-200 dark:bg-Gray-700"></div>
          <LeaveMeetingButton />
        </div>
        <BreakoutRoomInvitation />
      </div>
    </footer>
  );
};

export default React.memo(Footer);
