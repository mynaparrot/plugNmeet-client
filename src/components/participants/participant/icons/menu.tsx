import React from 'react';
import { Menu, Transition } from '@headlessui/react';

import MicMenuItem from './menu-items/mic';
import WebcamMenuItem from './menu-items/webcam';
import SwitchPresenterMenuItem from './menu-items/switchPresenter';
import LowerHandMenuItem from './menu-items/lowerHand';
import LockSettingMenuItem from './menu-items/lock';
import RemoveUserMenuItem from './menu-items/removeUser';
import PrivateChatMenuItem from './menu-items/privateChatMenuItem';
import { createSelector } from '@reduxjs/toolkit';
import { RootState, store, useAppSelector } from '../../../../store';

interface IMenuIconProps {
  userId: string;
  name: string;
  isAdmin: boolean;
  openRemoveParticipantAlert(userId: string, type: string): void;
}

const defaultLockSettingsSelector = createSelector(
  (state: RootState) => state.session.currentRoom.metadata,
  (metadata) => metadata?.default_lock_settings,
);

const currentUserLockSettingsSelector = createSelector(
  (state: RootState) => state.session.currentUser?.metadata,
  (metadata) => metadata?.lock_settings,
);

const MenuIcon = ({
  userId,
  name,
  isAdmin,
  openRemoveParticipantAlert,
}: IMenuIconProps) => {
  const defaultLockSettings = useAppSelector(defaultLockSettingsSelector);
  const currentUserLockSettings = useAppSelector(
    currentUserLockSettingsSelector,
  );
  const currentUser = store.getState().session.currentUser;

  const renderMenuItems = () => {
    if (currentUser?.metadata?.is_admin) {
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
      !currentUser?.metadata?.is_admin &&
      !currentUserLockSettings?.lock_private_chat &&
      !defaultLockSettings?.lock_chat &&
      !defaultLockSettings?.lock_private_chat
    ) {
      return <PrivateChatMenuItem userId={userId} name={name} />;
    }

    // user can always send private messages to admin if chat isn't lock
    if (
      !defaultLockSettings?.lock_chat &&
      defaultLockSettings?.lock_private_chat &&
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
              <Menu.Button className="relative flex-shrink-0 mt-2">
                <i className="pnm-menu-small primaryColor dark:text-secondaryColor opacity-50" />
              </Menu.Button>

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
                <Menu.Items
                  static
                  className="origin-top-right z-10 absolute ltr:right-0 rtl:left-0 mt-2 w-44 rounded-md shadow-lg bg-white dark:bg-darkPrimary ring-1 ring-black dark:ring-secondaryColor ring-opacity-5 divide-y divide-gray-100 dark:divide-secondaryColor focus:outline-none"
                >
                  {renderMenuItems()}
                </Menu.Items>
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
