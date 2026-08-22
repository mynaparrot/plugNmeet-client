import React, { useCallback, useEffect, useState } from 'react';
import { Menu, MenuButton } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  CommonResponseSchema,
  RoomEndAPIReqSchema,
} from 'plugnmeet-protocol-js';

import { store, useAppSelector } from '../../store';
import sendAPIRequest from '../../helpers/api/plugNmeetAPI';
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
import ConnectionStatus from './connectionStatus';
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

  const handleEndRoom = useCallback(() => {
    const confirm = async () => {
      const id = toast.loading(t('notifications.ending-session'), {
        type: 'info',
      });

      const body = create(RoomEndAPIReqSchema, {
        roomId: store.getState().session.currentRoom.roomId,
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
        toast.update(id, {
          render: t(res.msg),
          type: 'error',
          isLoading: false,
          autoClose: 3000,
        });
      } else {
        toast.dismiss(id);
      }
    };
    setModalText(t('header.menus.alert.end'));
    setOnConfirm(() => confirm);
    setShowModal(true);
  }, [t]);

  return (
    !isRecorder && (
      <>
        <header
          id="main-header"
          aria-label={t('header.aria-label').toString()}
          className={`relative z-99999 px-4 min-h-[54px] 3xl:min-h-[68px] py-1 md:py-0 flex flex-nowrap items-center justify-between bg-white dark:bg-dark-primary transition-transform border-b border-Gray-200 dark:border-Gray-800`}
        >
          <div className="left relative z-20 flex items-center gap-2 md:gap-2.5 lg:gap-5 shrink-0 justify-start">
            <HeaderLogo />
            <DarkThemeSwitcher />
          </div>
          <div className="middle flex-1 min-w-0 flex justify-center z-10 order-2 py-0.5 mx-2">
            <h2 className="header-title text-xs sm:text-sm 3xl:text-base font-medium text-Gray-950 dark:text-white leading-tight text-center cursor-text truncate">
              {title}
            </h2>
          </div>
          <div className="right flex items-center justify-end relative -end-3 shrink-0 gap-0.5 z-30 order-3">
            <DurationView />
            <UserNotifications />
            <ConnectionStatus />
            <VolumeControl />
            <Menu>
              {({ open }) => (
                <div>
                  <MenuButton
                    className={`relative shrink-0 w-7 md:w-8 h-7 md:h-8 flex items-center justify-center rounded-[10px] cursor-pointer focus-ring ${open ? 'bg-Gray-50 dark:bg-Gray-800' : ''}`}
                    aria-label={t('header.menus.menu').toString()}
                  >
                    <div className="text-gray-700 dark:text-white cursor-pointer">
                      <HeaderMenuIcon />
                    </div>
                  </MenuButton>

                  <HeaderMenus
                    onOpenAlert={(task) =>
                      task === 'end' ? handleEndRoom() : handleLogout()
                    }
                  />
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
