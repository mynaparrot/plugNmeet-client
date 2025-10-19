import React from 'react';

import { generateAvatarInitial } from '../../../helpers/utils';
import { IParticipantFilteredInfo } from '../../../store/slices/interfaces/participant';

interface IAvatarProps {
  participant: IParticipantFilteredInfo;
}
const Avatar = ({ participant }: IAvatarProps) => {
  const initials = generateAvatarInitial(participant.name);

  return (
    <div className="thumb h-7 3xl:h-9 w-7 3xl:w-9 rounded-lg 3xl:rounded-xl bg-[#069] text-xs 3xl:text-base font-medium text-white flex items-center justify-center overflow-hidden">
      {participant.profilePic ? (
        <img
          src={participant.profilePic}
          alt={participant.name}
          className="w-full h-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  );
};

export default React.memo(Avatar);
