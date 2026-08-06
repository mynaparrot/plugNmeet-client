import React, { ReactElement, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, MenuButton, MenuItems } from '@headlessui/react';

import MicMenuItem from './menu-items/mic';
import WebcamMenuItem from './menu-items/webcam';
import SwitchPresenterMenuItem from './menu-items/switchPresenter';
import LowerHandMenuItem from './menu-items/lowerHand';
import LockSettingMenuItem from './menu-items/lock';
import RemoveUserMenuItem from './menu-items/removeUser';
import PrivateChatMenuItem from './menu-items/privateChat';
import IconWrapper from './iconWrapper';

import { useAppSelector } from '../../../../store';
import { ParticipantsMenuIconSVG } from '../../../../assets/Icons/ParticipantsMenuIconSVG';

interface IMenuIconProps {
  userId: string;
  name: string;
  isAdmin: boolean;
  currentUserIsAdmin: boolean;
  openRemoveParticipantAlert(userId: string, type: string): void;
}

const MenuIcon = ({
  userId,
  name,
  isAdmin,
  currentUserIsAdmin,
  openRemoveParticipantAlert,
}: IMenuIconProps) => {
  const { t } = useTranslation();
  const defaultLockSettings = useAppSelector(
    (state) => state.session.currentRoom.metadata?.defaultLockSettings,
  );
  const currentUserLockPrivateChat = useAppSelector(
    (state) =>
      state.session.currentUser?.metadata?.lockSettings?.lockPrivateChat,
  );

  const menuItems = useMemo(() => {
    const items: ReactElement[] = [];

    if (currentUserIsAdmin) {
      items.push(
        <MicMenuItem key="mic" userId={userId} />,
        <WebcamMenuItem key="webcam" userId={userId} />,
        <PrivateChatMenuItem key="chat" userId={userId} name={name} />,
        <SwitchPresenterMenuItem key="presenter" userId={userId} />,
        <LowerHandMenuItem key="lower-hand" userId={userId} />,
        <LockSettingMenuItem key="lock" userId={userId} />,
        <RemoveUserMenuItem
          key="remove"
          onOpenAlert={openRemoveParticipantAlert}
          userId={userId}
        />,
      );
      return items;
    }

    // For non-admins, check if they can send private messages.
    const canSendPrivateMessage =
      !currentUserLockPrivateChat &&
      !defaultLockSettings?.lockChat &&
      !defaultLockSettings?.lockPrivateChat;

    // Or if they can send a message to an admin.
    const canSendPrivateMessageToAdmin =
      !defaultLockSettings?.lockChat &&
      defaultLockSettings?.lockPrivateChat &&
      isAdmin;

    if (canSendPrivateMessage || canSendPrivateMessageToAdmin) {
      items.push(
        <PrivateChatMenuItem key="chat" userId={userId} name={name} />,
      );
    }

    return items;
  }, [
    currentUserLockPrivateChat,
    defaultLockSettings,
    isAdmin,
    name,
    openRemoveParticipantAlert,
    userId,
    currentUserIsAdmin,
  ]);

  if (menuItems.length === 0) {
    return null;
  }
  return (
    <IconWrapper>
      <Menu as="div" className="flex items-center">
        <MenuButton
          className="relative shrink-0 cursor-pointer dark:text-white focus-ring"
          aria-label={t('participant-menu').toString()}
        >
          <ParticipantsMenuIconSVG />
        </MenuButton>
        <MenuItems
          anchor="bottom end"
          transition
          className="z-10 w-60 border border-Gray-100 dark:border-Gray-700 bg-white dark:bg-dark-secondary3 shadow-lg rounded-2xl p-2 max-h-[80vh] overflow-y-auto [--anchor-gap:8px] transition ease-out data-closed:scale-95 data-closed:opacity-0 data-enter:duration-100 data-leave:duration-75"
        >
          {menuItems}
        </MenuItems>
      </Menu>
    </IconWrapper>
  );
};

export default MenuIcon;
