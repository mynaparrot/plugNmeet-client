import React, { useMemo } from 'react';
import { Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { store, useAppDispatch, useAppSelector } from '../../store';
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

const Footer = () => {
  const isAdmin = store.getState().session.currentUser?.metadata?.isAdmin;
  const footerVisible = useAppSelector(
    (state) => state.roomSettings.visibleFooter,
  );
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const isRecorder = store.getState().session.currentUser?.isRecorder;

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
            <div className="footer-inner flex items-center justify-between w-full rtl:flex-row-reverse">
              <div className="footer-left w-52 flex items-center relative z-50 rtl:justify-end">
                <WebcamIcon />
                <MicrophoneIcon />
              </div>

              <div className="footer-middle flex items-center">
                <ParticipantIcon />
                <ChatIcon />
                <ScreenshareIcon />
                <RaiseHandIcon />
                <WhiteboardIcon />
                <SharedNotePadIcon />
                <RecordingIcon />
                {isAdmin ? <MenusIcon /> : null}
              </div>

              <div className="footer-right w-52 hidden sm:flex items-center" />
              <BreakoutRoomInvitation />
            </div>
          </footer>
        </Transition>
        {isRecorder ? null : (
          <div
            className={`footer-collapse-arrow group fixed right-0 flex items-end justify-center h-5 w-[50px] cursor-pointer z-[1] bg-white dark:bg-darkPrimary rounded-tl-lg ${
              footerVisible ? 'bottom-[60px] pb-[3px]' : 'bottom-0 pb-[6px]'
            }`}
            onClick={() => dispatch(toggleFooterVisibility())}
          >
            <i
              className={` text-[10px] sm:text-[12px] dark:text-secondaryColor pnm-arrow-below ${
                footerVisible ? '' : 'rotate-180'
              }`}
            ></i>
            <span className="absolute right-0 bottom-7 w-max text-darkPrimary dark:text-white bg-white dark:bg-darkPrimary text-[12px] py-1 px-[10px] rounded opacity-0 invisible transition-all group-hover:opacity-100 group-hover:visible">
              {footerVisible
                ? t('footer.hide-footer')
                : t('footer.show-footer')}
            </span>
          </div>
        )}
      </>
    );
    //eslint-disable-next-line
  }, [footerVisible]);
};

export default Footer;
