import React from 'react';
import { useDrag } from 'react-dnd';
import { ItemTypes } from './types';

export interface IUserBoxProps {
  name: string;
  id: string;
}

const UserBox = ({ name, id }: IUserBoxProps) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.USER,
    item: { name, id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
      handlerId: monitor.getHandlerId(),
    }),
  }));

  const opacity = isDragging ? 0.4 : 1;
  return (
    <div
      ref={drag}
      style={{ opacity }}
      className="userBox text-sm sm:text-base text-Gray-950  bg-white  border-b border-solid border-Gray-300 w-full px-2 py-1 cursor-move"
    >
      {name}
    </div>
  );
};

export default UserBox;
