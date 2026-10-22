import React from 'react';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { BreakoutRoom } from 'plugnmeet-protocol-js';
import clsx from 'clsx';

import EndBtn from './endBtn';
import BreakoutRoomUsers from './users';
import BreakoutRoomDuration from './duration';
import JoinBtn from './joinBtn';
import ExtendDuration from './extendDuration';
import { BreakoutRoomMessage } from '../..';

interface RoomItemProps {
  room: BreakoutRoom;
  setMessage: (message: BreakoutRoomMessage | null) => void;
}

const RoomItem = ({ room, setMessage }: RoomItemProps) => {
  const { t } = useTranslation();

  return (
    <Disclosure as="div">
      {({ open }) => (
        <div className="bg-Gray-50 dark:bg-dark-primary rounded-xl border border-gray-300 dark:border-gray-800 overflow-hidden w-full">
          <DisclosureButton
            className={`flex items-center justify-between gap-3 w-full ps-[14px] pe-2 bg-white dark:bg-dark-secondary3 h-9 rounded-xl shadow-button-shadow dark:shadow-none transition-all duration-300 cursor-pointer ${
              open ? 'border-b border-gray-300 dark:border-gray-800' : ''
            }`}
          >
            <span className="text-sm text-Gray-800 dark:text-white">{room.title}</span>
            <div className="right flex items-center gap-2">
              <div className="wrap text-sm font-semibold text-Gray-950 dark:text-white">
                {room.started ? (
                  <BreakoutRoomDuration
                    duration={BigInt(room.duration)}
                    created={BigInt(room.created)}
                  />
                ) : (
                  t('breakout-room.not-started')
                )}
              </div>
              <div className={clsx('transition-transform duration-200', open && 'rotate-180')}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="17"
                  viewBox="0 0 16 17"
                  fill="none"
                >
                  <path d="M12 6.5L8 10.5L4 6.5" fill="#7493B3" />
                  <path
                    d="M12 6.5L8 10.5L4 6.5H12Z"
                    stroke="#7493B3"
                    strokeWidth="1.67"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </DisclosureButton>

          {/* `transition` keeps the panel mounted until the collapse finishes;
              the grid rows trick animates height without knowing the content size. */}
          <DisclosurePanel
            transition
            className="grid grid-rows-[1fr] opacity-100 transition-[grid-template-rows,opacity] duration-200 ease-out data-closed:grid-rows-[0fr] data-closed:opacity-0"
          >
            <div className="overflow-hidden">
              <div className="wrap relative rounded-xl overflow-auto">
                <div className="inner p-5">
                  <div className="row flex flex-wrap items-center justify-between mb-4">
                    <ExtendDuration breakoutRoomId={room.id} setMessage={setMessage} />
                    <div className="row flex mb-2">
                      <JoinBtn breakoutRoomId={room.id} setMessage={setMessage} />
                      <EndBtn breakoutRoomId={room.id} setMessage={setMessage} />
                    </div>
                  </div>
                  <BreakoutRoomUsers
                    users={room.users}
                    breakoutRoomId={room.id}
                    setMessage={setMessage}
                  />
                </div>
              </div>
            </div>
          </DisclosurePanel>
        </div>
      )}
    </Disclosure>
  );
};

export default RoomItem;
