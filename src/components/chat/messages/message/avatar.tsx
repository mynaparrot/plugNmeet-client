import React from 'react';

import { participantsSelector } from '../../../../store/slices/participantSlice';
import { store } from '../../../../store';

interface IAvatarProps {
  userId: string;
  name: string;
}

const Avatar = ({ userId, name }: IAvatarProps) => {
  const participant = participantsSelector.selectById(store.getState(), userId);

  const render = () => {
    if (participant?.metadata?.profilePic) {
      return (
        <img src={participant?.metadata.profilePic} alt={participant.name} />
      );
    } else {
      let n = name;
      if (participant?.name) {
        n = participant?.name;
      }
      return <>{n.slice(0, 2).toUpperCase()}</>;
    }
  };
  return (
    <div className="avatar flex items-center justify-center h-7 3xl:h-9 w-7 3xl:w-9 bg-DarkBlue rounded-lg 3xl:rounded-xl text-white font-medium text-xs 3xl:text-base">
      {render()}
    </div>
  );
};

export default Avatar;
