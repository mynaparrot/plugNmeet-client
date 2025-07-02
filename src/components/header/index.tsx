import React, { useEffect, useState, Fragment } from 'react';
import {
  Dialog,
  DialogTitle,
  Menu,
  MenuButton,
  Transition,
  TransitionChild,
  Button,
} from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import {
  CommonResponseSchema,
  RoomEndAPIReqSchema,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import {
  useAppSelector,
  store,
  useAppDispatch,
  // useAppDispatch
} from '../../store';
import sendAPIRequest from '../../helpers/api/plugNmeetAPI';
import HeaderMenus from './menus';
import RoomSettings from './room-settings';
import './style.css';
import KeyboardShortcuts from './keyboardShortcuts';
import VolumeControl from './volumeControl';
import DurationView from './durationView';
import DarkThemeSwitcher from './darkThemeSwitcher';
// import { toggleHeaderVisibility } from '../../store/slices/roomSettingsSlice';
import HeaderLogo from './headerLogo';
import { getNatsConn } from '../../helpers/nats';
import { HeaderMenuIcon } from '../../assets/Icons/HeaderMenuIcon';
import { isUserRecorder } from '../../helpers/utils';
import { PopupCloseSVGIcon } from '../../assets/Icons/PopupCloseSVGIcon';
import { addUserNotification } from '../../store/slices/roomSettingsSlice';
import UserNotifications from './user-notifications';

const Header = () => {
  const roomTitle = useAppSelector(
    (state) => state.session.currentRoom.metadata?.roomTitle,
  );
  const headerVisible = useAppSelector(
    (state) => state.roomSettings.visibleHeader,
  );
  const dispatch = useAppDispatch();
  // const dispatch = useAppDispatch();
  const conn = getNatsConn();
  const isRecorder = isUserRecorder(
    store.getState().session.currentUser?.userId ?? '',
  );

  const { t } = useTranslation();
  const [title, setTitle] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [alertText, setAlertText] = useState('');
  const [task, setTask] = useState('');
  // const assetPath = (window as any).STATIC_ASSETS_PATH ?? './assets';

  useEffect(() => {
    if (roomTitle) {
      setTitle(roomTitle);
    }
  }, [roomTitle]);

  const onOpenAlert = (task) => {
    setTask(task);
    if (task === 'logout') {
      setAlertText(t('header.menus.alert.logout').toString());
    } else if (task === 'end Room') {
      setAlertText(t('header.menus.alert.end').toString());
    }
    setShowModal(true);
  };

  const onCloseAlertModal = async (shouldDo = false) => {
    setShowModal(false);
    if (!shouldDo) {
      return;
    }

    if (task === 'logout') {
      await conn.endSession('notifications.user-logged-out');
    } else if (task === 'end Room') {
      const session = store.getState().session;

      const body = create(RoomEndAPIReqSchema, {
        roomId: session.currentRoom.roomId,
      });

      const r = await sendAPIRequest(
        'endRoom',
        toBinary(RoomEndAPIReqSchema, body),
        false,
        'application/protobuf',
        'arraybuffer',
      );
      const res = fromBinary(CommonResponseSchema, new Uint8Array(r));
      if (!res.status) {
        dispatch(
          addUserNotification({
            message: res.msg,
            typeOption: 'error',
          }),
        );
      }
    }
  };

  const alertModal = () => {
    return (
      <>
        <Transition appear show={showModal} as={Fragment}>
          <Dialog
            as="div"
            className="LogoutModal fixed inset-0 w-screen overflow-y-auto z-10 bg-Gray-950/70"
            onClose={() => false}
          >
            <div className="flex min-h-full items-center justify-center p-4">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <div className="w-full max-w-lg bg-white border border-Gray-200 shadow-virtualPOP p-6 rounded-xl overflow-hidden duration-300 ease-out">
                  <DialogTitle
                    as="h3"
                    className="flex items-center justify-between text-base 3xl:text-lg font-semibold leading-7 text-Gray-950 mb-2"
                  >
                    <span>{t('header.menus.alert.confirm')}</span>
                    <Button onClick={() => onCloseAlertModal()}>
                      <PopupCloseSVGIcon classes="text-Gray-600" />
                    </Button>
                  </DialogTitle>
                  <hr />
                  <div className="mt-4">
                    <p className="text-sm text-Gray-900">{alertText}</p>
                  </div>

                  <div className="mt-8 flex items-center justify-end gap-2">
                    <button
                      className="h-10 px-5 w-32 flex items-center justify-center rounded-[15px] text-sm 3xl:text-base font-medium 3xl:font-semibold text-white bg-Red-400 border border-Red-600 transition-all duration-300 hover:bg-Red-600 shadow-button-shadow"
                      onClick={() => onCloseAlertModal(true)}
                    >
                      {t('ok')}
                    </button>
                    <button
                      type="button"
                      className="h-10 px-5 w-32 flex items-center justify-center text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
                      onClick={() => onCloseAlertModal(false)}
                    >
                      {t('close')}
                    </button>
                  </div>
                </div>
              </TransitionChild>
            </div>
          </Dialog>
        </Transition>
      </>
    );
  };

  return isRecorder ? null : (
    <>
      <Transition
        show={headerVisible}
        unmount={false}
        enter="transform duration-200 transition ease-in"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transform duration-200 transition ease-in"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <header
          id="main-header"
          className={`relative z-99999 px-4 min-h-[54px] 3xl:min-h-[68px] py-1 sm:py-0 flex flex-wrap sm:flex-nowrap items-center justify-between bg-white transition-transform border-b border-Gray-200 ${
            headerVisible ? 'ac' : ''
          }`}
        >
          <div className="left relative z-20 flex items-center gap-3 sm:gap-5 w-1/2 sm:w-40 order-1">
            <HeaderLogo />
            <DarkThemeSwitcher />
          </div>
          <div className="middle flex-auto relative z-20 order-3 sm:order-2">
            <h2 className="header-title text-sm 3xl:text-base font-medium text-Gray-950 leading-tight text-center">
              {title}
            </h2>
          </div>
          <div className="right flex items-center justify-end relative z-20 -right-3 w-1/2 sm:w-40 order-2 sm:order-3">
            <DurationView />
            <UserNotifications />
            <VolumeControl />
            <Menu>
              {({ open }) => (
                <div>
                  <MenuButton className="relative shrink-0 p-2">
                    <div className="">
                      <HeaderMenuIcon />
                    </div>
                  </MenuButton>

                  {/* Use the Transition component. */}
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
                    <HeaderMenus onOpenAlert={(e) => onOpenAlert(e)} />
                  </Transition>
                </div>
              )}
            </Menu>
          </div>
          {showModal ? alertModal() : null}
        </header>
      </Transition>
      <RoomSettings />
      <KeyboardShortcuts />
    </>
  );
};

export default React.memo(Header);
