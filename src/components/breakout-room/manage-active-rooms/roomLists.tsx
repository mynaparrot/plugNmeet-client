import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useGetBreakoutRoomsQuery } from '../../../store/services/breakoutRoomApi';
import { LoadingIcon } from '../../../assets/Icons/Loading';
import { BreakoutRoomMessage } from '..';
import RoomItem from './room';
import BreakoutRoomUsers from './room/users';

interface IRoomListsProps {
  setMessage: (message: BreakoutRoomMessage | null) => void;
}

const RoomLists = ({ setMessage }: IRoomListsProps) => {
  const { t } = useTranslation();
  const { data, isLoading } = useGetBreakoutRoomsQuery(undefined, {
    pollingInterval: 10000,
  });

  const sortedRooms = useMemo(() => {
    if (data && data.rooms) {
      const sortedRooms = data.rooms.slice();
      sortedRooms.sort((a, b) => a.title.localeCompare(b.title));
      return sortedRooms;
    }
    return [];
  }, [data]);

  // proto3 JSON (handleProtobufResponse does fromBinary -> toJson) omits empty
  // repeated fields, so `unassignedUsers` is absent until the server returns it.
  // The ?? [] guard is mandatory.
  const unassignedUsers = data?.unassignedUsers ?? [];

  return (
    <div className="breakout-room-list-wrapper min-h-[90px] relative">
      {isLoading && (
        <div className="absolute text-center top-1/2 -translate-y-1/2 z-999 start-0 end-0 m-auto pointer-events-none">
          <LoadingIcon
            className={'inline w-10 h-10 me-3 text-Gray-200 animate-spin'}
            fillColor={'#004D90'}
          />
        </div>
      )}
      {unassignedUsers.length > 0 && (
        <div className="breakout-unassigned-users mb-4 rounded-xl border border-gray-300 dark:border-gray-800 bg-Gray-50 dark:bg-dark-primary p-4">
          <h3 className="text-sm font-semibold text-Gray-950 dark:text-white">
            {t('breakout-room.unassigned-users')}
          </h3>
          <p className="text-xs text-Gray-600 dark:text-Gray-300 mt-1 mb-2">
            {t('breakout-room.unassigned-users-desc')}
          </p>
          <BreakoutRoomUsers
            variant="unassigned"
            users={unassignedUsers}
            setMessage={setMessage}
          />
        </div>
      )}
      {sortedRooms.map((room) => (
        <RoomItem key={room.id} room={room} setMessage={setMessage} />
      ))}
    </div>
  );
};

export default RoomLists;
