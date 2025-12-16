import React, { useCallback, useEffect, useState } from 'react';
import { Menu, MenuButton, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { store, useAppSelector } from '../../store';
import HeaderMenus from './menus';
import RoomSettings from './room-settings';
import KeyboardShortcuts from './keyboardShortcuts';
import VolumeControl from './volumeControl';
import DurationView from './durationView';
import DarkThemeSwitcher from './darkThemeSwitcher';
import HeaderLogo from './headerLogo';
import { getNatsConn } from '../../helpers/nats';
import { HeaderMenuIcon } from '../../assets/Icons/HeaderMenuIcon';
import UserNotifications from './user-notifications';
import ConfirmationModal from '../../helpers/ui/confirmationModal';

const Header = () => {
  const roomTitle = useAppSelector(
    (state) => state.session.currentRoom.metadata?.roomTitle,
  );
  const isRecorder = store.getState().session.currentUser?.isRecorder;

  const { t } = useTranslation();
  const [title, setTitle] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalText, setModalText] = useState('');
  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => {});

  useEffect(() => {
    if (roomTitle) {
      setTitle(roomTitle);
    }
  }, [roomTitle]);

  const handleLogout = useCallback(() => {
    const confirm = async () => {
      const conn = getNatsConn();
      await conn.endSession('notifications.user-logged-out');
    };
    setModalText(t('header.menus.alert.logout'));
    setOnConfirm(() => confirm);
    setShowModal(true);
  }, [t]);

  return (
    !isRecorder && (
      <>
        <header
          id="main-header"
          className={`relative z-99999 px-4 min-h-[54px] 3xl:min-h-[68px] py-1 md:py-0 flex flex-wrap md:flex-nowrap items-center justify-between bg-white dark:bg-dark-primary transition-transform border-b border-Gray-200 dark:border-Gray-800`}
        >
          <div className="left relative z-20 flex items-center gap-2 md:gap-5 w-1/2 md:flex-1">
            <HeaderLogo />
            <div className="dark-mode">
              <DarkThemeSwitcher />
            </div>
          </div>
          <div className="middle absolute w-2/3 md:w-1/3 left-1/2 -translate-x-1/2 z-10 order-3 md:order-2 py-0.5 pointer-events-none">
            <h2 className="header-title text-sm 3xl:text-base font-medium text-Gray-950 dark:text-white leading-tight text-center truncate">
              {title}
            </h2>
          </div>
          <div className="right flex items-center justify-end relative -right-3 w-1/2 md:flex-1 gap-0.5 z-30 order-2 md:order-3">
            <DurationView />
            <UserNotifications />
            <VolumeControl />
            <Menu>
              {({ open }) => (
                <div>
                  <MenuButton
                    className={`relative shrink-0 w-7 md:w-8 h-7 md:h-8 flex items-center justify-center rounded-[10px] cursor-pointer ${open ? 'bg-Gray-50 dark:bg-Gray-800' : ''}`}
                  >
                    <div className="text-gray-700 dark:text-white cursor-pointer">
                      <HeaderMenuIcon />
                    </div>
                  </MenuButton>

                  {/* Use the Transition component. */}
                  <Transition
                    as="div"
                    show={open}
                    enter="transition ease-out duration-300"
                    enterFrom="transform opacity-0 scale-95 -translate-y-2"
                    enterTo="transform opacity-100 scale-100 translate-y-0"
                    leave="transition ease-in duration-200"
                    leaveFrom="transform opacity-100 scale-100 translate-y-0"
                    leaveTo="transform opacity-0 scale-95 -translate-y-2"
                  >
                    <HeaderMenus onOpenAlert={() => handleLogout()} />
                  </Transition>
                </div>
              )}
            </Menu>
          </div>
        </header>
        <ConfirmationModal
          show={showModal}
          onClose={() => setShowModal(false)}
          onConfirm={() => {
            onConfirm();
            setShowModal(false);
          }}
          title={t('header.menus.alert.confirm')}
          text={modalText}
        />
        <RoomSettings />
        <KeyboardShortcuts />
      </>
    )
  );
};

export default React.memo(Header);
