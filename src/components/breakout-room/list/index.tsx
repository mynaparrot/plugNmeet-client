import React, { useMemo } from 'react';
import { useGetBreakoutRoomsQuery } from '../../../store/services/breakoutRoomApi';

const BreakoutRoomLists = () => {
  const { data, isLoading } = useGetBreakoutRoomsQuery();

  const sortedRooms = useMemo(() => {
    if (data && data.rooms) {
      const sortedRooms = data.rooms.slice();
      sortedRooms.sort((a, b) => b.title.localeCompare(a.title));
      console.log(sortedRooms);
      return sortedRooms;
    }
  }, [data]);

  return <div>BreakoutRoomLists</div>;
};

export default BreakoutRoomLists;
