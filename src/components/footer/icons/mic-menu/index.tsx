import React from 'react';
import { Menu, MenuButton, Transition } from '@headlessui/react';
import { Room } from 'livekit-client';

import MicMenuItems from './items';
import { ArrowUp } from '../../../../assets/Icons/ArrowUp';

interface IMicMenuProps {
  currentRoom: Room;
  isActiveMicrophone: any;
}

const MicMenu = ({ currentRoom, isActiveMicrophone }: IMicMenuProps) => {
  const render = () => {
    return (
      <div className="menu relative">
        <Menu>
          {({ open }) => (
            <>
              <MenuButton
                className={`w-[30px] h-11 flex items-center justify-center border-r-0 border overflow-hidden ${isActiveMicrophone ? 'bg-Gray-50 rounded-r-2xl' : 'border-Gray-300'} ${open ? 'border-Gray-100' : 'border-Gray-300'}`}
              >
                <ArrowUp />
              </MenuButton>

              <Transition
                as={'div'}
                show={open}
                enter="transition duration-100 ease-out"
                enterFrom="transform scale-95 opacity-0"
                enterTo="transform scale-100 opacity-100"
                leave="transition duration-75 ease-out"
                leaveFrom="transform scale-100 opacity-100"
                leaveTo="transform scale-95 opacity-0"
              >
                <MicMenuItems currentRoom={currentRoom} />
              </Transition>
            </>
          )}
        </Menu>
      </div>
    );
  };

  return <>{render()}</>;
};

export default MicMenu;
