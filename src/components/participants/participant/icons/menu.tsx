import React, { ReactElement, useMemo } from 'react';
import { Menu, MenuButton, MenuItems, Transition } from '@headlessui/react';

import MicMenuItem from './menu-items/mic';
import WebcamMenuItem from './menu-items/webcam';
import SwitchPresenterMenuItem from './menu-items/switchPresenter';
import LowerHandMenuItem from './menu-items/lowerHand';
import LockSettingMenuItem from './menu-items/lock';
import RemoveUserMenuItem from './menu-items/removeUser';
import PrivateChatMenuItem from './menu-items/privateChatMenuItem';
import { useAppSelector } from '../../../../store';
import IconWrapper from './iconWrapper';
import { ParticipantsMenuIconSVG } from '../../../../assets/Icons/ParticipantsMenuIconSVG';

interface IMenuIconProps {
  userId: string;
  name: string;
  isAdmin: boolean;
  openRemoveParticipantAlert(userId: string, type: string): void;
}

const MenuIcon = ({
  userId,
  name,
  isAdmin,
  openRemoveParticipantAlert,
}: IMenuIconProps) => {
  const defaultLockSettings = useAppSelector(
    (state) => state.session.currentRoom.metadata?.defaultLockSettings,
  );
  const currentUser = useAppSelector((state) => state.session.currentUser);

  const menuItems = useMemo(() => {
    const items: ReactElement[] = [];

    if (currentUser?.metadata?.isAdmin) {
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
      !currentUser?.metadata?.lockSettings?.lockPrivateChat &&
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
    currentUser,
    defaultLockSettings,
    isAdmin,
    name,
    openRemoveParticipantAlert,
    userId,
  ]);

  if (menuItems.length === 0) {
    return null;
  }
  return (
    <IconWrapper>
      <Menu as="div" className="flex items-center">
        {({ open }) => (
          <>
            <MenuButton className="relative shrink-0">
              <ParticipantsMenuIconSVG />
            </MenuButton>
            <Transition
              show={open}
              enter="transition duration-100 ease-out"
              enterFrom="transform scale-95 opacity-0"
              enterTo="transform scale-100 opacity-100 z-10"
              leave="transition duration-75 ease-out"
              leaveFrom="transform scale-100 opacity-100"
              leaveTo="transform scale-95 opacity-0"
            >
              <MenuItems
                static
                className="origin-top-right z-10 absolute top-8 ltr:right-0 rtl:left-0 w-60 border border-Gray-100 bg-white shadow-lg rounded-2xl overflow-hidden p-2"
              >
                {menuItems}
              </MenuItems>
            </Transition>
          </>
        )}
      </Menu>
    </IconWrapper>
  );
};

export default MenuIcon;
