import React, { useMemo } from 'react';
import { Transition } from '@headlessui/react';
// import { useTranslation } from 'react-i18next';

import {
  store,
  // useAppDispatch,
  useAppSelector,
} from '../../store';
import WebcamIcon from './icons/webcam';
import MicrophoneIcon from './icons/microphone';
import ChatIcon from './icons/chat';
import ParticipantIcon from './icons/participant';
import RaiseHandIcon from './icons/raisehand';
import ScreenshareIcon from './icons/screenshare';
// import RecordingIcon from './icons/recording';
import MenusIcon from './icons/menus';
import SharedNotePadIcon from './icons/sharedNotePad';
import WhiteboardIcon from './icons/whiteboard';
import BreakoutRoomInvitation from '../breakout-room/breakoutRoomInvitation';
import EndMeetingButton from './icons/endMeeting';
import RecordingIcon from './icons/recording';
import PollsIcon from './icons/polls';
import Translation from './icons/translation';
// import { toggleFooterVisibility } from '../../store/slices/roomSettingsSlice';

const Footer = () => {
  const footerVisible = useAppSelector(
    (state) => state.roomSettings.visibleFooter,
  );
  // const dispatch = useAppDispatch();
  // const { t } = useTranslation();
  const session = store.getState().session;
  const isAdmin = session.currentUser?.metadata?.isAdmin;
  const isRecorder = session.currentUser?.isRecorder;
  const roomFeatures = session.currentRoom.metadata?.roomFeatures;

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
            className={`px-2 md:px-4 flex items-center justify-between bg-Gray-25 dark:border-Gray-800 dark:bg-dark-primary h-[54px] 3xl:h-[76px] border-t border-Gray-200 relative z-[100]`}
            style={{ display: isRecorder ? 'none' : '' }}
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
                {isAdmin ? <MenusIcon /> : null}
              </div>

              <div className="footer-right w-72 flex items-center justify-end gap-2">
                <ParticipantIcon />
                {roomFeatures?.chatFeatures?.allowChat ? <ChatIcon /> : null}
                <div className="line h-6 w-px bg-Gray-200"></div>
                <EndMeetingButton />
              </div>
              <BreakoutRoomInvitation />
            </div>
          </footer>
        </Transition>
        {/* {isRecorder ? null : (
          <div
            className={`footer-collapse-arrow group fixed right-0 flex items-end justify-center h-5 w-[50px] cursor-pointer z-1 bg-white dark:bg-dark-primary rounded-tl-lg ${
              footerVisible ? 'bottom-[60px] pb-[3px]' : 'bottom-0 pb-[6px]'
            }`}
            onClick={() => dispatch(toggleFooterVisibility())}
          >
            <i
              className={` text-[10px] sm:text-[12px] dark:text-secondary-color pnm-arrow-below ${
                footerVisible ? '' : 'rotate-180'
              }`}
            ></i>
            <span className="absolute right-0 bottom-7 w-max text-dark-primary dark:text-white bg-white dark:bg-dark-primary text-[12px] py-1 px-[10px] rounded-sm opacity-0 invisible transition-all group-hover:opacity-100 group-hover:visible">
              {footerVisible
                ? t('footer.hide-footer')
                : t('footer.show-footer')}
            </span>
          </div>
        )} */}
      </>
    );
    //eslint-disable-next-line
  }, [footerVisible]);
};

export default Footer;
