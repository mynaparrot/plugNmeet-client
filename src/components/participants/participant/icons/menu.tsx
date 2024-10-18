import React from 'react';
import { Menu, MenuButton, MenuItems, Transition } from '@headlessui/react';

import MicMenuItem from './menu-items/mic';
import WebcamMenuItem from './menu-items/webcam';
import SwitchPresenterMenuItem from './menu-items/switchPresenter';
import LowerHandMenuItem from './menu-items/lowerHand';
import LockSettingMenuItem from './menu-items/lock';
import RemoveUserMenuItem from './menu-items/removeUser';
import PrivateChatMenuItem from './menu-items/privateChatMenuItem';
import { store, useAppSelector } from '../../../../store';

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
  const currentUserLockSettings = useAppSelector(
    (state) => state.session.currentUser?.metadata?.lockSettings,
  );
  const currentUser = store.getState().session.currentUser;

  const renderMenuItems = () => {
    if (currentUser?.metadata?.isAdmin) {
      return (
        <>
          <MicMenuItem userId={userId} />
          <WebcamMenuItem userId={userId} />
          <PrivateChatMenuItem userId={userId} name={name} />
          <SwitchPresenterMenuItem userId={userId} />
          <LowerHandMenuItem userId={userId} />
          <LockSettingMenuItem userId={userId} />
          <RemoveUserMenuItem
            onOpenAlert={openRemoveParticipantAlert}
            userId={userId}
          />
        </>
      );
    }

    // if lock then user won't be able to send private messages to each other
    if (
      !currentUser?.metadata?.isAdmin &&
      !currentUserLockSettings?.lockPrivateChat &&
      !defaultLockSettings?.lockChat &&
      !defaultLockSettings?.lockPrivateChat
    ) {
      return <PrivateChatMenuItem userId={userId} name={name} />;
    }

    // user can always send private messages to admin if chat isn't lock
    if (
      !defaultLockSettings?.lockChat &&
      defaultLockSettings?.lockPrivateChat &&
      isAdmin
    ) {
      return <PrivateChatMenuItem userId={userId} name={name} />;
    }

    return null;
  };

  const render = () => {
    return (
      <>
        <Menu>
          {({ open }) => (
            <>
              <MenuButton className="relative flex-shrink-0 mt-2">
                <i className="pnm-menu-small primaryColor dark:text-secondaryColor opacity-50" />
              </MenuButton>

              {/* Use the Transition component. */}
              <Transition
                show={open}
                enter="transition duration-100 ease-out"
                enterFrom="transform scale-95 opacity-0"
                enterTo="transform scale-100 opacity-100 z-10"
                leave="transition duration-75 ease-out"
                leaveFrom="transform scale-100 opacity-100"
                leaveTo="transform scale-95 opacity-0"
              >
                {/* Mark this component as `static` */}
                <MenuItems
                  static
                  className="origin-top-right z-10 absolute top-0 ltr:right-0 rtl:left-0 mt-2 w-44 rounded-md shadow-lg bg-white dark:bg-darkPrimary ring-1 ring-black dark:ring-secondaryColor ring-opacity-5 divide-y divide-gray-100 dark:divide-secondaryColor focus:outline-none"
                >
                  {renderMenuItems()}
                </MenuItems>
              </Transition>
            </>
          )}
        </Menu>
      </>
    );
  };

  return <>{renderMenuItems() !== null ? render() : null}</>;
};

export default MenuIcon;
