import React, { useRef } from 'react';
import { useDrag } from 'react-dnd';
import clsx from 'clsx';

import { ItemTypes } from './types';

export interface IUserBoxProps {
  name: string;
  id: string;
}

const UserBox = React.memo(({ name, id }: IUserBoxProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.USER,
    item: { id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
      handlerId: monitor.getHandlerId(),
    }),
  }));
  drag(ref);

  return (
    <div
      ref={ref}
      className={clsx(
        'userBox text-sm sm:text-base text-Gray-950 bg-white border-b border-solid border-Gray-300 w-full px-2 py-1 cursor-move',
        { 'opacity-40': isDragging },
      )}
    >
      {name}
    </div>
  );
});

export default UserBox;
