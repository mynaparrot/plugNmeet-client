import React, { useMemo } from 'react';
import { Disclosure } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { useGetBreakoutRoomsQuery } from '../../../store/services/breakoutRoomApi';
import EndBtn from './room/endBtn';
import BreakoutRoomUsers from './room/users';
import BreakoutRoomDuration from './room/duration';
import JoinBtn from './room/joinBtn';
import ExtendDuration from './room/extendDuration';
import { BreakoutRoom } from '../../../helpers/proto/plugnmeet_breakout_room_pb';

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
      <Disclosure>
        {({ open }) => (
          <>
            <Disclosure.Button className="flex items-center w-full justify-between rounded-lg transition ease-in bg-secondaryColor px-4 py-2 text-left text-sm font-medium text-white hover:bg-primaryColor outline-none">
              <p>{room.title}</p>
              <div className="flex items-center">
                {room.started ? (
                  <BreakoutRoomDuration
                    duration={room.duration}
                    created={room.created}
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
            <Disclosure.Panel className="sm:px-4 py-6 text-sm text-gray-500 dark:text-darkText">
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
      </Disclosure>
    );
  };

  return (
    <div className="breakout-room-list-wrapper min-h-[90px] relative">
      {isLoading ? (
        <div className="loading absolute text-center top-1/2 -translate-y-1/2 z-[999] left-0 right-0 m-auto">
          <div className="lds-ripple">
            <div className="border-secondaryColor" />
            <div className="border-secondaryColor" />
          </div>
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
