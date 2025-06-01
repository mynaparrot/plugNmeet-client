import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { BreakoutRoom } from 'plugnmeet-protocol-js';

import { useGetBreakoutRoomsQuery } from '../../../store/services/breakoutRoomApi';
import EndBtn from './room/endBtn';
import BreakoutRoomUsers from './room/users';
import BreakoutRoomDuration from './room/duration';
import JoinBtn from './room/joinBtn';
import ExtendDuration from './room/extendDuration';
import { LoadingIcon } from '../../../assets/Icons/Loading';

const RoomLists = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useGetBreakoutRoomsQuery(undefined, {
    pollingInterval: 10000,
  });

  const sortedRooms = useMemo(() => {
    if (data && data.rooms) {
      const sortedRooms = data.rooms.slice();
      sortedRooms.sort((a, b) => b.title.localeCompare(a.title));
      return sortedRooms;
    }
  }, [data]);

  const renderDisclosure = (room: BreakoutRoom) => {
    return (
      <>
        {/* <Disclosure>
          {({ open }) => (
            <>
              <Disclosure.Button className="flex items-center w-full justify-between rounded-lg transition ease-in bg-secondary-color px-4 py-2 text-left text-sm font-medium text-white hover:bg-primary-color outline-hidden">
                <p>{room.title}</p>
                <div className="flex items-center">
                  {room.started ? (
                    <BreakoutRoomDuration
                      duration={BigInt(room.duration)}
                      created={BigInt(room.created)}
                    />
                  ) : (
                    t('breakout-room.not-started')
                  )}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`${
                      open ? 'rotate-180 transform' : ''
                    } h-5 w-5 ml-6 text-white`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </Disclosure.Button>
              <Disclosure.Panel className="sm:px-4 py-6 text-sm text-gray-500 dark:text-dark-text">
                <div className="row flex flex-wrap items-center justify-between mb-4">
                  <ExtendDuration breakoutRoomId={room.id} />
                  <div className="row flex mb-2">
                    <JoinBtn breakoutRoomId={room.id} />
                    <EndBtn breakoutRoomId={room.id} />
                  </div>
                </div>
                <BreakoutRoomUsers users={room.users} />
              </Disclosure.Panel>
            </>
          )}
        </Disclosure> */}
        <Disclosure as="div">
          {({ open }) => (
            <div className="bg-Gray-50 rounded-xl border border-gray-300 overflow-hidden w-full">
              <DisclosureButton
                className={`flex items-center justify-between gap-3 w-full pl-[14px] pr-2 bg-white h-9 rounded-xl  shadow-button-shadow transition-all duration-300 ${open ? 'border-b border-gray-300' : ''}`}
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
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    // transition={{ duration: 0.2 }}
                    className=""
                  >
                    <div className="wrap relative rounded-xl overflow-auto">
                      <div className="inner p-5">
                        <div className="row flex flex-wrap items-center justify-between mb-4">
                          <ExtendDuration breakoutRoomId={room.id} />
                          <div className="row flex mb-2">
                            <JoinBtn breakoutRoomId={room.id} />
                            <EndBtn breakoutRoomId={room.id} />
                          </div>
                        </div>
                        <BreakoutRoomUsers users={room.users} />
                      </div>
                    </div>
                  </DisclosurePanel>
                )}
              </AnimatePresence>
            </div>
          )}
        </Disclosure>
      </>
    );
  };

  return (
    <div className="breakout-room-list-wrapper min-h-[90px] relative">
      {isLoading ? (
        <div className="absolute text-center top-1/2 -translate-y-1/2 z-999 left-0 right-0 m-auto pointer-events-none">
          <LoadingIcon
            className={'inline w-10 h-10 me-3 text-Gray-200 animate-spin'}
            fillColor={'#004D90'}
          />
        </div>
      ) : null}
      {sortedRooms?.map((room) => {
        return (
          <div className="breakout-room-list-item my-1" key={room.id}>
            {renderDisclosure(room)}
          </div>
        );
      })}
    </div>
  );
};

export default RoomLists;
