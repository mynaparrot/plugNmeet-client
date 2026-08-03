import React from 'react';
import { Menu, MenuButton, Transition } from '@headlessui/react';
import { Room } from 'livekit-client';

import WebcamMenuItems from './items';
import { ArrowUp } from '../../../../assets/Icons/ArrowUp';

interface IWebcamMenuProps {
  currentRoom: Room;
  isHybrid: boolean;
  toggleWebcam: () => void;
  isLocked?: boolean;
}

const WebcamMenu = ({
  currentRoom,
  isHybrid,
  toggleWebcam,
  isLocked,
}: IWebcamMenuProps) => {
  return (
    <div className="menu relative">
      <Menu as="div">
        {({ open }) => (
          <>
            <MenuButton
              disabled={isLocked}
              className={`footer-icon-bg w-[20px] md:w-[25px] 3xl:w-[30px] h-[34px] md:h-9 3xl:h-11 flex items-center justify-center border-e-0 border overflow-hidden bg-Gray-50 dark:bg-transparent rounded-e-xl 3xl:rounded-e-2xl disabled:cursor-not-allowed disabled:opacity-50 ${open ? 'border-Gray-100 dark:border-Gray-700 dark:bg-Gray-800!' : 'border-Gray-300 dark:border-Gray-700 dark:border-s-Gray-800'}`}
            >
              <ArrowUp />
            </MenuButton>

            {/* Use the Transition component. */}
            <Transition
              as="div"
              show={open}
              enter="transition ease-out duration-200"
              enterFrom="transform opacity-0 scale-95 translate-y-2"
              enterTo="transform opacity-100 scale-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="transform opacity-100 scale-100 translate-y-0"
              leaveTo="transform opacity-0 scale-95 translate-y-2"
            >
              <WebcamMenuItems
                currentRoom={currentRoom}
                isHybrid={isHybrid}
                toggleWebcam={toggleWebcam}
                isLocked={isLocked}
              />
            </Transition>
          </>
        )}
      </Menu>
    </div>
  );
};

export default WebcamMenu;
