import React from 'react';
import { Menu, Transition } from '@headlessui/react';
import { Room } from 'livekit-client';
import WebcamMenuItems from './items';

interface IWebcamMenuProps {
  currentRoom: Room;
}

const WebcamMenu = ({ currentRoom }: IWebcamMenuProps) => {
  const render = () => {
    return (
      <Menu>
        {({ open }) => (
          <>
            <Menu.Button>
              <div className="arrow-down absolute -bottom-1 -right-1 w-[15px] h-[15px] rounded-full bg-white flex items-center justify-center">
                <i className="pnm-arrow-below text-[8px]" />
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
              <WebcamMenuItems currentRoom={currentRoom} />
            </Transition>
          </>
        )}
      </Menu>
    );
  };

  return <React.Fragment>{render()}</React.Fragment>;
};

export default WebcamMenu;
