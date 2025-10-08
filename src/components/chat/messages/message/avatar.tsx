import React from 'react';

import { participantsSelector } from '../../../../store/slices/participantSlice';
import { generateAvatarInitial } from '../../../../helpers/utils';
import { store } from '../../../../store';

interface IAvatarProps {
  userId: string;
  name: string;
}

const Avatar = ({ userId, name }: IAvatarProps) => {
  const participant = participantsSelector.selectById(store.getState(), userId);
  const initials = generateAvatarInitial(name);

  return (
    <div className="thumb h-7 3xl:h-9 w-7 3xl:w-9 rounded-lg 3xl:rounded-xl bg-[#069] text-xs 3xl:text-base font-medium text-white flex items-center justify-center overflow-hidden">
      {participant && participant.metadata.profilePic ? (
        <img
          src={participant.metadata.profilePic}
          alt={name}
          className="w-full h-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  );
};

export default Avatar;
