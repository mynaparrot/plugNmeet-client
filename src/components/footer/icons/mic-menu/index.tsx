import React from 'react';
import { Menu, MenuButton, Transition } from '@headlessui/react';
import { Room } from 'livekit-client';

import MicMenuItems from './items';
import { ArrowUp } from '../../../../assets/Icons/ArrowUp';

interface IMicMenuProps {
  currentRoom: Room;
  isActiveMicrophone: any;
  isMicMuted: any;
}

const MicMenu = ({
  currentRoom,
  isActiveMicrophone,
  isMicMuted,
}: IMicMenuProps) => {
  return (
    <div className="menu relative">
      <Menu>
        {({ open }) => (
          <>
            <MenuButton
              className={`w-[20px] md:w-[25px] 3xl:w-[30px] h-[34px] md:h-9 3xl:h-11 flex items-center justify-center border-r-0 border overflow-hidden cursor-pointer ${isMicMuted && isActiveMicrophone ? 'border-Red-100! 3xl:border-Red-200! bg-Red-100!' : ''} ${isActiveMicrophone ? 'bg-Gray-50 rounded-r-xl 3xl:rounded-r-2xl' : 'border-Gray-300'} ${open ? 'border-Gray-100' : 'border-Gray-300'}`}
            >
              <ArrowUp />
            </MenuButton>

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
              <MicMenuItems currentRoom={currentRoom} />
            </Transition>
          </>
        )}
      </Menu>
    </div>
  );
};

export default MicMenu;
