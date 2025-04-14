import React, { useEffect, useState, Fragment } from 'react';
import {
  Dialog,
  DialogTitle,
  Menu,
  MenuButton,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
  CommonResponseSchema,
  RoomEndAPIReqSchema,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import {
  useAppSelector,
  store,
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

const Header = () => {
  const roomTitle = useAppSelector(
    (state) => state.session.currentRoom.metadata?.roomTitle,
  );
  const headerVisible = useAppSelector(
    (state) => state.roomSettings.visibleHeader,
  );
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
        toast(res.msg, {
          type: 'error',
        });
      }
    }
  };

  const alertModal = () => {
    return (
      <>
        <Transition appear show={showModal} as={Fragment}>
          <Dialog
            as="div"
            className="AlertModal fixed inset-0 z-[9999] overflow-y-auto"
            onClose={() => false}
          >
            <div className="min-h-screen px-4 text-center">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="fixed inset-0 bg-black opacity-30" />
              </TransitionChild>

              <span
                className="inline-block h-screen align-middle"
                aria-hidden="true"
              >
                &#8203;
              </span>
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-darkPrimary shadow-xl rounded-2xl">
                  <button
                    className="close-btn absolute top-8 right-6 w-[25px] h-[25px] outline-none"
                    type="button"
                    onClick={() => onCloseAlertModal()}
                  >
                    <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 rotate-45" />
                    <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 -rotate-45" />
                  </button>

                  <DialogTitle
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
                  >
                    {t('header.menus.alert.confirm')}
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-darkText">
                      {alertText}
                    </p>
                  </div>

                  <div className="mt-4">
                    <button
                      className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 ltr:mr-4 rtl:ml-4 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                      onClick={() => onCloseAlertModal(true)}
                    >
                      {t('ok')}
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center px-4 py-2 text-sm font-medium bg-primaryColor hover:bg-secondaryColor text-white border border-transparent rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
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
          className={`relative z-[99999] px-4 h-[54px] 3xl:h-[68px] flex items-center justify-between bg-white transition-transform border-b border-Gray-200 ${
            headerVisible ? 'ac' : ''
          }`}
        >
          <div className="left relative z-20 flex items-center gap-5 w-60">
            <HeaderLogo />
            <DarkThemeSwitcher />
          </div>
          <div className="middle flex-auto relative z-20">
            <h2 className="header-title text-sm 3xl:text-base font-medium text-Gray-950 leading-tight text-center">
              {title}
            </h2>
          </div>
          <div className="right flex items-center justify-end relative z-20 -right-3 w-60">
            <DurationView />
            <VolumeControl />
            <Menu>
              {({ open }) => (
                <>
                  <MenuButton className="relative flex-shrink-0 p-2">
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
                </>
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
