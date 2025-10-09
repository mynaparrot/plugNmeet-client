import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { BreakoutRoom } from 'plugnmeet-protocol-js';

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
        <div className="bg-Gray-50 rounded-xl border border-gray-300 overflow-hidden w-full">
          <DisclosureButton
            className={`flex items-center justify-between gap-3 w-full pl-[14px] pr-2 bg-white h-9 rounded-xl  shadow-button-shadow transition-all duration-300 ${
              open ? 'border-b border-gray-300' : ''
            }`}
          >
            <span className="text-sm text-Gray-800">{room.title}</span>
            <div className="right flex items-center gap-2">
              <div className="wrap text-sm font-semibold text-Gray-950">
                {room.started ? (
                  <BreakoutRoomDuration
                    duration={BigInt(room.duration)}
                    created={BigInt(room.created)}
                  />
                ) : (
                  t('breakout-room.not-started')
                )}
              </div>
              <motion.div
                animate={{ rotate: open ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className=""
              >
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
              </motion.div>
            </div>
          </DisclosureButton>

          <AnimatePresence>
            {open && (
              <DisclosurePanel
                static
                as={motion.div}
                initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className=""
              >
                <div className="wrap relative rounded-xl overflow-auto">
                  <div className="inner p-5">
                    <div className="row flex flex-wrap items-center justify-between mb-4">
                      <ExtendDuration
                        breakoutRoomId={room.id}
                        setMessage={setMessage}
                      />
                      <div className="row flex mb-2">
                        <JoinBtn
                          breakoutRoomId={room.id}
                          setMessage={setMessage}
                        />
                        <EndBtn
                          breakoutRoomId={room.id}
                          setMessage={setMessage}
                        />
                      </div>
                    </div>
                    <BreakoutRoomUsers
                      users={room.users}
                      breakoutRoomId={room.id}
                      setMessage={setMessage}
                    />
                  </div>
                </div>
              </DisclosurePanel>
            )}
          </AnimatePresence>
        </div>
      )}
    </Disclosure>
  );
};

export default RoomItem;
