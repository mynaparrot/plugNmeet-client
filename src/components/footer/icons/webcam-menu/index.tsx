import React from 'react';
import { Menu, MenuButton } from '@headlessui/react';
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
              aria-label="Webcam options"
              disabled={isLocked}
              className={`footer-icon-bg w-[20px] md:w-[25px] 3xl:w-[30px] h-[34px] md:h-9 3xl:h-11 flex items-center justify-center border-e-0 border overflow-hidden bg-Gray-50 dark:bg-transparent rounded-e-xl 3xl:rounded-e-2xl disabled:cursor-not-allowed disabled:opacity-50 ${open ? 'border-Gray-100 dark:border-Gray-700 dark:bg-Gray-800!' : 'border-Gray-300 dark:border-Gray-700 dark:border-s-Gray-800'}`}
            >
              <ArrowUp />
            </MenuButton>

            <WebcamMenuItems
              currentRoom={currentRoom}
              isHybrid={isHybrid}
              toggleWebcam={toggleWebcam}
              isLocked={isLocked}
            />
          </>
        )}
      </Menu>
    </div>
  );
};

export default WebcamMenu;
