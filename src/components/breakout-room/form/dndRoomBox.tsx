import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import RoomBox from './roomBox';
import type { RoomType, UserType } from './types';

interface IDndRoomBoxProps {
  roomList: Array<RoomType>;
  users: Array<UserType>;
  customTitles?: Record<number, string>;
  setCustomTitles?: React.Dispatch<React.SetStateAction<Record<number, string>>>;
}

const DndRoomBox = ({ roomList, users, customTitles, setCustomTitles }: IDndRoomBoxProps) => (
  <DndProvider backend={HTML5Backend}>
    <div className="draggable-room-area overflow-hidden clear-both flex flex-wrap">
      {roomList.map((room) => (
        <div className="room-box-wrap w-[calc(50%-6px)] m-[3px] sm:m-0 sm:w-auto" key={room.id}>
          <RoomBox
            roomId={room.id}
            name={room.name}
            users={users.filter((user) => user.roomId === room.id)}
            customTitles={customTitles}
            setCustomTitles={setCustomTitles}
          />
        </div>
      ))}
    </div>
  </DndProvider>
);

export default DndRoomBox;
