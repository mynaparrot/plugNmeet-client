import React, { useEffect, useState, Fragment } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { Dialog, Menu, Transition } from '@headlessui/react';
import { Room } from 'livekit-client';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

import { useAppSelector, RootState, store } from '../../store';
import sendAPIRequest from '../../helpers/api/plugNmeetAPI';

import HeaderMenus from './menus';
import RoomSettings from './room-settings';
import './style.css';
import KeyboardShortcuts from './keyboardShortcuts';
import VolumeControl from './volumeControl';
import DurationView from './durationView';

interface IHeaderProps {
  currentRoom: Room;
}

const roomTitleSelector = createSelector(
  (state: RootState) => state.session.currentRoom.metadata?.room_title,
  (room_title) => room_title,
);
const roomDurationSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.room_features.room_duration,
  (room_duration) => room_duration,
);

const Header = ({ currentRoom }: IHeaderProps) => {
  const roomTitle = useAppSelector(roomTitleSelector);
  const roomDuration = useAppSelector(roomDurationSelector);
  const { t } = useTranslation();
  const [title, setTitle] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [alertText, setAlertText] = useState('');
  const [task, setTask] = useState('');
  const assetPath = (window as any).STATIC_ASSETS_PATH ?? './assets';
  const logo = (window as any).CUSTOM_LOGO ?? `${assetPath}/imgs/main-logo.png`;
  const [darkMode, setDarkMode] = useState(true);
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  useEffect(() => {
    if (roomTitle) {
      setTitle(roomTitle);
    }
  }, [roomTitle]);

  const onOpenAlert = (task) => {
    setTask(task);
    if (task === 'logout') {
      setAlertText(t('header.menus.alert.logout'));
    } else if (task === 'end Room') {
      setAlertText(t('header.menus.alert.end'));
    }
    setShowModal(true);
  };

  const onCloseAlertModal = async (shouldDo = false) => {
    setShowModal(false);
    if (!shouldDo) {
      return;
    }

    if (task === 'logout') {
      currentRoom.disconnect();
    } else if (task === 'end Room') {
      const session = store.getState().session;

      const data = {
        room_id: session.currentRoom.room_id,
      };

      const res = await sendAPIRequest('endRoom', data);
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
            className="fixed inset-0 z-[9999] overflow-y-auto"
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
                      className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 mr-4 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
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
      <header
        id="main-header"
        className="relative z-[99999] h-[50px] px-4 shadow-header flex items-center justify-between bg-white dark:bg-darkPrimary"
      >
        <div
          className={`header-before-start absolute top-0 left-[-35px] w-[300px] pointer-events-none bg-cover bg-center h-full`}
          style={{
            backgroundImage: `url("${assetPath}/imgs/header-before2.png")`,
          }}
        />
        <div className="logo w-28 relative z-20">
          <div
            className={`${
              (window as any).CUSTOM_LOGO ? 'h-[45px]' : 'h-[45px]'
            } header-logo h-full bg-contain bg-no-repeat`}
            style={{
              backgroundImage: `url("${logo}")`,
            }}
          />
        </div>
        <div className="middle flex-auto relative z-20">
          <h2 className="header-title text-base text-black dark:text-white leading-[1] text-center">
            {title}
          </h2>
        </div>
        <div className="dark-area w-28 flex items-center justify-end relative z-20 -right-3">
          <div className="dark-mode mt-1">
            <button onClick={toggleDarkMode}>
              <>
                {darkMode ? (
                  <div className="moon w-8 h-8 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-primaryColor dark:text-secondaryColor"
                      xmlns="http://www.w3.org/2000/svg"
                      x="0px"
                      y="0px"
                      viewBox="0 0 455 455"
                    >
                      <polygon
                        points="320.18,162.705 280.63,171.052 307.72,201.052 303.437,241.245 340.34,224.751 377.243,241.245 372.96,201.052 
                        400.05,171.052 360.5,162.705 340.34,127.67"
                        fill="currentColor"
                      />
                      <polygon
                        points="440,325.677 414.091,320.208 400.883,297.253 387.675,320.208 361.766,325.677 379.513,345.33 376.708,371.661 
                        400.884,360.855 425.063,371.661 422.254,345.329"
                        fill="currentColor"
                      />
                      <path
                        d="M218,227.5c0-89.167,51.306-166.338,126-203.64C313.443,8.6,278.978,0,242.5,0C116.855,0,15,101.855,15,227.5
                        S116.855,455,242.5,455c36.478,0,70.943-8.6,101.5-23.86C269.306,393.838,218,316.667,218,227.5z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>
                ) : (
                  <div className="sun w-8 h-8 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-primaryColor dark:text-secondaryColor"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 512 512"
                    >
                      <path
                        fill="currentColor"
                        d="m256,105.5c-83.9,0-152.2,68.3-152.2,152.2 0,83.9 68.3,152.2 152.2,152.2 83.9,0 152.2-68.3 152.2-152.2 0-84-68.3-152.2-152.2-152.2zm0,263.5c-61.4,0-111.4-50-111.4-111.4 0-61.4 50-111.4 111.4-111.4 61.4,0 111.4,50 111.4,111.4 0,61.4-50,111.4-111.4,111.4z"
                      />
                      <path
                        fill="currentColor"
                        d="m256,74.8c11.3,0 20.4-9.1 20.4-20.4v-23c0-11.3-9.1-20.4-20.4-20.4-11.3,0-20.4,9.1-20.4,20.4v23c2.84217e-14,11.3 9.1,20.4 20.4,20.4z"
                      />
                      <path
                        fill="currentColor"
                        d="m256,437.2c-11.3,0-20.4,9.1-20.4,20.4v22.9c0,11.3 9.1,20.4 20.4,20.4 11.3,0 20.4-9.1 20.4-20.4v-22.9c0-11.2-9.1-20.4-20.4-20.4z"
                      />
                      <path
                        fill="currentColor"
                        d="m480.6,235.6h-23c-11.3,0-20.4,9.1-20.4,20.4 0,11.3 9.1,20.4 20.4,20.4h23c11.3,0 20.4-9.1 20.4-20.4 0-11.3-9.1-20.4-20.4-20.4z"
                      />
                      <path
                        fill="currentColor"
                        d="m54.4,235.6h-23c-11.3,0-20.4,9.1-20.4,20.4 0,11.3 9.1,20.4 20.4,20.4h22.9c11.3,0 20.4-9.1 20.4-20.4 0.1-11.3-9.1-20.4-20.3-20.4z"
                      />
                      <path
                        fill="currentColor"
                        d="M400.4,82.8L384.1,99c-8,8-8,20.9,0,28.9s20.9,8,28.9,0l16.2-16.2c8-8,8-20.9,0-28.9S408.3,74.8,400.4,82.8z"
                      />
                      <path
                        fill="currentColor"
                        d="m99,384.1l-16.2,16.2c-8,8-8,20.9 0,28.9 8,8 20.9,8 28.9,0l16.2-16.2c8-8 8-20.9 0-28.9s-20.9-7.9-28.9,0z"
                      />
                      <path
                        fill="currentColor"
                        d="m413,384.1c-8-8-20.9-8-28.9,0-8,8-8,20.9 0,28.9l16.2,16.2c8,8 20.9,8 28.9,0 8-8 8-20.9 0-28.9l-16.2-16.2z"
                      />
                      <path
                        fill="currentColor"
                        d="m99,127.9c8,8 20.9,8 28.9,0 8-8 8-20.9 0-28.9l-16.2-16.2c-8-8-20.9-8-28.9,0-8,8-8,20.9 0,28.9l16.2,16.2z"
                      />
                    </svg>
                  </div>
                )}
              </>
            </button>
          </div>
          {roomDuration && roomDuration > 0 ? (
            <DurationView duration={roomDuration} />
          ) : null}
          <VolumeControl currentRoom={currentRoom} />
          <Menu>
            {({ open }) => (
              <>
                <Menu.Button className="relative flex-shrink-0 p-2">
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
      <RoomSettings />
      <KeyboardShortcuts />
    </>
  );
};

export default React.memo(Header);
