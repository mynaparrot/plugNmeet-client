import React from 'react';
import { Menu, Transition } from '@headlessui/react';
import { Room } from 'livekit-client';

import MicMenuItems from './items';

interface IMicMenuProps {
  currentRoom: Room;
}

const MicMenu = ({ currentRoom }: IMicMenuProps) => {
  const render = () => {
    return (
      <div>
        <Menu>
          {({ open }) => (
            <>
              <Menu.Button>
                <div className="arrow-down absolute -bottom-1 -right-1 w-[15px] h-[15px] rounded-full bg-white flex items-center justify-center">
                  <i className="pnm-arrow-below text-[8px]" />
                </div>
              </Menu.Button>

              <Transition
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

  return <React.Fragment>{render()}</React.Fragment>;
};

export default MicMenu;
