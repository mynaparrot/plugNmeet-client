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
      className="userBox text-sm sm:text-base text-black dark:text-darkText bg-white dark:bg-darkSecondary2 border-b border-solid border-black/80 dark:border-darkText/90 w-full px-2 py-1 cursor-move"
    >
      {name}
    </div>
  );
};

export default UserBox;
