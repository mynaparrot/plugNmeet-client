import React, { useEffect, useState, Fragment } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { Dialog, Menu, Transition } from '@headlessui/react';
import { Room } from 'livekit-client';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

import { useAppSelector, RootState, store, useAppDispatch } from '../../store';
import sendAPIRequest from '../../helpers/api/plugNmeetAPI';

import HeaderMenus from './menus';
import RoomSettings from './room-settings';
import './style.css';
import KeyboardShortcuts from './keyboardShortcuts';
import VolumeControl from './volumeControl';
import DurationView from './durationView';
import DarkThemeSwitcher from './darkThemeSwitcher';
import {
  CommonResponse,
  RoomEndAPIReq,
} from '../../helpers/proto/plugnmeet_common_api_pb';
import { toggleHeaderVisibility } from '../../store/slices/roomSettingsSlice';
import HeaderLogo from './headerLogo';

interface IHeaderProps {
  currentRoom: Room;
}

const roomTitleSelector = createSelector(
  (state: RootState) => state.session.currentRoom.metadata,
  (metadata) => metadata?.room_title,
);
const roomDurationSelector = createSelector(
  (state: RootState) => state.session.currentRoom.metadata?.room_features,
  (room_features) => room_features?.room_duration,
);
const headerVisibilitySelector = createSelector(
  (state: RootState) => state.roomSettings,
  (roomSettings) => roomSettings.visibleHeader,
);

const Header = ({ currentRoom }: IHeaderProps) => {
  const roomTitle = useAppSelector(roomTitleSelector);
  const roomDuration = useAppSelector(roomDurationSelector);
  const headerVisible = useAppSelector(headerVisibilitySelector);
  const dispatch = useAppDispatch();

  const { t } = useTranslation();
  const [title, setTitle] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [alertText, setAlertText] = useState('');
  const [task, setTask] = useState('');
  const assetPath = (window as any).STATIC_ASSETS_PATH ?? './assets';

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
      await currentRoom.disconnect();
    } else if (task === 'end Room') {
      const session = store.getState().session;

      const body = new RoomEndAPIReq({
        roomId: session.currentRoom.room_id,
      });

      const r = await sendAPIRequest(
        'endRoom',
        body.toBinary(),
        false,
        'application/protobuf',
        'arraybuffer',
      );
      const res = CommonResponse.fromBinary(new Uint8Array(r));
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
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
              </Transition.Child>

              <span
                className="inline-block h-screen align-middle"
                aria-hidden="true"
              >
                &#8203;
              </span>
              <Transition.Child
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

                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
                  >
                    {t('header.menus.alert.confirm')}
                  </Dialog.Title>
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
              </Transition.Child>
            </div>
          </Dialog>
        </Transition>
      </>
    );
  };

  return (
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
          className={`relative z-[99999] px-4 h-[50px] shadow-header flex items-center justify-between bg-white dark:bg-darkPrimary transition-transform ${
            headerVisible ? 'ac' : ''
          }`}
        >
          <div
            className={`header-before-start absolute top-0 left-[-35px] w-[300px] pointer-events-none bg-cover bg-center h-full`}
            style={{
              backgroundImage: `url("${assetPath}/imgs/header-before2.png")`,
            }}
          />
          <div className="logo w-28 relative z-20">
            <HeaderLogo />
          </div>
          <div className="middle flex-auto relative z-20">
            <h2 className="header-title text-base text-black dark:text-white leading-[1] text-center">
              {title}
            </h2>
          </div>
          <div className="dark-area w-28 flex items-center justify-end relative z-20 -right-3">
            {roomDuration && Number(roomDuration) > 0 ? (
              <DurationView duration={Number(roomDuration)} />
            ) : null}
            <DarkThemeSwitcher />
            <VolumeControl />
            <Menu>
              {({ open }) => (
                <>
                  <Menu.Button className="relative flex-shrink-0 p-2 rtl:-ml-4">
                    <div className="h-5 w-5 rotate-90 ">
                      <i className="pnm-menu-small dark:text-secondaryColor" />
                    </div>
                  </Menu.Button>

                  {/* Use the Transition component. */}
                  <Transition
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
          <div
            className={`header-before-end absolute top-0 right-[-100px] w-[350px] lg:w-[380px] rotate-[156deg] pointer-events-none bg-cover bg-center h-full`}
            style={{
              backgroundImage: `url("${assetPath}/imgs/header-before2.png")`,
            }}
          />
          {showModal ? alertModal() : null}
        </header>
      </Transition>
      <div
        className={`header-collapse-arrow group fixed right-0 flex items-start justify-center h-5 w-[50px] cursor-pointer z-[2] bg-white dark:bg-darkPrimary rounded-bl-lg ${
          headerVisible ? 'top-[50px] pt-[3px]' : 'top-0 pt-[6px]'
        }`}
        onClick={() => dispatch(toggleHeaderVisibility())}
      >
        <i
          className={`text-[10px] sm:text-[12px] dark:text-secondaryColor pnm-arrow-below ${
            headerVisible ? 'rotate-180' : ''
          }`}
        ></i>
        <span className="absolute right-0 top-7 w-max bg-white text-darkPrimary dark:text-white dark:bg-darkPrimary text-[10px] py-1 px-[12px] rounded opacity-0 invisible transition-all group-hover:opacity-100 group-hover:visible">
          {headerVisible ? t('header.hide-header') : t('header.show-header')}
        </span>
      </div>
      <RoomSettings />
      <KeyboardShortcuts />
    </>
  );
};

export default React.memo(Header);
