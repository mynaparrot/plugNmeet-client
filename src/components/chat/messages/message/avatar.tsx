import React from 'react';

import { participantsSelector } from '../../../../store/slices/participantSlice';
import { useAppSelector } from '../../../../store';

interface IAvatarProps {
  userId: string;
  name: string;
}

const Avatar = ({ userId, name }: IAvatarProps) => {
  const participant = useAppSelector((state) =>
    participantsSelector.selectById(state, userId),
  );

  const nameParts = name.trim().split(/\s+/);
  const firstNameInitial = nameParts[0]?.[0] || '';
  let lastNameInitial = '';

  if (nameParts.length > 1) {
    lastNameInitial = nameParts[nameParts.length - 1]?.[0] || '';
  } else if (nameParts[0]?.length > 1) {
    lastNameInitial = nameParts[0].slice(-1);
  }
  const initials = `${firstNameInitial}${lastNameInitial}`.toLocaleUpperCase();

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
