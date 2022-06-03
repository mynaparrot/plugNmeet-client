import React from 'react';
import { useDrop } from 'react-dnd';

import '../style.scss';
import UserBox from './userBox';
import { UserType, ItemTypes } from './types';
import { useAppDispatch } from '../../../store';
import { updateBreakoutRoomDroppedUser } from '../../../store/slices/breakoutRoomSlice';

interface IRoomBoxProps {
  roomId: number;
  name: string;
  users: Array<UserType>;
}

export const RoomBox = ({ roomId, name, users }: IRoomBoxProps) => {
  const dispatch = useAppDispatch();

  const [{ canDrop, isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.USER,
    drop: (item: any) => {
      dispatch(
        updateBreakoutRoomDroppedUser({
          id: item.id,
          roomId: roomId,
        }),
      );
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  const isActive = canDrop && isOver;
  let backgroundColor = '#fff';
  if (isActive) {
    backgroundColor = '#004D90';
  } else if (canDrop) {
    backgroundColor = '#24AEF7';
  }

  return (
    <div
      ref={drop}
      style={{ backgroundColor }}
      className="roomBox scrollBar scrollBar2 overflow-hidden overflow-y-auto h-60 w-[13.75rem] mr-6 mb-6  border border-solid border-black"
    >
      <p
        className={`text-base  px-2 py-1 border-b-2 border-solid
        ${
          isActive || canDrop
            ? 'text-white border-white'
            : 'text-black border-black'
        }`}
      >
        {name}
      </p>
      {users.map((user) => {
        return (
          <div key={user.id}>
            <UserBox name={user.name} id={user.id} />
          </div>
        );
      })}
    </div>
  );
};
