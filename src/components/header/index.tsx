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

interface IHeaderProps {
  currentRoom: Room;
}

const roomMetadataSelector = createSelector(
  (state: RootState) => state.session.currentRoom.metadata,
  (metadata) => metadata,
);

const Header = ({ currentRoom }: IHeaderProps) => {
  const roomMetadata = useAppSelector(roomMetadataSelector);
  const { t } = useTranslation();
  const [title, setTitle] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [alertText, setAlertText] = useState('');
  const [task, setTask] = useState('');
  const assetPath = (window as any).STATIC_ASSETS_PATH ?? './assets';
  const logo = (window as any).CUSTOM_LOGO ?? `${assetPath}/imgs/main-logo.png`;

  const [volume, setVolume] = useState<number>(100);
  const [muted, setMuted] = useState<boolean>(false);
  const finalVolume = muted ? 0 : volume;

  useEffect(() => {
    if (roomMetadata) {
      setTitle(roomMetadata.room_title);
    }
  }, [roomMetadata]);

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
            onClose={onCloseAlertModal}
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
                <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
                  <button
                    className="close-btn absolute top-8 right-6 w-[25px] h-[25px] outline-none"
                    type="button"
                    onClick={() => onCloseAlertModal()}
                  >
                    <span className="inline-block h-[1px] w-[20px] bg-primaryColor absolute top-0 left-0 rotate-45" />
                    <span className="inline-block h-[1px] w-[20px] bg-primaryColor absolute top-0 left-0 -rotate-45" />
                  </button>

                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    {t('header.menus.alert.confirm')}
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">{alertText}</p>
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
        className="relative z-[99999] h-[50px] px-4 shadow-header flex items-center justify-between bg-white"
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
          <h2 className="header-title text-base text-black leading-[1] text-center">
            {title}
          </h2>
        </div>
        <div className="dark w-28 flex items-center justify-end relative z-20 -right-3">
          <Menu>
            {({ open }) => (
              <>
                <Menu.Button className="relative flex-shrink-0 p-2">
                  <div className="h-4 w-4">
                    <svg
                      version="1.1"
                      className="w-full h-full"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 512.002 512.002"
                    >
                      <path
                        d="M221.119,9.05L109.593,120.576H0v270.849h109.593l111.526,111.526h49.729V9.05H221.119z M223.052,437.29l-93.661-93.661
			H47.797V168.373h81.594l93.661-93.66V437.29z"
                        fill="#004D90"
                      />
                      <path
                        d="M343.511,137.71l-33.797,33.797c46.589,46.591,46.589,122.398,0,168.987l33.797,33.797
			C408.736,309.067,408.736,202.935,343.511,137.71z"
                        fill="#004D90"
                      />
                      <path
                        d="M428.005,53.216l-33.797,33.797c45.138,45.138,69.997,105.152,69.997,168.987s-24.859,123.85-69.997,168.987
			l33.797,33.797c54.167-54.165,83.997-126.182,83.997-202.785S482.172,107.381,428.005,53.216z"
                        fill="#004D90"
                      />
                    </svg>
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
                  <Menu.Items
                    static
                    className="volume-popup-wrapper origin-top-right z-10 absolute right-0 top-4 mt-2 w-64 py-5 px-2 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none"
                  >
                    <section className="flex items-center">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={volume}
                        onChange={(event) => {
                          setVolume(event.target.valueAsNumber);
                        }}
                        className="range flex-1"
                      />
                      <p className="w-10 text-center text-sm">{finalVolume}</p>
                      <button
                        onClick={() => setMuted((m) => !m)}
                        className="w-4 h-4"
                      >
                        {muted ? (
                          <>
                            <svg
                              version="1.1"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 92 92"
                              className="w-full h-full"
                            >
                              <path
                                id="XMLID_788_"
                                d="M40.3,4.3c-1.5-0.6-3.3-0.2-4.5,0.9L16.5,25H7c-2.2,0-4,1.8-4,4V63c0,2.2,1.8,4,4,4h9.5l19.2,19.8
	c0.8,0.8,1.8,1.2,2.9,1.2c0.5,0,1.2-0.1,1.7-0.3c1.5-0.6,2.7-2.1,2.7-3.7V8C43,6.4,41.8,4.9,40.3,4.3z M35,74.2L21.2,60.2
	c-0.8-0.8-2-1.2-3.1-1.2H11V33h7.2c1.1,0,2.3-0.5,3.1-1.2L35,17.8V74.2z M87.9,58c1.5,1.6,1.5,4.1-0.1,5.7C87,64.4,86,64.8,85,64.8
	c-1,0-2.1-0.4-2.9-1.2L70.6,51.7L59.1,63.6c-0.8,0.8-1.8,1.2-2.9,1.2c-1,0-2-0.4-2.8-1.1c-1.6-1.5-1.6-4.1-0.1-5.7L65,46L53.4,34
	c-1.5-1.6-1.5-4.1,0.1-5.7c1.6-1.5,4.1-1.5,5.7,0.1l11.5,11.8l11.5-11.8c1.5-1.6,4.1-1.6,5.7-0.1c1.6,1.5,1.6,4.1,0.1,5.7L76.2,46
	L87.9,58z"
                                fill="#004D90"
                              />
                            </svg>
                          </>
                        ) : (
                          <>
                            <svg
                              version="1.1"
                              className="w-full h-full"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 512.002 512.002"
                            >
                              <path
                                d="M221.119,9.05L109.593,120.576H0v270.849h109.593l111.526,111.526h49.729V9.05H221.119z M223.052,437.29l-93.661-93.661
			H47.797V168.373h81.594l93.661-93.66V437.29z"
                                fill="#004D90"
                              />
                              <path
                                d="M343.511,137.71l-33.797,33.797c46.589,46.591,46.589,122.398,0,168.987l33.797,33.797
			C408.736,309.067,408.736,202.935,343.511,137.71z"
                                fill="#004D90"
                              />
                              <path
                                d="M428.005,53.216l-33.797,33.797c45.138,45.138,69.997,105.152,69.997,168.987s-24.859,123.85-69.997,168.987
			l33.797,33.797c54.167-54.165,83.997-126.182,83.997-202.785S482.172,107.381,428.005,53.216z"
                                fill="#004D90"
                              />
                            </svg>
                          </>
                        )}
                      </button>
                    </section>
                  </Menu.Items>
                </Transition>
              </>
            )}
          </Menu>
          <Menu>
            {({ open }) => (
              <>
                <Menu.Button className="relative flex-shrink-0 p-2">
                  <div className="h-5 w-5 rotate-90 ">
                    <i className="pnm-menu-small" />
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
