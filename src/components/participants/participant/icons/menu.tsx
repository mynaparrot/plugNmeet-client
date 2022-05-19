import React from 'react';
import { Menu, Transition } from '@headlessui/react';

import MicMenuItem from './menu-items/mic';
import WebcamMenuItem from './menu-items/webcam';
import SwitchPresenterMenuItem from './menu-items/switchPresenter';
import LowerHandMenuItem from './menu-items/lowerHand';
import LockSettingMenuItem from './menu-items/lock';
import RemoveUserMenuItem from './menu-items/removeUser';

interface IMenuIconProps {
  userId: string;
  openRemoveParticipantAlert(userId: string, type: string): void;
}

const MenuIcon = ({ userId, openRemoveParticipantAlert }: IMenuIconProps) => {
  const render = () => {
    return (
      <>
        <Menu>
          {({ open }) => (
            <>
              <Menu.Button className="relative flex-shrink-0 mt-2">
                <i className="pnm-menu-small primaryColor opacity-50" />
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
                {/* Mark this component as `static` */}
                <Menu.Items
                  static
                  className="origin-top-right z-10 absolute right-0 mt-2 w-44 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none"
                >
                  <MicMenuItem userId={userId} />
                  <WebcamMenuItem userId={userId} />
                  <SwitchPresenterMenuItem userId={userId} />
                  <LowerHandMenuItem userId={userId} />
                  <LockSettingMenuItem userId={userId} />
                  <RemoveUserMenuItem
                    onOpenAlert={openRemoveParticipantAlert}
                    userId={userId}
                  />
                </Menu.Items>
              </Transition>
            </>
          )}
        </Menu>
      </>
    );
  };

  return <>{render()}</>;
};

export default MenuIcon;
