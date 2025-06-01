import React, { useRef } from 'react';
import { useDrop } from 'react-dnd';

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
  const ref = useRef<HTMLDivElement>(null);

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
  drop(ref);

  const isActive = canDrop && isOver;
  let backgroundColor = 'bg-white';
  if (isActive) {
    backgroundColor = 'bg-primary-color';
  } else if (canDrop) {
    backgroundColor = 'bg-secondary-color';
  }

  return (
    <div
      ref={ref}
      // style={{ backgroundColor }}
      className={`roomBox scrollBar scrollBar2 overflow-hidden overflow-y-auto h-60 w-full sm:w-52 lg:w-[13.2rem] xl:w-55 ltr:mr-4 lg:ltr:mr-6 rtl:ml-4 lg:rtl:ml-6 mb-2 sm:mb-6  border border-solid border-Gray-300 ${backgroundColor}`}
    >
      <p
        className={`text-sm sm:text-base  px-2 py-1 border-b-2 border-solid
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
