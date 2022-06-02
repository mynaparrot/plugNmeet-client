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
  let backgroundColor = '#222';
  if (isActive) {
    backgroundColor = 'darkgreen';
  } else if (canDrop) {
    backgroundColor = 'darkkhaki';
  }

  return (
    <div ref={drop} style={{ backgroundColor }} className="roomBox">
      {name}
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
